// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";

interface IFunctionsConsumer {
    function startAnalysis(string calldata content, address user) external;
}

/**
 * @title Content Contract
 * @notice Allows users to submit content for moderation.
 */
contract Content is Ownable {
    // --- State Variables ---

    address public consumerAddress;
    uint256 public contentCounter;

    // --- Events ---

    event ContentSubmitted(
        address indexed user,
        uint256 indexed contentId,
        string content
    );

    // --- Constructor ---

    constructor(address initialOwner) Ownable(initialOwner) {}

    // --- Configuration ---

    function setConsumerAddress(address _consumerAddress) external onlyOwner {
        require(_consumerAddress != address(0), "Invalid address");
        consumerAddress = _consumerAddress;
    }

    // --- Public Functions ---

    function submitContent(string calldata _content) external {
        require(consumerAddress != address(0), "Consumer not set");
        require(bytes(_content).length > 0, "Empty content");

        unchecked {
            contentCounter++;
        }
        uint256 currentId = contentCounter;

        emit ContentSubmitted(msg.sender, currentId, _content);

        try IFunctionsConsumer(consumerAddress).startAnalysis(_content, msg.sender) {
            // success
        } catch {
            revert("Consumer call failed");
        }
    }

    // Reject accidental ETH transfers
    receive() external payable {
        revert("ETH not accepted");
    }

    fallback() external payable {
        revert("Invalid call");
    }
}
