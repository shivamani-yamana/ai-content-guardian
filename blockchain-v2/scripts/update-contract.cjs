import hre from "hardhat";
import * as fs from "fs";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  console.log("Updating FunctionsConsumer contract with JavaScript source...");
  
  // Your deployed contract address
  const contractAddress = "0x274f3075F5Db63F324fFC5c4e6EfEebEfa0aBDec";

  // Get contract instance
  const contract = await hre.ethers.getContractAt("FunctionsConsumer", contractAddress);
  
  // Read JavaScript source code
  const sourceCode = fs.readFileSync("./functions-source.js", "utf8");
  
  // Set the JavaScript code in the contract
  console.log("Setting JavaScript source code...");
  const tx = await contract.setJsSource(sourceCode);
  await tx.wait();
  
  console.log("✅ JavaScript source code updated in the contract!");
  console.log("Transaction hash:", tx.hash);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
