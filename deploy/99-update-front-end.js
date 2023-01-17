const { ethers, network } = require("hardhat");
const fs = require("fs");

const frontEndContractsFile = "../nextjs-nft-marketplace-fcc/constants/networkMapping.json";
const frontEndAbiLocation = "../nextjs-nft-marketplace-fcc/constants/";


module.exports = async function () {
    if (process.env.UPDATE_FRONT_END) {
        console.log("Updating frontend...");
        await updateContractAddresses();   
        await updateAbi();
        console.log("Updated Frontend!");
    }
}

async function updateAbi() {
    // functions grab abi:
    // interface - hardhat documentation
    // FormatTypes.json - ethers documentation

    const nftMarketplace = await ethers.getContract("NftMarketPlace");
    fs.writeFileSync(
        `${frontEndAbiLocation}NftMarketplace.json`,
        nftMarketplace.interface.format(ethers.utils.FormatTypes.json)
    );
    const basicNft = await ethers.getContract("BasicNft");
    fs.writeFileSync(
        `${frontEndAbiLocation}basicNft.json`,
        basicNft.interface.format(ethers.utils.FormatTypes.json)
    );
}

async function updateContractAddresses() {
    const nftMarketplace = await ethers.getContract("NftMarketPlace");
    const chainId = network.config.chainId.toString();
    const contractAddresses = JSON.parse(fs.readFileSync(frontEndContractsFile), "utf8");
    if (chainId in contractAddresses) {
        if (!contractAddresses[chainId]["NftMarketPlace"].includes(nftMarketplace.address)) {
            contractAddresses[chainId]["NftMarketPlace"].push(nftMarketplace.address);
        }
    } else {
        contractAddresses[chainId] = { "NftMarketPlace": [nftMarketplace.address] };
    }
    fs.writeFileSync(frontEndContractsFile, JSON.stringify(contractAddresses));

}

module.exports.tags = ["all", "frontend", "99"];