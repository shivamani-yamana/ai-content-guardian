// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @notice Interface to receive cross-chain messages from Avalanche Teleporter
interface ITeleporterMessenger {
    function receiveTeleporterMessage(
        bytes32 messageID,
        address sourceAddress,
        bytes calldata messageBody
    ) external;
}

/**
 * @title Guardian Contract
 * @notice Stores addresses reported as malicious via cross-chain verified messages.
 * Only messages from the authorized FunctionsConsumer via the Teleporter are allowed.
 */
contract Guardian {
    // --- Errors ---
    error UnauthorizedCaller();
    error UnauthorizedSource();
    error InvalidETHTransfer();

    // --- Immutable Configuration ---

    address public immutable teleporter;
    uint256 public immutable sourceBlockchainID;
    address public immutable authorizedSenderAddress;

    // --- Storage ---

    mapping(address => bool) private _isMalicious;

    // --- Events ---

    event MaliciousAddressRecorded(address indexed user);

    // --- Constructor ---

    constructor(
        address _teleporter,
        uint256 _sourceBlockchainID,
        address _authorizedSenderAddress
    ) {
        if (_teleporter == address(0)) revert UnauthorizedCaller();
        if (_authorizedSenderAddress == address(0)) revert UnauthorizedSource();

        teleporter = _teleporter;
        sourceBlockchainID = _sourceBlockchainID;
        authorizedSenderAddress = _authorizedSenderAddress;
    }

    // --- Cross-Chain Message Entry Point ---

    function receiveTeleporterMessage(
        bytes32 /* messageID */,
        address sourceAddress,
        bytes calldata messageBody
    ) external {
        if (msg.sender != teleporter) revert UnauthorizedCaller();
        if (sourceAddress != authorizedSenderAddress) revert UnauthorizedSource();

        address maliciousUser = abi.decode(messageBody, (address));

        if (!_isMalicious[maliciousUser]) {
            _isMalicious[maliciousUser] = true;
            emit MaliciousAddressRecorded(maliciousUser);
        }
    }

    // --- View Function ---

    function isMalicious(address user) external view returns (bool) {
        return _isMalicious[user];
    }

    // --- Fallback Protection ---

    receive() external payable {
        revert InvalidETHTransfer();
    }

    fallback() external payable {
        revert InvalidETHTransfer();
    }
}
