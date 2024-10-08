use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    pubkey::Pubkey,
    system_instruction,
    program::invoke,
    program_error::ProgramError,
    program_pack::IsInitialized,
};

// Define the escrow state
#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct EscrowState {
    pub buyer_pubkey: Pubkey,
    pub seller_pubkey: Pubkey,
    pub amount: u64,
    pub buyer_approved: bool,
    pub seller_approved: bool,
}

// Ensure EscrowState is initialized properly
impl EscrowState {
    pub fn is_initialized(&self) -> bool {
        self.amount > 0
    }
}

// Entry point of the program
entrypoint!(process_instruction);

fn process_instruction(
    _program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let accounts_iter = &mut accounts.iter();

    // Get the escrow account
    let escrow_account = next_account_info(accounts_iter)?;

    // Get the buyer and seller
    let buyer_account = next_account_info(accounts_iter)?;
    let seller_account = next_account_info(accounts_iter)?;

    // Parse the instruction data to determine if it's buyer or seller approval
    let is_buyer_approval = instruction_data[0] == 1;

    // Check if escrow account is already initialized
    if escrow_account.data_is_empty() {
        // Initialize the escrow state if it's not yet set
        let escrow_state = EscrowState {
            buyer_pubkey: *buyer_account.key,
            seller_pubkey: *seller_account.key,
            amount: u64::from_le_bytes(instruction_data[1..9].try_into().unwrap()), // Extract the amount from instruction_data
            buyer_approved: false,
            seller_approved: false,
        };

        // Serialize and save the escrow state into the account data
        escrow_state.serialize(&mut &mut escrow_account.data.borrow_mut()[..])?;
        msg!("Escrow account initialized");
        return Ok(());
    }

    // Deserialize the existing escrow state
    let mut escrow_state = EscrowState::try_from_slice(&escrow_account.data.borrow())?;

    if !escrow_state.is_initialized() {
        return Err(ProgramError::UninitializedAccount);
    }

    // Handle buyer or seller approval
    if is_buyer_approval {
        msg!("Buyer approves the transaction");
        escrow_state.buyer_approved = true;
    } else {
        msg!("Seller approves the transaction");
        escrow_state.seller_approved = true;
    }

    // Write the updated state back to the escrow account
    escrow_state.serialize(&mut &mut escrow_account.data.borrow_mut()[..])?;

    // Check if both buyer and seller have approved
    if escrow_state.buyer_approved && escrow_state.seller_approved {
        msg!("Both buyer and seller have approved. Transferring funds...");

        // Transfer the funds from escrow to the seller
        let transfer_instruction = system_instruction::transfer(
            &escrow_account.key,
            &seller_account.key,
            escrow_state.amount,
        );

        invoke(
            &transfer_instruction,
            &[
                escrow_account.clone(),
                seller_account.clone(),
                buyer_account.clone(),
            ],
        )?;

        msg!("Funds transferred to seller");
    }

    Ok(())
}
