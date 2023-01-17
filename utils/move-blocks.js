// Manually mine blocks on localhost chain to push confirmations

const { network } = require("hardhat");


function sleep(timeInMs) {
    return new Promise((resolve) => setTimeout(resolve, timeInMs));
}

async function moveBlocks(amount, sleepAmount = 0 /* time between blocks mined */) {
    console.log("Moving blocks...");
    for (index = 0; index < amount; index++){
        await network.provider.request({
            method: "evm_mine",
            params: [],
        });

        if (sleepAmount) {
            console.log(`Sleeping for ${sleepAmount}`);
            await sleep(sleepAmount);
        }
    }
}

module.exports = {sleep, moveBlocks};