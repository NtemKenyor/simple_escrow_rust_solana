const fs = require('fs');
const web3 = require('@solana/web3.js');
const borsh = require('borsh');
const { sendAndConfirmTransaction } = require('@solana/web3.js');

// Load Escrow account keypair from the keypair JSON file
const escrowKeypair = web3.Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync('../escrow-keypair.json', 'utf8')))
);

// Load seller and buyer keypairs
const sellerKeypair = web3.Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync('../seller-keypair.json', 'utf8')))
);

const buyerKeypair = web3.Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync('../buyer-keypair.json', 'utf8')))
);

// Escrow program ID (replace with your actual program ID)
const ESCROW_PROGRAM_ID = new web3.PublicKey('DMbxL8mpZHomRpmYLQLCKMmtQavXaBeb3y91cXKi75Bv');
const ESCROW_ACCOUNT = escrowKeypair.publicKey;

// Define the schema for serialization/deserialization using Borsh
class EscrowState {
  constructor({ buyer_pubkey, seller_pubkey, amount, buyer_approved, seller_approved }) {
    this.buyer_pubkey = new web3.PublicKey(buyer_pubkey);
    this.seller_pubkey = new web3.PublicKey(seller_pubkey);
    this.amount = amount;
    this.buyer_approved = buyer_approved;
    this.seller_approved = seller_approved;
  }
}

const ESCROW_STATE_SCHEMA = new Map([
  [EscrowState, {
    kind: 'struct',
    fields: [
      ['buyer_pubkey', [32]],
      ['seller_pubkey', [32]],
      ['amount', 'u64'],
      ['buyer_approved', 'u8'],
      ['seller_approved', 'u8']
    ]
  }]
]);

// Initialize the connection to Solana network
const connection = new web3.Connection(web3.clusterApiUrl('devnet'), 'confirmed');

// Function to initialize the escrow
async function initializeEscrow(buyer, seller, amount) {
  // const payer = web3.Keypair.generate(); // The payer account to cover the transaction fees
  // const d_buyer = web3.Keypair.fromSecretKey(buyerKeypair);  // Use buyer's secret key
  const payer = buyerKeypair;  // The payer is the buyer


  // Instruction data: [1 for buyer approval, 8 bytes for amount]
  const instructionData = Buffer.alloc(9);
  instructionData.writeUInt8(1, 0); // Buyer approval byte
  instructionData.writeBigUInt64LE(BigInt(amount), 1); // Escrow amount (as u64)

  const transaction = new web3.Transaction().add(
    new web3.TransactionInstruction({
      keys: [
        { pubkey: ESCROW_ACCOUNT, isSigner: true, isWritable: true }, // Escrow account
        { pubkey: buyer, isSigner: true, isWritable: false }, // Buyer account
        { pubkey: seller, isSigner: false, isWritable: false }, // Seller account
      ],
      programId: ESCROW_PROGRAM_ID,
      data: instructionData, // Instruction data
    })
  );

  try {
    // Use sendAndConfirmTransaction to send the transaction
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [payer, escrowKeypair]
    );
    console.log(`Escrow initialized with signature: ${signature}`);
  } catch (error) {
    console.error("Error during escrow process:", error);
    if (error.logs) {
      console.error("Transaction logs:", error.logs);
    }
  }
}

