// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IQualifiedInvestorRegistry} from "./interfaces/IQualifiedInvestorRegistry.sol";

contract MockQualifiedInvestorRegistry is Ownable, IQualifiedInvestorRegistry {
    uint64 public constant QUALIFIED_ASSET_THRESHOLD_USDC = 1_000_000e6;

    mapping(address account => bool qualified) private _qualified;

    event DemoProofAccepted(address indexed account, bytes32 indexed proofCommitment, uint64 threshold);
    event QualificationSet(address indexed account, bool qualified);

    constructor() Ownable(msg.sender) {}

    function isQualified(address account) external view returns (bool) {
        return _qualified[account];
    }

    function submitDemoProof(bytes32 proofCommitment) external {
        require(proofCommitment != bytes32(0), "registry: empty proof");
        _qualified[msg.sender] = true;
        emit DemoProofAccepted(msg.sender, proofCommitment, QUALIFIED_ASSET_THRESHOLD_USDC);
    }

    function setQualified(address account, bool qualified) external onlyOwner {
        _qualified[account] = qualified;
        emit QualificationSet(account, qualified);
    }
}
