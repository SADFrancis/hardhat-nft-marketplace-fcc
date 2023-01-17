require("@nomicfoundation/hardhat-toolbox");

const MAINNET_RPC_URL = process.env.MAINNET_RPC_URL || "https://eth-mainnet/example";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.17",
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      blockConfirmations: 1,
      forking: {
        url: MAINNET_RPC_URL,
      },
    },
  },
};