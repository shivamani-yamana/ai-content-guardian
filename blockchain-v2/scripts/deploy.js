import * as dotenv from "dotenv";
import hre from "hardhat";
import * as fs from "fs";
dotenv.config();

async function main() {
    console.log("Starting deployment...");

    // Get signers from Hardhat
    const [deployer] = await hre.ethers.getSigners();
    console.log(`Deploying contracts with account: ${deployer.address}`);

    // Check balance
    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log(`Account balance: ${hre.ethers.formatEther(balance)} AVAX`);

    // Deploy Guardian contract
    console.log("\n1. Deploying Guardian contract...");
    const Guardian = await hre.ethers.getContractFactory("Guardian");
    const guardian = await Guardian.deploy();
    await guardian.waitForDeployment();
    const guardianAddress = await guardian.getAddress();
    console.log(`Guardian deployed to: ${guardianAddress}`);

    // Deploy FunctionsConsumer contract
    console.log("\n2. Deploying FunctionsConsumer contract...");
    const FUNCTIONS_ROUTER = process.env.FUNCTIONS_ROUTER || "0xA9d587a00A31A52Ed70D6026794a8FC5E2F5dCb0"; // Fuji testnet router
    
    const FunctionsConsumer = await hre.ethers.getContractFactory("FunctionsConsumer");
    const functionsConsumer = await FunctionsConsumer.deploy(FUNCTIONS_ROUTER);
    await functionsConsumer.waitForDeployment();
    const functionsConsumerAddress = await functionsConsumer.getAddress();
    console.log(`FunctionsConsumer deployed to: ${functionsConsumerAddress}`);

    // Deploy Content contract
    console.log("\n3. Deploying Content contract...");
    const Content = await hre.ethers.getContractFactory("Content");
    const content = await Content.deploy(functionsConsumerAddress, guardianAddress);
    await content.waitForDeployment();
    const contentAddress = await content.getAddress();
    console.log(`Content deployed to: ${contentAddress}`);

    // Save deployment addresses
    const deploymentData = {
        network: "fuji",
        timestamp: new Date().toISOString(),
        contracts: {
            Guardian: guardianAddress,
            FunctionsConsumer: functionsConsumerAddress,
            Content: contentAddress
        }
    };

    fs.writeFileSync("deployment.json", JSON.stringify(deploymentData, null, 2));
    console.log("\n✅ Deployment complete! Contract addresses saved to deployment.json");

    // Display summary
    console.log("\n=== DEPLOYMENT SUMMARY ===");
    console.log(`Guardian: ${guardianAddress}`);
    console.log(`FunctionsConsumer: ${functionsConsumerAddress}`);
    console.log(`Content: ${contentAddress}`);
    console.log("\nShare these addresses with your teammates!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });