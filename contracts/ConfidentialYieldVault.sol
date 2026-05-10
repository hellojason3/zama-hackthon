// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, ebool, euint64} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {IConfidentialFungibleToken} from "@openzeppelin/confidential-contracts/interfaces/IConfidentialFungibleToken.sol";
import {IConfidentialFungibleTokenReceiver} from "@openzeppelin/confidential-contracts/interfaces/IConfidentialFungibleTokenReceiver.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import {IQualifiedInvestorRegistry} from "./interfaces/IQualifiedInvestorRegistry.sol";
import {YieldProductMarket} from "./YieldProductMarket.sol";

contract ConfidentialYieldVault is SepoliaConfig, IConfidentialFungibleTokenReceiver, Ownable, ReentrancyGuard {
    uint64 public constant BPS = 10_000;
    uint64 public constant MAX_REWARD_PERIODS = 365;

    IConfidentialFungibleToken public immutable cUSDC;
    YieldProductMarket public immutable market;
    IQualifiedInvestorRegistry public qualificationRegistry;

    uint64 public totalDepositEvents;
    uint64 public totalClaimEvents;
    uint64 public yieldRound;

    mapping(address user => mapping(uint256 productId => euint64 principal)) private _encryptedPrincipal;
    mapping(address user => mapping(uint256 productId => euint64 reward)) private _encryptedRewards;
    mapping(address user => uint256[] productIds) private _userProducts;
    mapping(address user => mapping(uint256 productId => bool hasPosition)) private _hasPosition;
    mapping(address user => mapping(uint256 productId => bool hasReward)) private _hasReward;

    event QualificationRegistryUpdated(address indexed registry);
    event EncryptedDeposit(address indexed user, uint256 indexed productId, uint64 depositEvent);
    event YieldAccrued(address indexed user, uint256 indexed productId, uint64 round, uint16 aprBps, uint64 periods);
    event RewardDecryptionAllowed(address indexed user, uint256 indexed productId);
    event RewardClaimed(address indexed user, uint256 indexed productId, uint64 claimEvent);

    constructor(
        IConfidentialFungibleToken cUSDC_,
        YieldProductMarket market_,
        IQualifiedInvestorRegistry qualificationRegistry_
    ) Ownable(msg.sender) {
        require(address(cUSDC_) != address(0), "vault: zero cUSDC");
        require(address(market_) != address(0), "vault: zero market");
        require(address(qualificationRegistry_) != address(0), "vault: zero registry");

        cUSDC = cUSDC_;
        market = market_;
        qualificationRegistry = qualificationRegistry_;
    }

    function setQualificationRegistry(IQualifiedInvestorRegistry newRegistry) external onlyOwner {
        require(address(newRegistry) != address(0), "vault: zero registry");
        qualificationRegistry = newRegistry;
        emit QualificationRegistryUpdated(address(newRegistry));
    }

    function onConfidentialTransferReceived(
        address,
        address from,
        euint64 amount,
        bytes calldata data
    ) external nonReentrant returns (ebool) {
        require(msg.sender == address(cUSDC), "vault: only cUSDC");
        require(data.length == 32, "vault: product required");
        require(qualificationRegistry.isQualified(from), "vault: qualification required");

        uint256 productId = abi.decode(data, (uint256));
        require(market.isActive(productId), "vault: inactive product");

        euint64 nextPrincipal = FHE.add(_encryptedPrincipal[from][productId], amount);
        FHE.allowThis(nextPrincipal);
        FHE.allow(nextPrincipal, from);
        _encryptedPrincipal[from][productId] = nextPrincipal;

        if (!_hasPosition[from][productId]) {
            _hasPosition[from][productId] = true;
            _userProducts[from].push(productId);
        }

        totalDepositEvents += 1;
        market.recordDeposit(from, productId);

        emit EncryptedDeposit(from, productId, totalDepositEvents);
        return FHE.asEbool(true);
    }

    function accrueReward(address user, uint256 productId, uint64 periods) external onlyOwner {
        require(periods > 0, "vault: zero periods");
        require(periods <= MAX_REWARD_PERIODS, "vault: periods too high");
        require(FHE.isInitialized(_encryptedPrincipal[user][productId]), "vault: no position");

        YieldProductMarket.Product memory product = market.getProduct(productId);
        require(product.active, "vault: inactive product");

        uint64 multiplierBps = uint64(product.currentAprBps) * periods;
        euint64 reward = FHE.div(FHE.mul(_encryptedPrincipal[user][productId], multiplierBps), BPS);
        euint64 nextReward = FHE.add(_encryptedRewards[user][productId], reward);

        FHE.allowThis(nextReward);
        FHE.allow(nextReward, user);
        _encryptedRewards[user][productId] = nextReward;
        _hasReward[user][productId] = true;

        yieldRound += 1;
        emit YieldAccrued(user, productId, yieldRound, product.currentAprBps, periods);
    }

    function requestDecryptReward(uint256 productId) external {
        euint64 reward = _encryptedRewards[msg.sender][productId];
        require(_hasReward[msg.sender][productId] && FHE.isInitialized(reward), "vault: no reward");

        FHE.allow(reward, msg.sender);
        emit RewardDecryptionAllowed(msg.sender, productId);
    }

    function claimReward(uint256 productId) external nonReentrant {
        euint64 reward = _encryptedRewards[msg.sender][productId];
        require(_hasReward[msg.sender][productId] && FHE.isInitialized(reward), "vault: no reward");

        _hasReward[msg.sender][productId] = false;
        _encryptedRewards[msg.sender][productId] = euint64.wrap(0);

        FHE.allowTransient(reward, address(cUSDC));
        cUSDC.confidentialTransfer(msg.sender, reward);

        totalClaimEvents += 1;
        emit RewardClaimed(msg.sender, productId, totalClaimEvents);
    }

    function getEncryptedPrincipal(address user, uint256 productId) external view returns (euint64) {
        return _encryptedPrincipal[user][productId];
    }

    function getEncryptedReward(address user, uint256 productId) external view returns (euint64) {
        return _encryptedRewards[user][productId];
    }

    function getUserProducts(address user) external view returns (uint256[] memory) {
        return _userProducts[user];
    }

    function hasPosition(address user, uint256 productId) external view returns (bool) {
        return _hasPosition[user][productId];
    }

    function hasReward(address user, uint256 productId) external view returns (bool) {
        return _hasReward[user][productId];
    }
}
