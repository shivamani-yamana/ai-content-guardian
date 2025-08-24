const { ethers } = require("hardhat");

async function main() {
    console.log("Deploying Content contract to App Subnet...");
    console.log("Network:", hre.network.name);
    console.log("RPC URL:", hre.network.config.url);
    
    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);
    
    // Check balance
    const balance = await deployer.provider.getBalance(deployer.address);
    console.log("Account balance:", ethers.formatEther(balance), "ETH");
    
    // Check if we have enough balance
    if (balance === 0n) {
        throw new Error("Deployer account has no balance. Please fund the account first.");
    }

    // Deploy Content contract
    console.log("\nDeploying Content contract...");
    const Content = await ethers.getContractFactory("Content");
    
    // Estimate gas
    const deploymentData = Content.interface.encodeDeploy([]);
    const gasEstimate = await deployer.provider.estimateGas({
        data: deploymentData
    });
    console.log("Estimated gas:", gasEstimate.toString());
    
    const content = await Content.deploy();
    console.log("Transaction submitted. Waiting for confirmation...");
    
    await content.waitForDeployment();
    const contentAddress = await content.getAddress();

    console.log("✅ Content contract deployed to:", contentAddress);
    
    // Save deployment info
    const deploymentInfo = {
        network: hre.network.name,
        chainId: hre.network.config.chainId,
        rpcUrl: hre.network.config.url,
        contentAddress: contentAddress,
        deployer: deployer.address,
        deployerBalance: ethers.formatEther(balance),
        timestamp: new Date().toISOString(),
        blockNumber: await deployer.provider.getBlockNumber()
    };
    
    console.log("\n📋 Deployment Summary:");
    console.log(JSON.stringify(deploymentInfo, null, 2));
    
    // Test the contract
    console.log("\n🧪 Testing contract...");
    try {
        const testTx = await content.submit("Hello from App Subnet!");
        const receipt = await testTx.wait();
        console.log("✅ Test submission successful! Transaction hash:", receipt.hash);
        console.log("   Block number:", receipt.blockNumber);
        console.log("   Gas used:", receipt.gasUsed.toString());
        
        // Verify the oracle authorization
        const isOwnerAuthorized = await content.isAuthorizedOracle(deployer.address);
        console.log("   Owner is authorized oracle:", isOwnerAuthorized);
        
    } catch (error) {
        console.error("❌ Test failed:", error.message);
    }
    
    console.log("\n🎉 Deployment completed successfully!");
    return contentAddress;
}

main()
    .then((address) => {
        console.log(`\n📌 Content Contract Address: ${address}`);
        process.exit(0);
    })
    .catch((error) => {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    });
