import pkg from "@chainlink/functions-toolkit";
import { ethers } from "ethers";
import * as fs from "fs";
import * as dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

// Destructure the required components from the functions-toolkit
const {
  SecretsManager,
  ResponseListener,
  SubscriptionManager,
  createGist,
  deleteGist,
  Location,
} = pkg;

// =================================================================================================
// HELPER: PROVIDER CONNECTION TEST
// =================================================================================================
async function testConnection(provider, address) {
  console.log("Testing provider connection...");
  try {
    const balance = await provider.getBalance(address);
    console.log(`Successfully fetched balance: ${ethers.utils.formatEther(balance)} ETH`);
    
    // Test gas estimation
    const gasEstimate = await provider.estimateGas({
      to: address,
      value: 0,
    });
    console.log(`Successfully estimated gas: ${gasEstimate}`);
    console.log("✅ Provider connection is healthy (read & write operations seem functional).");
  } catch (error) {
    console.error("❌ Provider connection test failed.");
    console.error(`Error details: ${error.message}`);
    process.exit(1);
  }
}

// =================================================================================================
// MAIN EXECUTION
// =================================================================================================
async function main() {
  // =================================================================================================
  // 1. CONFIGURATION AND SETUP
  // =================================================================================================
  console.log("1. Setting up configuration from .env file...");

  const {
    PRIVATE_KEY,
    RPC_URL,
    FUNCTIONS_ROUTER,
    DON_ID,
    SUBSCRIPTION_ID,
    CONSUMER_ADDRESS,
    GITHUB_TOKEN,
    GROQ_KEY,
  } = process.env;

  console.log("Debug environment variables:");
  console.log("FUNCTIONS_ROUTER:", FUNCTIONS_ROUTER);
  console.log("DON_ID:", DON_ID);
  console.log("SUBSCRIPTION_ID:", SUBSCRIPTION_ID);

  // Validate that all necessary environment variables are set
  if (
    !PRIVATE_KEY || !RPC_URL || !FUNCTIONS_ROUTER || !DON_ID ||
    !SUBSCRIPTION_ID || !CONSUMER_ADDRESS || !GITHUB_TOKEN || !GROQ_KEY
  ) {
    throw new Error("Missing one or more required environment variables. Please check your .env file.");
  }

  const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
  const signer = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log("\n2. Verifying blockchain provider connection...");
  await testConnection(provider, signer.address);

  // =================================================================================================
  // 3. SECRETS MANAGEMENT (INLINE METHOD)
  // =================================================================================================
  console.log("\n3. Managing secrets (using inline method)...");
  const secrets = { groqKey: GROQ_KEY };
  console.log("✅ Using inline secrets.");

  // =================================================================================================
  // 4. SUBSCRIPTION MANAGEMENT
  // =================================================================================================
  console.log("\n4. Managing Chainlink Functions subscription...");
  
  console.log("Debug: signer address:", signer.address);
  console.log("Debug: FUNCTIONS_ROUTER:", FUNCTIONS_ROUTER);
  
  // Try alternative approach - send request directly without SubscriptionManager
  console.log("Skipping SubscriptionManager for now, using direct approach...");
  
  // =================================================================================================
  // 5. SEND REQUEST DIRECTLY TO CONSUMER CONTRACT
  // =================================================================================================
  console.log("\n5. Sending request directly to deployed Consumer contract...");

  // Read the JavaScript source code
  const source = fs.readFileSync("./functions-source.js", "utf8");
  
  // Test content to classify
  const args = ["Check out this amazing investment opportunity! Send me your private keys and I'll double your crypto!"];
  
  // Connect to our deployed FunctionsConsumer contract
  const consumerContract = new ethers.Contract(
    CONSUMER_ADDRESS,
    [
      "function startAnalysis(string memory content, address user) external",
      "function lastResponse() external view returns (bytes memory)",
      "function lastError() external view returns (bytes memory)",
      "function setFunctionsConfig(bytes32 _donId, uint64 _subscriptionId) external"
    ],
    signer
  );
  
  // First, configure the contract with subscription details
  console.log("Setting Functions configuration...");
  
  // Convert DON_ID string to bytes32
  const donIdBytes32 = ethers.utils.formatBytes32String(DON_ID);
  console.log("DON_ID as bytes32:", donIdBytes32);
  
  const configTx = await consumerContract.setFunctionsConfig(donIdBytes32, parseInt(SUBSCRIPTION_ID));
  await configTx.wait();
  console.log("✅ Functions configuration set");
  
  // Test by calling startAnalysis (note: this will fail because we're not the Content contract)
  console.log("Testing analysis (expecting error since we're not the Content contract)...");
  try {
    const tx = await consumerContract.startAnalysis(args[0], signer.address);
    await tx.wait();
    console.log("✅ Analysis started!");
  } catch (error) {
    console.log("❌ Expected error:", error.message);
    console.log("This is normal - only the Content contract can call startAnalysis");
  }
}

main().catch((err) => {
  console.error("\nAn unexpected error occurred:");
  console.error(err);
  process.exit(1);
});