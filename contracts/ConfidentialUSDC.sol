// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";
import {ConfidentialFungibleToken} from "@openzeppelin/confidential-contracts/token/ConfidentialFungibleToken.sol";
import {ConfidentialFungibleTokenERC20Wrapper} from "@openzeppelin/confidential-contracts/token/extensions/ConfidentialFungibleTokenERC20Wrapper.sol";

contract ConfidentialUSDC is SepoliaConfig, ConfidentialFungibleTokenERC20Wrapper {
    constructor(IERC20 underlying)
        ConfidentialFungibleToken("Confidential USDC", "cUSDC", "")
        ConfidentialFungibleTokenERC20Wrapper(underlying)
    {}
}
