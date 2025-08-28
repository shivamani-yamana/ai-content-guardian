import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    hardhat: {
      chainId: 31337
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337
    },
    // Update blockchain-v3/hardhat.config.ts
appSubnet: {
  url: "http://127.0.0.1:41243/ext/bc/S9KE4zarW96qo19RUj3ZWfoFKhetZgarjNnmJ6McAogjtRHVs/rpc",
  chainId: 1221,
  accounts: ["0x56289e99c94b6912bfc12adc093c9b51124f0dc54ac7a766b2bc5ccf558d8027"]
},
securitySubnet: {
  url: "http://127.0.0.1:39737/ext/bc/21FZHCQk1zyjTdw7rUfZJNs53QVvbB1t2k4rYwn23o66RcAcFo/rpc",
  chainId: 1222,
  accounts: ["0x56289e99c94b6912bfc12adc093c9b51124f0dc54ac7a766b2bc5ccf558d8027"]
}
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};

export default config;
