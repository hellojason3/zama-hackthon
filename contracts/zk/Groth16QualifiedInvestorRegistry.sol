// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IQualifiedInvestorRegistry} from "../interfaces/IQualifiedInvestorRegistry.sol";
import {IQualifiedInvestorGroth16Verifier} from "./IQualifiedInvestorGroth16Verifier.sol";

contract Groth16QualifiedInvestorRegistry is Ownable, IQualifiedInvestorRegistry {
    uint256 public constant QUALIFIED_ASSET_THRESHOLD_USDC = 1_000_000e6;

    IQualifiedInvestorGroth16Verifier public immutable verifier;

    mapping(uint256 commitment => bool valid) public validCommitments;
    mapping(uint256 nullifierHash => bool used) public usedNullifiers;
    mapping(address account => bool qualified) private _qualified;

    event CommitmentRegistered(uint256 indexed commitment);
    event CommitmentRevoked(uint256 indexed commitment);
    event QualificationProved(address indexed account, uint256 indexed commitment, uint256 indexed nullifierHash);

    constructor(IQualifiedInvestorGroth16Verifier verifier_) Ownable(msg.sender) {
        require(address(verifier_) != address(0), "registry: zero verifier");
        verifier = verifier_;
    }

    function isQualified(address account) external view returns (bool) {
        return _qualified[account];
    }

    function registerCommitment(uint256 commitment) external {
        require(commitment != 0, "registry: empty commitment");
        validCommitments[commitment] = true;
        emit CommitmentRegistered(commitment);
    }

    function revokeCommitment(uint256 commitment) external onlyOwner {
        validCommitments[commitment] = false;
        emit CommitmentRevoked(commitment);
    }

    function proveQualified(
        uint256[2] calldata a,
        uint256[2][2] calldata b,
        uint256[2] calldata c,
        uint256[4] calldata input
    ) external {
        uint256 commitment = input[0];
        uint256 threshold = input[1];
        uint256 user = input[2];
        uint256 nullifierHash = input[3];

        require(threshold == QUALIFIED_ASSET_THRESHOLD_USDC, "registry: bad threshold");
        require(user == uint256(uint160(msg.sender)), "registry: wrong user");
        require(validCommitments[commitment], "registry: invalid commitment");
        require(!usedNullifiers[nullifierHash], "registry: nullifier used");
        require(verifier.verifyProof(a, b, c, input), "registry: invalid proof");

        usedNullifiers[nullifierHash] = true;
        _qualified[msg.sender] = true;

        emit QualificationProved(msg.sender, commitment, nullifierHash);
    }
}
