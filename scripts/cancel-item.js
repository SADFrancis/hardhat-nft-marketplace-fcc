const { ethers, network } = require("hardhat");
const { moveBlocks } = require("../utils/move-blocks");

const TOKEN_ID = 0;

async function cancel() {
    const nftMarketplace = await ethers.getContract("NftMarketPlace");
    const basicNft = await ethers.getContract("BasicNft");
    
    try {
        const tx = await nftMarketplace.cancelListing(basicNft.address, TOKEN_ID);        
        await tx.wait(1);
        console.log("NFT Listing canceled");
        if (network.config.chainId == "31337" || "1337") {
            await moveBlocks(2, (sleepAmount = 1000 /*milliseconds*/));
        }
    } catch (error) {
        console.log("----------error alert!--------")
        console.log(error);        
    }

}


cancel()
.then(() => process.exit(0))
.catch((error) => {
    console.error(error);
    process.exit(1);
});