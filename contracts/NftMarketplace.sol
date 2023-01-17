// SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";


error NftMarketPlace__PriceMustBeAboveZero();
error NftMarketPlace__NotApprovedForMarketplace();
error NftMarketPlace__AlreadyListed(address nftAddress, uint256 tokenId);
error NftMarketPlace__NotListed(address nftAddress, uint256 tokenId);
error NftMarketPlace__NotOwner();
error NftMarketPlace_PriceNotMet(address nftAddress,uint256 tokenId,uint256 price);
error NftMarketPlace__NoProceeds();
error NftMarketPlace__TransferProceedsFailed();


/** @title An NFT Market Place Contract
 *  @author Sean Francis
 *  @notice Contract to host a platform to list NFTs to sell
 *  @dev This implements the Chainlink tools...
 * 
 */

contract NftMarketPlace is ReentrancyGuard {

    /*Type Declarations*/
    struct Listing{
        uint256 price;
        address seller;
    }

    /* State Variables */
    // NFT Contract address -> NFT TokenID -> Listing
    mapping(address => mapping(uint256 => Listing)) private s_listings;
    
    // Seller -> Amount Earned
    mapping(address => uint256) private s_proceeds;

    /*NFT Marketplace variables*/


    /* Events */

    event ItemListed( 
        address indexed seller, 
        address indexed nftAddress,
        uint256 indexed tokenId,
        uint256 price 
    );

    event ItemBought(
        address indexed buyer,
        address indexed nftAddress,
        uint256 tokenId,
        uint256 price
    );

    event ItemCanceled(
        address indexed seller,
        address indexed nftAddress,
        uint256 tokenId
    );

    /* Modifiers */

    modifier notListed(address nftAddress, uint256 tokenId, address owner) {
        Listing memory listing = s_listings[nftAddress][tokenId];
        if (listing.price >0){
            revert NftMarketPlace__AlreadyListed(nftAddress, tokenId);
        }

        _;
    }

    modifier isListed(address nftAddress, uint256 tokenId) {
        Listing memory listing = s_listings[nftAddress][tokenId];
        if (listing.price <=0){
            revert NftMarketPlace__NotListed(nftAddress, tokenId);
        }
        _;
    }

    modifier isOwner(address nftAddress,uint256 tokenId,address spender){
        IERC721 nft = IERC721(nftAddress);
        address owner = nft.ownerOf(tokenId);
        if (spender != owner){
            revert NftMarketPlace__NotOwner();
        }
        _;   
    }


    /* Functions */

    /**
     *  @notice Method for listing NFTs on the marketplace
     *  @param nftAddress: Address of the NFT contract 
     *  @param tokenId: Id of the NFT created on the contract of the address that calls function
     *  @param price: Price address wants to sell the NFT for in ETH
     *  @dev Function will give contract the ability to sell the NFT while the 
     *  users still retain their NFTs in their wallets
     */
    function listItem(
        address nftAddress, 
        uint256 tokenId, 
        uint256 price
        // accept payment in specific crypto, needs Chainlink Price feeds
        )
        external  // function type + modifiers
        notListed(nftAddress,tokenId,msg.sender)
        isOwner(nftAddress,tokenId,msg.sender){ 
        ////// Function begins------->


        if (price <= 0){
            revert NftMarketPlace__PriceMustBeAboveZero();
        }
        // 2 routes to architect the contract

        // 1. Send the NFT to the contract. Transfer -> Contract to "hold" the NFT
        // 2. Owners hold the NFT, but give marketplace approval to sell the NFT for them
        IERC721 nft = IERC721(nftAddress);
        if (nft.getApproved(tokenId) != address(this)){
            revert NftMarketPlace__NotApprovedForMarketplace();
        }
        s_listings[nftAddress][tokenId] = Listing(price, msg.sender);
        
        emit ItemListed(msg.sender,nftAddress, tokenId, price);
    }

    function buyItem(address nftAddress, uint256 tokenId) 
        external /* No need for calls from within the contract */
        payable
        nonReentrant     
        isListed(nftAddress,tokenId){
        ////// Function begins------->
        
        
        Listing memory listedItem = s_listings[nftAddress][tokenId];
        if(msg.value < listedItem.price)
        {revert NftMarketPlace_PriceNotMet(nftAddress, tokenId, msg.value);}
        
        // Why you don't just send money to the seller outright
        // https://fravoll.github.io/solidity-patterns/pull_over_push.html
        // shift the risk to the seller

        // best practice:
        // Change state of contract BEFORE calling external contract

        s_proceeds[listedItem.seller] += msg.value;
        delete(s_listings[nftAddress][tokenId]); /*delete an entry from a mapping*/
        IERC721(nftAddress).safeTransferFrom(listedItem.seller,msg.sender,tokenId);

        emit ItemBought(msg.sender, nftAddress, tokenId, listedItem.price);

    }

    function cancelListing( address nftAddress, uint256 tokenId) 
        external
        isOwner(nftAddress, tokenId, msg.sender)
        isListed(nftAddress, tokenId){
        ////// Function begins------->
        
        delete(s_listings[nftAddress][tokenId]);
        emit ItemCanceled(msg.sender, nftAddress, tokenId);
    }
    

    function updateListing(address nftAddress, uint256 tokenId, uint256 newPrice)
        external
        isListed(nftAddress, tokenId)
        isOwner(nftAddress, tokenId, msg.sender){
        ////// Function begins------->

        
        s_listings[nftAddress][tokenId].price = newPrice;
        emit ItemListed(msg.sender,nftAddress, tokenId, newPrice);

    }

    function withdrawProceeds() external {
        ////// Function begins------->

        
        uint256 proceeds = s_proceeds[msg.sender];
        if(proceeds <=0){
            revert NftMarketPlace__NoProceeds();
        }
        s_proceeds[msg.sender] = 0;
        (bool success,) = payable(msg.sender).call{value: proceeds}("");
        if(!success){
            revert NftMarketPlace__TransferProceedsFailed();
        }
    }

    /* View/Pure Functions */

    function getProceeds(address seller) 
        external
        view /* reads a state variable */ 
        returns(uint256){
        ////// Function begins------->



        // don't want to doxx address, but we're on a blockchain
        // no point in making it only msg.sender
        return s_proceeds[seller];
    }

    function getListing(address nftAddress, uint256 tokenId)
        external
        view
        returns(Listing memory){
        ////// Function begins------->


        return s_listings[nftAddress][tokenId];
    }

}