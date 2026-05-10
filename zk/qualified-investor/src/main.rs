use anyhow::{anyhow, bail, Context, Result};
use ark_bn254::{Bn254, Fr, Fq, G1Affine, G2Affine};
use ark_ec::AffineRepr;
use ark_ff::{BigInteger, Field, PrimeField, UniformRand, Zero};
use ark_groth16::{prepare_verifying_key, Groth16, Proof, ProvingKey, VerifyingKey};
use ark_r1cs_std::{alloc::AllocVar, eq::EqGadget, fields::{fp::FpVar, FieldVar}, uint64::UInt64};
use ark_relations::r1cs::{ConstraintSynthesizer, ConstraintSystemRef, SynthesisError};
use ark_serialize::{CanonicalDeserialize, CanonicalSerialize};
use ark_snark::SNARK;
use clap::{Parser, Subcommand};
use num_bigint::BigUint;
use rand::SeedableRng;
use rand_chacha::ChaCha20Rng;
use serde::{Deserialize, Serialize};
use std::{fs, path::{Path, PathBuf}};

const DEFAULT_THRESHOLD: u64 = 1_000_000_000_000;
const MIMC_ROUNDS: u64 = 91;
const SETUP_SEED: u64 = 7_984;

#[derive(Parser)]
#[command(author, version, about)]
struct Cli {
    #[command(subcommand)]
    command: Command,
}

#[derive(Subcommand)]
enum Command {
    Setup {
        #[arg(long, default_value = "zk/qualified-investor/out")]
        out: PathBuf,
    },
    Prove {
        #[arg(long, default_value = "zk/qualified-investor/out")]
        keys: PathBuf,
        #[arg(long)]
        user: String,
        #[arg(long)]
        balance: u64,
        #[arg(long, default_value_t = DEFAULT_THRESHOLD)]
        threshold: u64,
        #[arg(long)]
        salt: Option<String>,
        #[arg(long, default_value = "zk/qualified-investor/out/proof.json")]
        out: PathBuf,
    },
    Verify {
        #[arg(long, default_value = "zk/qualified-investor/out")]
        keys: PathBuf,
        #[arg(long, default_value = "zk/qualified-investor/out/proof.json")]
        proof: PathBuf,
    },
    Commitment {
        #[arg(long)]
        user: String,
        #[arg(long)]
        balance: u64,
        #[arg(long)]
        salt: String,
    },
    ExportVerifier {
        #[arg(long, default_value = "zk/qualified-investor/out")]
        keys: PathBuf,
        #[arg(long, default_value = "zk/qualified-investor/out/QualifiedInvestorGroth16Verifier.sol")]
        out: PathBuf,
    },
}

#[derive(Clone)]
struct QualifiedInvestorCircuit {
    balance: Option<u64>,
    diff: Option<u64>,
    salt: Option<Fr>,
    commitment: Option<Fr>,
    threshold: Option<Fr>,
    user: Option<Fr>,
    nullifier_hash: Option<Fr>,
}

impl ConstraintSynthesizer<Fr> for QualifiedInvestorCircuit {
    fn generate_constraints(self, cs: ConstraintSystemRef<Fr>) -> Result<(), SynthesisError> {
        let commitment = FpVar::<Fr>::new_input(cs.clone(), || {
            self.commitment.ok_or(SynthesisError::AssignmentMissing)
        })?;
        let threshold = FpVar::<Fr>::new_input(cs.clone(), || {
            self.threshold.ok_or(SynthesisError::AssignmentMissing)
        })?;
        let user = FpVar::<Fr>::new_input(cs.clone(), || {
            self.user.ok_or(SynthesisError::AssignmentMissing)
        })?;
        let nullifier_hash = FpVar::<Fr>::new_input(cs.clone(), || {
            self.nullifier_hash.ok_or(SynthesisError::AssignmentMissing)
        })?;

        let balance_u64 = UInt64::<Fr>::new_witness(cs.clone(), || {
            self.balance.ok_or(SynthesisError::AssignmentMissing)
        })?;
        let diff_u64 = UInt64::<Fr>::new_witness(cs.clone(), || {
            self.diff.ok_or(SynthesisError::AssignmentMissing)
        })?;
        let salt = FpVar::<Fr>::new_witness(cs, || {
            self.salt.ok_or(SynthesisError::AssignmentMissing)
        })?;

        let balance = balance_u64_to_fp(&balance_u64);
        let diff = balance_u64_to_fp(&diff_u64);
        balance.enforce_equal(&(threshold.clone() + diff))?;

        let computed_commitment = mimc_hash_var(&[balance, salt.clone(), user.clone()])?;
        computed_commitment.enforce_equal(&commitment)?;

        let computed_nullifier = mimc_hash_var(&[salt, user])?;
        computed_nullifier.enforce_equal(&nullifier_hash)?;

        Ok(())
    }
}

