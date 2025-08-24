const { ethers } = require("hardhat");

async function main() {
    console.log("Deploying Guardian contract to Security Subnet...");
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

    // Deploy Guardian contract
    console.log("\nDeploying Guardian contract...");
    const Guardian = await ethers.getContractFactory("Guardian");
    
    // Estimate gas
    const deploymentData = Guardian.interface.encodeDeploy([]);
    const gasEstimate = await deployer.provider.estimateGas({
        data: deploymentData
    });
    console.log("Estimated gas:", gasEstimate.toString());
    
    const guardian = await Guardian.deploy();
    console.log("Transaction submitted. Waiting for confirmation...");
    
    await guardian.waitForDeployment();
    const guardianAddress = await guardian.getAddress();

    console.log("✅ Guardian contract deployed to:", guardianAddress);
    
    // Save deployment info
    const deploymentInfo = {
        network: hre.network.name,
        chainId: hre.network.config.chainId,
        rpcUrl: hre.network.config.url,
        guardianAddress: guardianAddress,
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
        // Test flagging an address
        const testAddress = "0x1234567890123456789012345678901234567890";
        const flagTx = await guardian.flagAddress(testAddress);
        const flagReceipt = await flagTx.wait();
        console.log("✅ Test flag transaction successful! Hash:", flagReceipt.hash);
        console.log("   Block number:", flagReceipt.blockNumber);
        console.log("   Gas used:", flagReceipt.gasUsed.toString());
        
        // Verify the address is flagged
        const isMalicious = await guardian.isMalicious(testAddress);
        console.log("   Test address is flagged as malicious:", isMalicious);
        
        const violationCount = await guardian.getViolationCount(testAddress);
        console.log("   Violation count:", violationCount.toString());
        
        // Verify the oracle authorization
        const isOwnerAuthorized = await guardian.isAuthorizedOracle(deployer.address);
        console.log("   Owner is authorized oracle:", isOwnerAuthorized);
        
    } catch (error) {
        console.error("❌ Test failed:", error.message);
    }
    
    console.log("\n🎉 Deployment completed successfully!");
    return guardianAddress;
}

main()
    .then((address) => {
        console.log(`\n📌 Guardian Contract Address: ${address}`);
        process.exit(0);
    })
    .catch((error) => {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    });
