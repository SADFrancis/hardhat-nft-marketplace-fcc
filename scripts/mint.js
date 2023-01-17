const { ethers, network } = require("hardhat");
const { moveBlocks} = require("../utils/move-blocks")


async function mint() {
    const basicNft = await ethers.getContract("BasicNft");
    console.log("Minting...");
    const mintTx = await basicNft.mintNft();
    const mintTxReceipt = await mintTx.wait(1);
    const tokenId = mintTxReceipt.events[0].args.tokenId;
    console.log(`TokenId: ${tokenId}`);
    console.log(`NFT Address at: ${basicNft.address}`);
    
    if (network.config.chainId == "31337" || "1337") {
        await moveBlocks(2, (sleepAmount = 1000));
    }

    console.log("-----------Mint Script Complete-------------------")

}

mint()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });