// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract Content {
    mapping(address => bool) public authorizedOracles;
    address public owner;
    
    event ContentSubmitted(
        address indexed author,
        string content,
        uint256 timestamp
    );
    
    event OracleAuthorized(address indexed oracle);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this");
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
    
    function submit(string calldata _content) external {
        emit ContentSubmitted(msg.sender, _content, block.timestamp);
    }
    
    function isAuthorizedOracle(address _oracle) external view returns (bool) {
        return authorizedOracles[_oracle];
    }
}
