const fs = require('fs');
const web3 = require('@solana/web3.js');
const { SystemProgram, Keypair, TransactionInstruction } = require('@solana/web3.js');
const BN = require('bn.js');
const borsh = require('borsh');

// Constants
const ESCROW_ACCOUNT_SIZE = 32 + 32 + 8 + 1 + 1; // buyer_pubkey + seller_pubkey + amount + buyer_approved + seller_approved

// Define the schema for the escrow state
class EscrowState {
    constructor(fields = {}) {
        this.buyer_pubkey = fields.buyer_pubkey || new Uint8Array(32);
        this.seller_pubkey = fields.seller_pubkey || new Uint8Array(32);
        this.amount = fields.amount || 0;
        this.buyer_approved = fields.buyer_approved || false;
        this.seller_approved = fields.seller_approved || false;
    }
}

const EscrowStateSchema = new Map([
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

// Utility to get secret key from file
function getBuyerKeypair() {
    return Keypair.fromSecretKey(
        new Uint8Array(JSON.parse(fs.readFileSync('../buyer-keypair.json', 'utf8')))
    );
}

// Initialize the escrow process
async function initializeEscrow(connection, programId, payer, sellerPubkey, amount) {
    const escrowAccount = new Keypair();

    // Get rent exempt amount
    const accountRentExempt = await connection.getMinimumBalanceForRentExemption(ESCROW_ACCOUNT_SIZE);

    // Create the escrow account
    const createEscrowAccountIx = SystemProgram.createAccount({
        fromPubkey: payer.publicKey,
        newAccountPubkey: escrowAccount.publicKey,
        lamports: accountRentExempt,
        space: ESCROW_ACCOUNT_SIZE,
        programId: programId,
    });

    // Initialize the escrow state
    const instructionData = Buffer.alloc(9);
    instructionData.writeUInt8(1, 0); // Buyer approval flag
    new BN(amount).toArrayLike(Buffer, 'le', 8).copy(instructionData, 1); // Amount in lamports

    const initEscrowIx = new TransactionInstruction({
        keys: [
            { pubkey: escrowAccount.publicKey, isSigner: false, isWritable: true },
            { pubkey: payer.publicKey, isSigner: true, isWritable: false },
            { pubkey: sellerPubkey, isSigner: false, isWritable: false },
        ],
        programId: programId,
        data: instructionData,
    });

    // Create a transaction
    const transaction = new web3.Transaction().add(createEscrowAccountIx, initEscrowIx);

    // Send and confirm the transaction
    await web3.sendAndConfirmTransaction(connection, transaction, [payer, escrowAccount]);

    console.log(`Escrow account initialized: ${escrowAccount.publicKey.toBase58()}`);
    return escrowAccount.publicKey;
}

// Approve escrow (either buyer or seller)
async function approveEscrow(connection, programId, payer, escrowPubkey, isBuyer) {
    // Instruction data for approval (1 for buyer, 0 for seller)
    const instructionData = Buffer.alloc(1);
    instructionData.writeUInt8(isBuyer ? 1 : 0);

    // Approve transaction instruction
    const approveIx = new TransactionInstruction({
        keys: [
            { pubkey: escrowPubkey, isSigner: false, isWritable: true },
            { pubkey: payer.publicKey, isSigner: true, isWritable: false },
        ],
        programId: programId,
        data: instructionData,
    });

    // Create a transaction
    const transaction = new web3.Transaction().add(approveIx);

    // Send and confirm the transaction
    await web3.sendAndConfirmTransaction(connection, transaction, [payer]);

    console.log(`${isBuyer ? 'Buyer' : 'Seller'} approved the escrow.`);
}

// Load Escrow account keypair from the keypair JSON file
const escrowKeypair = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync('../escrow-keypair.json', 'utf8')))
);

// Load seller and buyer keypairs
const sellerKeypair = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync('../seller-keypair.json', 'utf8')))
);

const buyerKeypair = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync('../buyer-keypair.json', 'utf8')))
);

// Escrow program ID (replace with your actual program ID)
const ESCROW_PROGRAM_ID = new web3.PublicKey('DMbxL8mpZHomRpmYLQLCKMmtQavXaBeb3y91cXKi75Bv');

// Main execution function
(async () => {
    const connection = new web3.Connection(web3.clusterApiUrl('devnet'), 'confirmed');

    // Load the buyer keypair
    const payer = getBuyerKeypair();

    // Seller's public key
    const sellerPubkey = sellerKeypair.publicKey;

    // Program ID
    const programId = ESCROW_PROGRAM_ID;

    // Define the amount (in lamports)
    const amount = 1000000; // e.g., 1 SOL = 1 billion lamports

    // Initialize the escrow process
    const escrowPubkey = await initializeEscrow(connection, programId, payer, sellerPubkey, amount);

    // Approve escrow by the buyer
    await approveEscrow(connection, programId, payer, escrowPubkey, true);
})();