#[derive(Serialize, Deserialize)]
struct SolidityProofJson {
    a: [String; 2],
    b: [[String; 2]; 2],
    c: [String; 2],
}

#[derive(Serialize, Deserialize)]
struct ProofJson {
    proof: SolidityProofJson,
    public_inputs: [String; 4],
    proof_compressed_hex: String,
    commitment: String,
    threshold: String,
    user: String,
    nullifier_hash: String,
    salt: String,
}

fn main() -> Result<()> {
    let cli = Cli::parse();

    match cli.command {
        Command::Setup { out } => setup(&out),
        Command::Prove {
            keys,
            user,
            balance,
            threshold,
            salt,
            out,
        } => prove(&keys, &user, balance, threshold, salt, &out),
        Command::Verify { keys, proof } => verify(&keys, &proof),
        Command::Commitment { user, balance, salt } => {
            let user = parse_address_field(&user)?;
            let salt = parse_fr(&salt)?;
            let commitment = mimc_hash(&[Fr::from(balance), salt, user]);
            let nullifier_hash = mimc_hash(&[salt, user]);
            println!("commitment={}", fr_to_dec(&commitment));
            println!("nullifier_hash={}", fr_to_dec(&nullifier_hash));
            Ok(())
        }
        Command::ExportVerifier { keys, out } => {
            let vk = read_vk(&keys)?;
            write_text(&out, &solidity_verifier(&vk)?)?;
            println!("wrote {}", out.display());
            Ok(())
        }
    }
}

fn setup(out: &Path) -> Result<()> {
    fs::create_dir_all(out)?;
    let threshold = Fr::from(DEFAULT_THRESHOLD);
    let user = Fr::from(1u64);
    let salt = Fr::from(2u64);
    let balance = DEFAULT_THRESHOLD + 1;
    let diff = balance - DEFAULT_THRESHOLD;
    let commitment = mimc_hash(&[Fr::from(balance), salt, user]);
    let nullifier_hash = mimc_hash(&[salt, user]);

    let circuit = QualifiedInvestorCircuit {
        balance: Some(balance),
        diff: Some(diff),
        salt: Some(salt),
        commitment: Some(commitment),
        threshold: Some(threshold),
        user: Some(user),
        nullifier_hash: Some(nullifier_hash),
    };

    let mut rng = ChaCha20Rng::seed_from_u64(SETUP_SEED);
    let (pk, vk) = Groth16::<Bn254>::circuit_specific_setup(circuit, &mut rng)?;

    write_bin(&out.join("proving_key.bin"), &pk)?;
    write_bin(&out.join("verifying_key.bin"), &vk)?;
    write_text(
        &out.join("QualifiedInvestorGroth16Verifier.sol"),
        &solidity_verifier(&vk)?,
    )?;

    println!("wrote {}", out.join("proving_key.bin").display());
    println!("wrote {}", out.join("verifying_key.bin").display());
    println!(
        "wrote {}",
        out.join("QualifiedInvestorGroth16Verifier.sol").display()
    );
    Ok(())
}

