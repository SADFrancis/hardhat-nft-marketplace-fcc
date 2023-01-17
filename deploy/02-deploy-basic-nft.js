const { network } = require("hardhat");
const { developmentChains } = require("../helper-hardhat-config");
const { verify } = require("../utils/verify");

module.exports = async function ({ getNamedAccounts, deployments }) {
    
    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();
    const args = [];

    console.log(`Deploying to network: ${network.name}`);
    const basicNft = await deploy("BasicNft", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    });

    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        log("Verifing...");
        await verify(basicNft.address, args);
    }

    // console.log(`Minting NFT one time`)
    // const basicMintTx = await basicNft.mintNft();
    // await basicMintTx.wait(1);
    // console.log(`Basic NFT has tokenURI: ${await basicNft.tokenURI(0)}`);
    // console.log("------------------------------");


}

module.exports.tags = ["all","main", "BasicNft", "02"];
