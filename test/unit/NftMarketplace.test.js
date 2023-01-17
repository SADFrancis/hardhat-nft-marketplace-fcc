const { assert, expect } = require("chai");
const { getNamedAccounts, deployments, ethers, network } = require("hardhat");
const { isCallTrace } = require("hardhat/internal/hardhat-network/stack-traces/message-trace");
const { developmentChains, networkConfig, INITIAL_PRICE } = require("../../helper-hardhat-config");


!developmentChains.includes(network.name) // if we're not on development chain
    ? describe.skip // SKIP
    : describe("Nft Marketplace Unit Tests", async function () {
        const TOKEN_ID = 0;
        const PRICE = ethers.utils.parseEther("0.1");
        // time to do some tests on a local blockchain
        console.log(`Testing on: ${network.name}`);
        const chainId = network.config.chainId;

        let basicNft, nftMarketplace, deployer, player;



        // Before we test, let's grab the contract
        beforeEach(async function () {

            deployer = (await getNamedAccounts()).deployer;
            //player = (await getNamedAccounts()).player;
            const accounts = await ethers.getSigners();
            player = accounts[1];
            await deployments.fixture(["all"]);
            basicNft = await ethers.getContract("BasicNft", deployer);
            nftMarketplace = await ethers.getContract("NftMarketPlace", deployer);
            
            //nftMarketplace = await nftMarketplace.connect(player) /* to use 2nd account */

            console.log(`Minting NFT one time`)
            const basicMintTx = await basicNft.mintNft();
            await basicMintTx.wait(1);
            console.log(`Basic NFT has tokenURI: ${await basicNft.tokenURI(0)}`);
            console.log("------------------------------");
            await basicNft.approve(nftMarketplace.address, TOKEN_ID);
        
        });

        it("01 lists and can be bought", async function () {
            await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE);
            const playerConnectedNftMarketplace = nftMarketplace.connect(player);
            await playerConnectedNftMarketplace.buyItem(basicNft.address, TOKEN_ID, {value: PRICE});
            const newOwner = await basicNft.ownerOf(TOKEN_ID);
            const deployerProceeds = await nftMarketplace.getProceeds(deployer);
            assert(newOwner.toString() == player.address);
            assert(deployerProceeds.toString() == PRICE.toString());
        }); // conclude test 01

        it("02 can withdraw proceeds to the seller", async function () {
            await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE);
            const playerConnectedNftMarketplace = nftMarketplace.connect(player);
            await playerConnectedNftMarketplace.buyItem(basicNft.address, TOKEN_ID, {value: PRICE});
            const newOwner = await basicNft.ownerOf(TOKEN_ID);
            const deployerProceeds = await nftMarketplace.getProceeds(deployer);

            await nftMarketplace.withdrawProceeds();
            const withdrawnDeployerProceeds = await nftMarketplace.getProceeds(deployer);
            console.log(`Proceeds before withdrawProceeds: ${deployerProceeds}`)
            console.log(`Proceeds after withdrawProceeds: ${withdrawnDeployerProceeds}`)
            assert(withdrawnDeployerProceeds.toString()== "0");
        }); // conclude test 02
    

        it("03 List item and then delist item", async function () {
            await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE);
            const sellerAddress = await nftMarketplace.getListing(basicNft.address, TOKEN_ID);
            console.log(`seller address before canceled listing: ${sellerAddress.seller}`);

            await nftMarketplace.cancelListing(basicNft.address, TOKEN_ID);
            const newSellerAddress = await nftMarketplace.getListing(basicNft.address, TOKEN_ID);
            console.log(`New seller address after canceled listing: ${newSellerAddress.seller}`);
            assert(newSellerAddress.seller.toString() == "0x0000000000000000000000000000000000000000")
        });
        

        it("04 updates Listed item and emits event", async function () {
            await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE);
            const salePrice = await nftMarketplace.getListing(basicNft.address, TOKEN_ID);
            console.log(`NFT price before updated price listing   : ${salePrice.price}`);

            expect(await nftMarketplace.
                updateListing(basicNft.address, TOKEN_ID, ethers.utils.parseEther(".2"))).
                to.emit("ItemListed"
                );
            const newSalePrice = await nftMarketplace.getListing(basicNft.address, TOKEN_ID);
            console.log(`New seller address after canceled listing: ${newSalePrice.price}`);
            const salePriceCompare = ethers.BigNumber.from(salePrice.price);
            console.log(`New seller address after canceled listing: ${salePriceCompare.mul(2)}`);
            assert(salePriceCompare.mul(2).eq(ethers.BigNumber.from(newSalePrice.price)));
                  
        });

        it("05 prevents someone from buying an NFT under the price listed", async function () {
            const playerConnectedNftMarketplace = nftMarketplace.connect(player);
            await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE);
            let error = `'NftMarketPlace_PriceNotMet("${basicNft.address}", ${TOKEN_ID}, ${ethers.utils.parseEther("0.01")})'`;
            await expect( playerConnectedNftMarketplace.
                buyItem(basicNft.address, TOKEN_ID, { value: ethers.utils.parseEther("0.01") })).
                    to.be.revertedWith(error)
                ;         
        });


        describe("withdrawProceeds", function () {

            beforeEach(async function () {
                await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE);
                const playerConnectedNftMarketplace = nftMarketplace.connect(player);
                await playerConnectedNftMarketplace.buyItem(basicNft.address, TOKEN_ID, { value: PRICE });
            });

            it("06 allows seller to withdraw proceeds correctly", async function () {
                
                const proceeds = await nftMarketplace.getProceeds(deployer); 
                const balance = await ethers.provider.getBalance(deployer);
                const tx = await nftMarketplace.withdrawProceeds();
                const txReceipt = await tx.wait(1);
                const { gasUsed, effectiveGasPrice } = txReceipt;
                const gasCost = gasUsed.mul(effectiveGasPrice);
                const newBalance =await ethers.provider.getBalance(deployer);
                assert(newBalance.add(gasCost).toString() == balance.add(proceeds).toString());
            });
            
            it("07 it prevents someone with 0 proceeds from calling the withdraw function", async function () {
                let playerAddress = await player.getAddress(); /*player is a getSigners object*/
                const playerConnectedNftMarketplace = nftMarketplace.connect(player);
                let balance = await playerConnectedNftMarketplace.getProceeds(playerAddress);
                console.log(`Player address ${playerAddress} has a balance of ${balance.toString()}`); /*demonstrate this has a 0 balance*/
                let error = `'NftMarketPlace__NoProceeds()'`;
                await expect( playerConnectedNftMarketplace.withdrawProceeds()).
                        to.be.revertedWith(error)
                    ;         
                assert(balance.toString() == "0");
            });



        });


    }); // conclude unit tests