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
    // Real Avalanche Subnets with ICM enabled
    appSubnet: {
      url: "http://127.0.0.1:44329/ext/bc/2HBRYnNjW2zaSTU9Yx7BNjP9EqNWXpF9r3BW1iNi8aMdYdfQYU/rpc",
      chainId: 1221,
      accounts: ["0x56289e99c94b6912bfc12adc093c9b51124f0dc54ac7a766b2bc5ccf558d8027"] // ewoq private key
    },
    securitySubnet: {
      url: "http://127.0.0.1:41241/ext/bc/29sTJAdK61GMy6habcTqEHFj2GfQgnieGh8TSaWJgpwnNqYS4y/rpc",
      chainId: 1222,
      accounts: ["0x56289e99c94b6912bfc12adc093c9b51124f0dc54ac7a766b2bc5ccf558d8027"] // ewoq private key
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
