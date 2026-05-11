// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract YieldProductMarket is Ownable {
    struct Product {
        uint256 id;
        string name;
        string category;
        string issuer;
        uint16 currentAprBps;
        uint48 lastRateUpdate;
        bool active;
    }

    uint16 public constant MAX_APR_BPS = 10_000;

    address public vault;
    uint256 public productCount;

    mapping(uint256 productId => Product product) private _products;
    mapping(uint256 productId => uint64 deposits) public depositCountByProduct;
    mapping(address user => mapping(uint256 productId => uint64 deposits)) public userDepositCount;

    event VaultSet(address indexed vault);
    event ProductListed(uint256 indexed productId, string name, string category, string issuer);
    event ProductStatusChanged(uint256 indexed productId, bool active);
    event YieldRatePublished(uint256 indexed productId, uint16 aprBps, uint48 timestamp);
    event DepositRecorded(address indexed user, uint256 indexed productId, uint64 depositCount);

    modifier onlyVault() {
        require(msg.sender == vault, "market: only vault");
        _;
    }

    constructor() Ownable(msg.sender) {
        _listProduct("US Treasury Bills", "Government Bonds", "Treasury Desk", 520);
        _listProduct("Tokenized Real Estate Income", "Real Estate", "Urban Yield SPV", 740);
        _listProduct("ETH Validator Yield", "Staking", "Validator Pool", 390);
        _listProduct("BTC Mining Cashflow", "Mining", "Hashrate Coop", 1180);
        _listProduct("Private Credit Notes", "Private Credit", "Credit Originator", 910);
        _listProduct("Stablecoin Basis Strategy", "Market Neutral", "Basis Desk", 680);
        _listProduct("DeFi Lending Basket", "DeFi Credit", "Lending Allocator", 570);
        _listProduct("GPU Compute Revenue", "Compute", "AI Infra Pool", 1320);
        _listProduct("Dividend Equity Basket", "Public Equity", "Dividend Desk", 480);
        _listProduct("Tokenized Money Market", "Money Market", "Liquidity Desk", 445);
    }

    function setVault(address newVault) external onlyOwner {
        require(newVault != address(0), "market: zero vault");
        vault = newVault;
        emit VaultSet(newVault);
    }

    function listProduct(
        string calldata name,
        string calldata category,
        string calldata issuer,
        uint16 aprBps
    ) external returns (uint256 productId) {
        productId = _listProduct(name, category, issuer, aprBps);
    }

    function setProductActive(uint256 productId, bool active) external onlyOwner {
        require(productId < productCount, "market: invalid product");
        _products[productId].active = active;
        emit ProductStatusChanged(productId, active);
    }

    function publishYieldRate(uint256 productId, uint16 aprBps) external onlyOwner {
        require(productId < productCount, "market: invalid product");
        require(aprBps <= MAX_APR_BPS, "market: apr too high");

        Product storage product = _products[productId];
        require(product.active, "market: inactive product");
        product.currentAprBps = aprBps;
        product.lastRateUpdate = uint48(block.timestamp);

        emit YieldRatePublished(productId, aprBps, product.lastRateUpdate);
    }

    function recordDeposit(address user, uint256 productId) external onlyVault {
        require(productId < productCount, "market: invalid product");
        require(_products[productId].active, "market: inactive product");

        depositCountByProduct[productId] += 1;
        userDepositCount[user][productId] += 1;

        emit DepositRecorded(user, productId, depositCountByProduct[productId]);
    }

    function isActive(uint256 productId) external view returns (bool) {
        return productId < productCount && _products[productId].active;
    }

    function getProduct(uint256 productId) external view returns (Product memory) {
        require(productId < productCount, "market: invalid product");
        return _products[productId];
    }

    function getProducts() external view returns (Product[] memory products) {
        products = new Product[](productCount);
        for (uint256 i = 0; i < productCount; i++) {
            products[i] = _products[i];
        }
    }

    function _listProduct(
        string memory name,
        string memory category,
        string memory issuer,
        uint16 aprBps
    ) internal returns (uint256 productId) {
        require(aprBps <= MAX_APR_BPS, "market: apr too high");

        productId = productCount;
        productCount += 1;

        _products[productId] = Product({
            id: productId,
            name: name,
            category: category,
            issuer: issuer,
            currentAprBps: aprBps,
            lastRateUpdate: uint48(block.timestamp),
            active: true
        });

        emit ProductListed(productId, name, category, issuer);
    }
}
