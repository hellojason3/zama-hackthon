// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

library Pairing {
    uint256 internal constant PRIME_Q = 21888242871839275222246405745257275088696311157297823662689037894645226208583;

    struct G1Point { uint256 X; uint256 Y; }
    struct G2Point { uint256[2] X; uint256[2] Y; }

    function negate(G1Point memory p) internal pure returns (G1Point memory) {
        if (p.X == 0 && p.Y == 0) return G1Point(0, 0);
        return G1Point(p.X, PRIME_Q - (p.Y % PRIME_Q));
    }

    function addition(G1Point memory p1, G1Point memory p2) internal view returns (G1Point memory r) {
        uint256[4] memory input = [p1.X, p1.Y, p2.X, p2.Y];
        bool success;
        assembly {
            success := staticcall(sub(gas(), 2000), 6, input, 0x80, r, 0x40)
        }
        require(success, "pairing-add-failed");
    }

    function scalar_mul(G1Point memory p, uint256 s) internal view returns (G1Point memory r) {
        uint256[3] memory input = [p.X, p.Y, s];
        bool success;
        assembly {
            success := staticcall(sub(gas(), 2000), 7, input, 0x60, r, 0x40)
        }
        require(success, "pairing-mul-failed");
    }

    function pairing(G1Point[] memory p1, G2Point[] memory p2) internal view returns (bool) {
        require(p1.length == p2.length, "pairing-length-mismatch");
        uint256 elements = p1.length;
        uint256 inputSize = elements * 6;
        uint256[] memory input = new uint256[](inputSize);
        for (uint256 i = 0; i < elements; i++) {
            input[i * 6 + 0] = p1[i].X;
            input[i * 6 + 1] = p1[i].Y;
            input[i * 6 + 2] = p2[i].X[0];
            input[i * 6 + 3] = p2[i].X[1];
            input[i * 6 + 4] = p2[i].Y[0];
            input[i * 6 + 5] = p2[i].Y[1];
        }
        uint256[1] memory out;
        bool success;
        assembly {
            success := staticcall(sub(gas(), 2000), 8, add(input, 0x20), mul(inputSize, 0x20), out, 0x20)
        }
        require(success, "pairing-opcode-failed");
        return out[0] != 0;
    }

    function pairingProd4(
        G1Point memory a1,
        G2Point memory a2,
        G1Point memory b1,
        G2Point memory b2,
        G1Point memory c1,
        G2Point memory c2,
        G1Point memory d1,
        G2Point memory d2
    ) internal view returns (bool) {
        G1Point[] memory p1 = new G1Point[](4);
        G2Point[] memory p2 = new G2Point[](4);
        p1[0] = a1; p1[1] = b1; p1[2] = c1; p1[3] = d1;
        p2[0] = a2; p2[1] = b2; p2[2] = c2; p2[3] = d2;
        return pairing(p1, p2);
    }
}

contract QualifiedInvestorGroth16Verifier {
    using Pairing for *;

    uint256 internal constant SNARK_SCALAR_FIELD =
        21888242871839275222246405745257275088548364400416034343698204186575808495617;

    struct VerifyingKey {
        Pairing.G1Point alfa1;
        Pairing.G2Point beta2;
        Pairing.G2Point gamma2;
        Pairing.G2Point delta2;
        Pairing.G1Point[] IC;
    }

    struct Proof {
        Pairing.G1Point A;
        Pairing.G2Point B;
        Pairing.G1Point C;
    }

    function verifyingKey() internal pure returns (VerifyingKey memory vk) {
        vk.alfa1 = Pairing.G1Point(17444219440218734564517551768627842829377948342834494712837670442687538336256, 6364189823978288619836913420937246851065367135233612807174607857354912603965);
        vk.beta2 = Pairing.G2Point([7921207934491556455586098300594609782897946946444285553588832104603927948075, 371839156062076890834349765095405786511563749187077083023526786293278345450], [20229368463788190393353635716815226649984387750694625033508687189594080167654, 6902570668629806669892933211751464139102625320102665819746202949984261901668]);
        vk.gamma2 = Pairing.G2Point([11847377820845543432178240203202087480109697285550813637900325537920164256813, 1566415205121883668952472306084907186596808085901553960666476430768264438959], [714037568830068337106278444709908865710001867169088610143904506961764856007, 7234423622310777545072866369050338311707763140063395740727253881707350067084]);
        vk.delta2 = Pairing.G2Point([3442675003463274617747141189280118835000198626767265855376004287781079498987, 552255328571400313111268445281338547272886517119494243083236792779305565446], [16015603126572213562993279325617024419705518140803417055053238785129482274085, 3753465759606205444315971577345640249455290576019150085369703476467416828413]);
        vk.IC = new Pairing.G1Point[](5);
        vk.IC[0] = Pairing.G1Point(17282033545745345104913380559921138564566961910511225147943345729330601606700, 7333493346518051099562004792899576521413824838156490822078684311448288319266);
        vk.IC[1] = Pairing.G1Point(9430422043176155867825178329967198215881710846373111524841803851617762170339, 20263860254663764005449872998056466866408662432559034001664793408149884909136);
        vk.IC[2] = Pairing.G1Point(2343636941727395738156779476971094429424973675200636407785541456877566335731, 18820169670072417499168550322014014548635116310638920540647257657782387651961);
        vk.IC[3] = Pairing.G1Point(16237949553646354804177075533064384069566753786405741398179571988299369770917, 8661089980143885972013471637101139877776435214465477236764287472205548322308);
        vk.IC[4] = Pairing.G1Point(10337580203967665839783490667341575702141386245189062812515685722026911448252, 5139490066816743510201835866266490958744776150182510904536843212013324002855);
    }

    function verify(uint256[4] memory input, Proof memory proof) internal view returns (uint256) {
        VerifyingKey memory vk = verifyingKey();
        Pairing.G1Point memory vkX = Pairing.G1Point(0, 0);

        for (uint256 i = 0; i < input.length; i++) {
            require(input[i] < SNARK_SCALAR_FIELD, "verifier-input-gte-field");
            vkX = Pairing.addition(vkX, Pairing.scalar_mul(vk.IC[i + 1], input[i]));
        }
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
    }

    function verifyProof(
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256[4] memory input
    ) public view returns (bool) {
        Proof memory proof;
        proof.A = Pairing.G1Point(a[0], a[1]);
        proof.B = Pairing.G2Point([b[0][0], b[0][1]], [b[1][0], b[1][1]]);
        proof.C = Pairing.G1Point(c[0], c[1]);
        return verify(input, proof) == 0;
    }
}
