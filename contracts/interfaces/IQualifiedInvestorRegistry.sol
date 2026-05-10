// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

interface IQualifiedInvestorRegistry {
    function isQualified(address account) external view returns (bool);
}
