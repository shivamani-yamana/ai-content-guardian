import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("GuardianSystem", (m) => {
  // Get the deployer account
  const deployer = m.getAccount(0);
  
  // Deploy Guardian contract with required constructor parameters
  const TELEPORTER_ADDRESS = "0x253b2784c75e510dD0fF1da844684a1aC0aa5fcf"; // Fuji Teleporter
  const SOURCE_BLOCKCHAIN_ID = "0x000000000000000000000000000000000000000000000000000000000000a869"; // Fuji chain ID as bytes32
  
  const guardian = m.contract("Guardian", [
    TELEPORTER_ADDRESS,
    SOURCE_BLOCKCHAIN_ID,
    deployer // Use deployer address as authorized sender
  ]);

  // Deploy FunctionsConsumer contract
  const FUNCTIONS_ROUTER = "0xA9d587a00A31A52Ed70D6026794a8FC5E2F5dCb0";
  const functionsConsumer = m.contract("FunctionsConsumer", [FUNCTIONS_ROUTER]);

  // Deploy Content contract (expects only 1 argument, not 2)
  const content = m.contract("Content", [functionsConsumer]);

  return { guardian, functionsConsumer, content };
});