fn prove(
    keys: &Path,
    user: &str,
    balance: u64,
    threshold: u64,
    salt: Option<String>,
    out: &Path,
) -> Result<()> {
    if balance < threshold {
        bail!("balance is below threshold");
    }

    let pk = read_pk(keys)?;
    let user = parse_address_field(user)?;
    let salt = match salt {
        Some(value) => parse_fr(&value)?,
        None => {
            let mut rng = ChaCha20Rng::from_entropy();
            Fr::rand(&mut rng)
        }
    };
    let diff = balance - threshold;
    let commitment = mimc_hash(&[Fr::from(balance), salt, user]);
    let nullifier_hash = mimc_hash(&[salt, user]);

    let circuit = QualifiedInvestorCircuit {
        balance: Some(balance),
        diff: Some(diff),
        salt: Some(salt),
        commitment: Some(commitment),
        threshold: Some(Fr::from(threshold)),
        user: Some(user),
        nullifier_hash: Some(nullifier_hash),
    };

    let mut rng = ChaCha20Rng::from_entropy();
    let proof = Groth16::<Bn254>::prove(&pk, circuit, &mut rng)?;
    let public_inputs = [commitment, Fr::from(threshold), user, nullifier_hash];
    let mut proof_bytes = Vec::new();
    proof.serialize_compressed(&mut proof_bytes)?;

    let json = ProofJson {
        proof: proof_to_json(&proof),
        public_inputs: public_inputs.map(|input| fr_to_dec(&input)),
        proof_compressed_hex: hex::encode(proof_bytes),
        commitment: fr_to_dec(&commitment),
        threshold: threshold.to_string(),
        user: fr_to_dec(&user),
        nullifier_hash: fr_to_dec(&nullifier_hash),
        salt: fr_to_dec(&salt),
    };

    if let Some(parent) = out.parent() {
        fs::create_dir_all(parent)?;
    }
    fs::write(out, serde_json::to_string_pretty(&json)?)?;
    println!("wrote {}", out.display());
    println!("commitment={}", json.commitment);
    println!("nullifier_hash={}", json.nullifier_hash);
    Ok(())
}

fn verify(keys: &Path, proof_path: &Path) -> Result<()> {
    let vk = read_vk(keys)?;
    let json: ProofJson = serde_json::from_slice(&fs::read(proof_path)?)?;
    let proof_bytes = hex::decode(json.proof_compressed_hex.trim_start_matches("0x"))?;
    let proof = Proof::<Bn254>::deserialize_compressed(&*proof_bytes)?;
    let mut public_inputs = Vec::with_capacity(json.public_inputs.len());
    for input in json.public_inputs {
        public_inputs.push(parse_fr(&input)?);
    }

    let pvk = prepare_verifying_key(&vk);
    let verified = Groth16::<Bn254>::verify_with_processed_vk(&pvk, &public_inputs, &proof)?;
    println!("verified={verified}");
    if !verified {
        bail!("proof did not verify");
    }
    Ok(())
}

fn balance_u64_to_fp(value: &UInt64<Fr>) -> FpVar<Fr> {
    let mut acc = FpVar::zero();
    let mut coeff = Fr::from(1u64);
    for bit in value.to_bits_le() {
        let bit_fp = FpVar::<Fr>::from(bit);
        acc += bit_fp * FpVar::constant(coeff);
        coeff.double_in_place();
    }
    acc
}

fn mimc_constants() -> Vec<Fr> {
    (0..MIMC_ROUNDS)
        .map(|i| {
            let value = (i + 1) * (i + 1) * (i + 17);
            Fr::from(value)
        })
        .collect()
}

fn mimc_hash(inputs: &[Fr]) -> Fr {
    let constants = mimc_constants();
    let mut state = Fr::zero();

    for input in inputs {
        let mut x = state + input;
        for constant in &constants {
            x += constant;
            x = x.pow([7u64]);
        }
        state = x;
    }

    state
}

fn mimc_hash_var(inputs: &[FpVar<Fr>]) -> Result<FpVar<Fr>, SynthesisError> {
    let constants = mimc_constants();
    let mut state = FpVar::<Fr>::zero();

    for input in inputs {
        let mut x = state + input;
        for constant in &constants {
            x += FpVar::constant(*constant);
            let x2 = &x * &x;
            let x4 = &x2 * &x2;
            let x6 = &x4 * &x2;
            x = x6 * &x;
        }
        state = x;
    }

    Ok(state)
}

fn read_pk(keys: &Path) -> Result<ProvingKey<Bn254>> {
    let bytes = fs::read(keys.join("proving_key.bin"))?;
    Ok(ProvingKey::<Bn254>::deserialize_compressed(&*bytes)?)
}

fn read_vk(keys: &Path) -> Result<VerifyingKey<Bn254>> {
    let bytes = fs::read(keys.join("verifying_key.bin"))?;
    Ok(VerifyingKey::<Bn254>::deserialize_compressed(&*bytes)?)
}

