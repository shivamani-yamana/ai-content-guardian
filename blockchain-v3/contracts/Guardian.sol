// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract Guardian {
    mapping(address => bool) public maliciousAddresses;
    mapping(address => uint256) public violationCount;
    address public owner;
    
    // ICM integration (simplified for demo)
    bytes32 public appSubnetBlockchainID;
    address public appSubnetContentContract;
    
    // Oracle integration for cross-chain messaging
    mapping(address => bool) public authorizedOracles;
    
    event MaliciousAddressFlagged(address indexed addr, uint256 violationCount);
    event CrossChainAlertReceived(bytes32 indexed sourceBlockchainID, address indexed sourceAddress, address flaggedAddress);
    event OracleAuthorized(address indexed oracle);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this");
        _;
    }
    
    modifier onlyAuthorizedOracle() {
        require(authorizedOracles[msg.sender], "Only authorized oracle can call this");
        _;
    }
    
    constructor() {
        owner = msg.sender;
        // Authorize deployer as initial oracle
        authorizedOracles[msg.sender] = true;
    }
    
    function authorizeOracle(address _oracle) external onlyOwner {
        authorizedOracles[_oracle] = true;
        emit OracleAuthorized(_oracle);
    }
    
    function setAppSubnetInfo(bytes32 _appSubnetBlockchainID, address _appSubnetContentContract) external onlyOwner {
        appSubnetBlockchainID = _appSubnetBlockchainID;
        appSubnetContentContract = _appSubnetContentContract;
    }
    
    function flagAddress(address _maliciousAddress) external onlyAuthorizedOracle {
        maliciousAddresses[_maliciousAddress] = true;
        violationCount[_maliciousAddress]++;
        
        emit MaliciousAddressFlagged(_maliciousAddress, violationCount[_maliciousAddress]);
    }
    
    // Cross-chain alert handler (called by authorized oracle)
    function handleCrossChainAlert(
        bytes32 sourceBlockchainID,
        address originSenderAddress,
        address flaggedAddress
    ) external onlyAuthorizedOracle {
        // Flag the malicious address
        maliciousAddresses[flaggedAddress] = true;
        violationCount[flaggedAddress]++;
        
        emit CrossChainAlertReceived(sourceBlockchainID, originSenderAddress, flaggedAddress);
        emit MaliciousAddressFlagged(flaggedAddress, violationCount[flaggedAddress]);
    }
    
    function isMalicious(address _addr) external view returns (bool) {
        return maliciousAddresses[_addr];
    }
    
    function getViolationCount(address _addr) external view returns (uint256) {
        return violationCount[_addr];
    }
    
    function isAuthorizedOracle(address _oracle) external view returns (bool) {
        return authorizedOracles[_oracle];
    }
}