// Rest of the code remains the same...
/* 


const fs = require('fs');
const web3 = require('@solana/web3.js');
const borsh = require('borsh');

// Load Escrow account keypair from the keypair JSON file
const escrowKeypair = web3.Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync('../escrow-keypair.json', 'utf8')))
);

// Load seller and buyer keypairs
const sellerKeypair = web3.Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync('../seller-keypair.json', 'utf8')))
);

const buyerKeypair = web3.Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync('../buyer-keypair.json', 'utf8')))
);

// Escrow program ID (replace with your actual program ID)
const ESCROW_PROGRAM_ID = new web3.PublicKey('DMbxL8mpZHomRpmYLQLCKMmtQavXaBeb3y91cXKi75Bv');
const ESCROW_ACCOUNT = escrowKeypair.publicKey;

// Define the schema for serialization/deserialization using Borsh
class EscrowState {
  constructor({ buyer_pubkey, seller_pubkey, amount, buyer_approved, seller_approved }) {
    this.buyer_pubkey = new web3.PublicKey(buyer_pubkey);
    this.seller_pubkey = new web3.PublicKey(seller_pubkey);
    this.amount = amount;
    this.buyer_approved = buyer_approved;
    this.seller_approved = seller_approved;
  }
}

const ESCROW_STATE_SCHEMA = new Map([
  [EscrowState, {
    kind: 'struct',
    fields: [
      ['buyer_pubkey', [32]],
      ['seller_pubkey', [32]],
      ['amount', 'u64'],
      ['buyer_approved', 'u8'],
      ['seller_approved', 'u8']
    ]
  }]
]);

// Initialize the connection to Solana network
const connection = new web3.Connection(web3.clusterApiUrl('devnet'), 'confirmed');

// Function to initialize the escrow
async function initializeEscrow(buyer, seller, amount) {
    const payer = web3.Keypair.generate(); // The payer account to cover the transaction fees
  
    // Instruction data: [1 for buyer approval, 8 bytes for amount]
    const instructionData = Buffer.alloc(9);
    instructionData.writeUInt8(1, 0); // Buyer approval byte
    instructionData.writeBigUInt64LE(BigInt(amount), 1); // Escrow amount (as u64)
  
    const transaction = new web3.Transaction().add(
      new web3.TransactionInstruction({
        keys: [
          { pubkey: ESCROW_ACCOUNT, isSigner: true, isWritable: true }, // Escrow account
          { pubkey: buyer, isSigner: true, isWritable: false }, // Buyer account
          { pubkey: seller, isSigner: false, isWritable: false }, // Seller account
        ],
        programId: ESCROW_PROGRAM_ID,
        data: instructionData, // Instruction data
      })
    );
  
    // Add both the payer and buyer to the list of signers
    try {
        const signature = await sendAndConfirmTransaction(
            connection,
            transaction,
            [payer, escrowAccount]
        );
        console.log(`Escrow initialized with signature: ${signature}`);
    } catch (error) {
        console.error("Error during escrow process:", error);
        if (error.logs) {
            console.error("Transaction logs:", error.logs);
        }
    }
  
  } */
  

// Function for buyer or seller approval
async function approveEscrow(userAccount, isBuyerApproval) {
  // Fetch the latest state of the escrow
  const escrowAccountInfo = await connection.getAccountInfo(ESCROW_ACCOUNT);
  if (!escrowAccountInfo) {
    console.log('Escrow account not found');
    return;
  }

  // Deserialize the escrow state using Borsh
  const escrowState = borsh.deserialize(
    ESCROW_STATE_SCHEMA,
    EscrowState,
    escrowAccountInfo.data
  );

  console.log('Escrow state:', escrowState);

  // Prepare approval instruction data
  const instructionData = Buffer.from([isBuyerApproval ? 1 : 0]);

  const transaction = new web3.Transaction().add(
    new web3.TransactionInstruction({
      keys: [
        { pubkey: ESCROW_ACCOUNT, isSigner: false, isWritable: true }, // Escrow account
        { pubkey: userAccount.publicKey, isSigner: true, isWritable: false }, // Approver (buyer or seller)
      ],
      programId: ESCROW_PROGRAM_ID,
      data: instructionData,
    })
  );

  // Send the transaction to approve
  const signature = await web3.sendAndConfirmTransaction(
    connection,
    transaction,
    [userAccount]
  );

  console.log(`Escrow approved by ${isBuyerApproval ? 'buyer' : 'seller'} with signature: ${signature}`);
}

// Function to check the escrow state
async function getEscrowState() {
  const escrowAccountInfo = await connection.getAccountInfo(ESCROW_ACCOUNT);

  if (escrowAccountInfo === null) {
    console.log("Escrow account not found");
    return;
  }

  const escrowState = borsh.deserialize(
    ESCROW_STATE_SCHEMA,
    EscrowState,
    escrowAccountInfo.data
  );

  console.log('Escrow State:', escrowState);
}

// Example usage
(async () => {
  try {
    const amount = web3.LAMPORTS_PER_SOL; // 1 SOL in lamports (1 billion lamports = 1 SOL)

    // Initialize the escrow with 1 SOL
    await initializeEscrow(buyerKeypair.publicKey, sellerKeypair.publicKey, amount);

    // Buyer approves the escrow
    await approveEscrow(buyerKeypair, true);

    // Seller approves the escrow
    await approveEscrow(sellerKeypair, false);

    // Check the final escrow state
    await getEscrowState();
  } catch (error) {
    console.error("Error during escrow process:", error);
  }
})();