fn write_bin<T: CanonicalSerialize>(path: &Path, value: &T) -> Result<()> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    let mut bytes = Vec::new();
    value.serialize_compressed(&mut bytes)?;
    fs::write(path, bytes)?;
    Ok(())
}

fn write_text(path: &Path, value: &str) -> Result<()> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    fs::write(path, value)?;
    Ok(())
}

fn parse_address_field(address: &str) -> Result<Fr> {
    let value = address.trim_start_matches("0x");
    if value.len() != 40 {
        bail!("expected 20-byte Ethereum address");
    }
    let bytes = hex::decode(value).context("invalid address hex")?;
    Ok(Fr::from_be_bytes_mod_order(&bytes))
}

fn parse_fr(value: &str) -> Result<Fr> {
    let value = value.trim();
    if let Some(hex_value) = value.strip_prefix("0x") {
        let bytes = hex::decode(hex_value).context("invalid hex field")?;
        Ok(Fr::from_be_bytes_mod_order(&bytes))
    } else {
        let parsed = BigUint::parse_bytes(value.as_bytes(), 10).ok_or_else(|| anyhow!("invalid decimal field"))?;
        Ok(Fr::from_be_bytes_mod_order(&parsed.to_bytes_be()))
    }
}

fn fr_to_dec(value: &Fr) -> String {
    bigint_to_dec(&value.into_bigint())
}

fn fq_to_dec(value: &Fq) -> String {
    bigint_to_dec(&value.into_bigint())
}

fn bigint_to_dec(value: &impl BigInteger) -> String {
    BigUint::from_bytes_be(&value.to_bytes_be()).to_string()
}

fn g1_to_json(point: &G1Affine) -> [String; 2] {
    assert!(!point.is_zero(), "point at infinity is not supported");
    [fq_to_dec(&point.x), fq_to_dec(&point.y)]
}

fn g2_to_json(point: &G2Affine) -> [[String; 2]; 2] {
    assert!(!point.is_zero(), "point at infinity is not supported");
    [
        [fq_to_dec(&point.x.c1), fq_to_dec(&point.x.c0)],
        [fq_to_dec(&point.y.c1), fq_to_dec(&point.y.c0)],
    ]
}

fn proof_to_json(proof: &Proof<Bn254>) -> SolidityProofJson {
    SolidityProofJson {
        a: g1_to_json(&proof.a),
        b: g2_to_json(&proof.b),
        c: g1_to_json(&proof.c),
    }
}

fn g1_sol(point: &G1Affine) -> String {
    let [x, y] = g1_to_json(point);
    format!("Pairing.G1Point({x}, {y})")
}

fn g2_sol(point: &G2Affine) -> String {
    let [[x1, x0], [y1, y0]] = g2_to_json(point);
    format!("Pairing.G2Point([{x1}, {x0}], [{y1}, {y0}])")
}

