// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {FunctionsClient} from "@chainlink/contracts/src/v0.8/functions/v1_0_0/FunctionsClient.sol";
import {ConfirmedOwner} from "@chainlink/contracts/src/v0.8/shared/access/ConfirmedOwner.sol";
import {FunctionsRequest} from "@chainlink/contracts/src/v0.8/functions/v1_0_0/libraries/FunctionsRequest.sol";

// Interface for Avalanche Teleporter
interface ITeleporterMessenger {
    function sendCrossChainMessage(
        uint256 destinationBlockchainID,
        address destinationAddress,
        bool requireSignature,
        bytes calldata message
    ) external returns (bytes32);
}

/**
 * @title FunctionsConsumer
 * @notice Uses Chainlink Functions to analyze user-submitted content, and
 * relays malicious addresses cross-chain to a Guardian contract via Avalanche Teleporter.
 */
contract FunctionsConsumer is FunctionsClient, ConfirmedOwner {
    using FunctionsRequest for FunctionsRequest.Request;

    // --- State Variables ---
    bytes32 public donId;
    uint64 public subscriptionId;
    string public jsSource;

    address public teleporterAddress;
    uint256 public destinationBlockchainID;
    address public guardianAddress;

    address public contentContractAddress;

    mapping(bytes32 => address) public activeRequests;
    mapping(bytes32 => bool) public requestFulfilled;

    bytes32 public lastRequestId;
    bytes public lastResponse;
    bytes public lastError;

    // --- Events ---
    event RequestSent(bytes32 indexed requestId, address indexed user);
    event ResponseReceived(bytes32 indexed requestId, address indexed user, bytes response, bytes err);
    event CrossChainMessageSent(address indexed maliciousUser);

    // --- Modifiers ---
    modifier onlyContentContract() {
        require(msg.sender == contentContractAddress, "Only callable by Content contract");
        _;
    }

    // --- Constructor ---
    constructor(address router) FunctionsClient(router) ConfirmedOwner(msg.sender) {
        // Placeholder JS for testing (always returns "MALICIOUS")
        jsSource = "return Functions.encodeString('MALICIOUS');";
    }

    // --- Configuration ---

    function setFunctionsConfig(bytes32 _donId, uint64 _subscriptionId) external onlyOwner {
        donId = _donId;
        subscriptionId = _subscriptionId;
    }

    function setTeleporterConfig(
        address _teleporter,
        uint256 _destinationBlockchainID,
        address _guardianAddress
    ) external onlyOwner {
        require(_teleporter != address(0), "Teleporter address required");
        require(_guardianAddress != address(0), "Guardian address required");
        require(_destinationBlockchainID != 0, "Invalid destination chain");

        teleporterAddress = _teleporter;
        destinationBlockchainID = _destinationBlockchainID;
        guardianAddress = _guardianAddress;
    }

    function setContentContractAddress(address _contentContractAddress) external onlyOwner {
        require(_contentContractAddress != address(0), "Content contract address required");
        contentContractAddress = _contentContractAddress;
    }

    /**
     * @notice Allows the owner to update the JavaScript source code for the Functions request.
     * @param _newSource The new JavaScript source code as a string.
     */
    function setJsSource(string memory _newSource) external onlyOwner {
        jsSource = _newSource;
    }

    // --- Main Logic ---

    /**
     * @notice Called by the Content contract to initiate analysis.
     */
    function startAnalysis(string memory content, address user) external onlyContentContract {
        require(subscriptionId != 0, "Functions subscription not set");

        FunctionsRequest.Request memory req;
        req.initializeRequest(
            FunctionsRequest.Location.Inline,
            FunctionsRequest.CodeLanguage.JavaScript,
            jsSource
        );

        string[] memory args = new string[](1);
        args[0] = content;
        req.setArgs(args);

        bytes32 requestId = _sendRequest(
            req.encodeCBOR(),
            subscriptionId,
            300_000, // gas limit for DON execution
            donId
        );

        activeRequests[requestId] = user;
        lastRequestId = requestId;

        emit RequestSent(requestId, user);
    }

    /**
     * @notice Callback from Chainlink DON after content analysis.
     */
    function fulfillRequest(
        bytes32 requestId,
        bytes memory response,
        bytes memory err
    ) internal override {
        require(!requestFulfilled[requestId], "Already fulfilled");
        requestFulfilled[requestId] = true;

        address user = activeRequests[requestId];
        delete activeRequests[requestId];

        lastResponse = response;
        lastError = err;

        emit ResponseReceived(requestId, user, response, err);

        // If response is "MALICIOUS", send cross-chain message to Guardian
        if (err.length == 0 && keccak256(response) == keccak256(bytes("MALICIOUS"))) {
            require(teleporterAddress != address(0), "Teleporter not set");
            require(destinationBlockchainID != 0, "Destination chain not set");
            require(guardianAddress != address(0), "Guardian address not set");

            bytes memory messageBody = abi.encode(user);

            ITeleporterMessenger(teleporterAddress).sendCrossChainMessage(
                destinationBlockchainID,
                guardianAddress,
                false, // requireSignature
                messageBody
            );

            emit CrossChainMessageSent(user);
        }
    }

    // --- Dev Utility: Simulate a malicious response for testing ---
    function simulateMaliciousResponse(address user) external onlyOwner {
        bytes memory simulated = bytes("MALICIOUS");
        fulfillRequest(
            keccak256(abi.encodePacked(block.timestamp, user)),
            simulated,
            ""
        );
    }
}
