const web3 = require('@solana/web3.js');
const borsh = require('borsh');

// solana program deploy dist/program/solana_escrow.so
// Program Id: DMbxL8mpZHomRpmYLQLCKMmtQavXaBeb3y91cXKi75Bv
// Constants (change to your program's actual values)
const ESCROW_PROGRAM_ID = new web3.PublicKey('Your_Escrow_Program_Id');
const ESCROW_ACCOUNT = new web3.PublicKey('Your_Escrow_Account_Id');

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
  const escrowAccount = web3.Keypair.generate(); // The escrow account

  // Instruction data: [1 for buyer approval, 8 bytes for amount]
  const instructionData = Buffer.alloc(9);
  instructionData.writeUInt8(1, 0); // Buyer approval byte
  instructionData.writeBigUInt64LE(BigInt(amount), 1); // Escrow amount (as u64)

  const transaction = new web3.Transaction().add(
    new web3.TransactionInstruction({
      keys: [
        { pubkey: escrowAccount.publicKey, isSigner: true, isWritable: true }, // Escrow account
        { pubkey: buyer, isSigner: true, isWritable: false }, // Buyer account
        { pubkey: seller, isSigner: false, isWritable: false }, // Seller account
      ],
      programId: ESCROW_PROGRAM_ID,
      data: instructionData, // Instruction data
    })
  );

  // Send the transaction to the network
  const signature = await web3.sendAndConfirmTransaction(
    connection,
    transaction,
    [payer, escrowAccount]
  );

  console.log(`Escrow initialized with signature: ${signature}`);
}

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
  // Generate two accounts: Buyer and Seller
  const buyer = web3.Keypair.generate();
  const seller = web3.Keypair.generate();

  // Initialize the escrow with 1 SOL
  await initializeEscrow(buyer.publicKey, seller.publicKey, web3.LAMPORTS_PER_SOL);

  // Buyer approves the escrow
  await approveEscrow(buyer, true);

  // Seller approves the escrow
  await approveEscrow(seller, false);

  // Check the final escrow state
  await getEscrowState();
})();