fn solidity_verifier(vk: &VerifyingKey<Bn254>) -> Result<String> {
    let mut ic = String::new();
    for (i, point) in vk.gamma_abc_g1.iter().enumerate() {
        ic.push_str(&format!("        vk.IC[{i}] = {};\n", g1_sol(point)));
    }

    Ok(format!(
        r#"// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

library Pairing {{
    uint256 internal constant PRIME_Q = 21888242871839275222246405745257275088696311157297823662689037894645226208583;

    struct G1Point {{ uint256 X; uint256 Y; }}
    struct G2Point {{ uint256[2] X; uint256[2] Y; }}

    function negate(G1Point memory p) internal pure returns (G1Point memory) {{
        if (p.X == 0 && p.Y == 0) return G1Point(0, 0);
        return G1Point(p.X, PRIME_Q - (p.Y % PRIME_Q));
    }}

    function addition(G1Point memory p1, G1Point memory p2) internal view returns (G1Point memory r) {{
        uint256[4] memory input = [p1.X, p1.Y, p2.X, p2.Y];
        bool success;
        assembly {{
            success := staticcall(sub(gas(), 2000), 6, input, 0x80, r, 0x40)
        }}
        require(success, "pairing-add-failed");
    }}

    function scalar_mul(G1Point memory p, uint256 s) internal view returns (G1Point memory r) {{
        uint256[3] memory input = [p.X, p.Y, s];
        bool success;
        assembly {{
            success := staticcall(sub(gas(), 2000), 7, input, 0x60, r, 0x40)
        }}
        require(success, "pairing-mul-failed");
    }}

    function pairing(G1Point[] memory p1, G2Point[] memory p2) internal view returns (bool) {{
        require(p1.length == p2.length, "pairing-length-mismatch");
        uint256 elements = p1.length;
        uint256 inputSize = elements * 6;
        uint256[] memory input = new uint256[](inputSize);
        for (uint256 i = 0; i < elements; i++) {{
            input[i * 6 + 0] = p1[i].X;
            input[i * 6 + 1] = p1[i].Y;
            input[i * 6 + 2] = p2[i].X[0];
            input[i * 6 + 3] = p2[i].X[1];
            input[i * 6 + 4] = p2[i].Y[0];
            input[i * 6 + 5] = p2[i].Y[1];
        }}
        uint256[1] memory out;
        bool success;
        assembly {{
            success := staticcall(sub(gas(), 2000), 8, add(input, 0x20), mul(inputSize, 0x20), out, 0x20)
        }}
        require(success, "pairing-opcode-failed");
        return out[0] != 0;
    }}

    function pairingProd4(
        G1Point memory a1,
        G2Point memory a2,
        G1Point memory b1,
        G2Point memory b2,
        G1Point memory c1,
        G2Point memory c2,
        G1Point memory d1,
        G2Point memory d2
    ) internal view returns (bool) {{
        G1Point[] memory p1 = new G1Point[](4);
        G2Point[] memory p2 = new G2Point[](4);
        p1[0] = a1; p1[1] = b1; p1[2] = c1; p1[3] = d1;
        p2[0] = a2; p2[1] = b2; p2[2] = c2; p2[3] = d2;
        return pairing(p1, p2);
    }}
}}

contract QualifiedInvestorGroth16Verifier {{
    using Pairing for *;

    uint256 internal constant SNARK_SCALAR_FIELD =
        21888242871839275222246405745257275088548364400416034343698204186575808495617;

    struct VerifyingKey {{
        Pairing.G1Point alfa1;
        Pairing.G2Point beta2;
        Pairing.G2Point gamma2;
        Pairing.G2Point delta2;
        Pairing.G1Point[] IC;
    }}

    struct Proof {{
        Pairing.G1Point A;
        Pairing.G2Point B;
        Pairing.G1Point C;
    }}

    function verifyingKey() internal pure returns (VerifyingKey memory vk) {{
        vk.alfa1 = {alpha};
        vk.beta2 = {beta};
        vk.gamma2 = {gamma};
        vk.delta2 = {delta};
        vk.IC = new Pairing.G1Point[]({ic_len});
{ic}    }}

    function verify(uint256[4] memory input, Proof memory proof) internal view returns (uint256) {{
        VerifyingKey memory vk = verifyingKey();
        Pairing.G1Point memory vkX = Pairing.G1Point(0, 0);

        for (uint256 i = 0; i < input.length; i++) {{
            require(input[i] < SNARK_SCALAR_FIELD, "verifier-input-gte-field");
            vkX = Pairing.addition(vkX, Pairing.scalar_mul(vk.IC[i + 1], input[i]));
        }}
        vkX = Pairing.addition(vkX, vk.IC[0]);

        if (
            !Pairing.pairingProd4(
                Pairing.negate(proof.A),
                proof.B,
                vk.alfa1,
                vk.beta2,
                vkX,
                vk.gamma2,
                proof.C,
                vk.delta2
            )
        ) return 1;

        return 0;
    }}

    function verifyProof(
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256[4] memory input
    ) public view returns (bool) {{
        Proof memory proof;
        proof.A = Pairing.G1Point(a[0], a[1]);
        proof.B = Pairing.G2Point([b[0][0], b[0][1]], [b[1][0], b[1][1]]);
        proof.C = Pairing.G1Point(c[0], c[1]);
        return verify(input, proof) == 0;
    }}
}}
"#,
        alpha = g1_sol(&vk.alpha_g1),
        beta = g2_sol(&vk.beta_g2),
        gamma = g2_sol(&vk.gamma_g2),
        delta = g2_sol(&vk.delta_g2),
        ic_len = vk.gamma_abc_g1.len(),
        ic = ic
    ))
}
