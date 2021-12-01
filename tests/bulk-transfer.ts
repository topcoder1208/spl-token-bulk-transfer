import { Token, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { web3, Wallet } from "@project-serum/anchor";

const fs = require('fs');
const os = require('os')

async function bulkTransfer(tokenMintAddress: string, wallet: web.Keypair, to: string[], connection: web3.Connection, amounts: number[]) {
  const mintPublicKey = new web3.PublicKey(tokenMintAddress);    
  const mintToken = new Token(
    connection,
    mintPublicKey,
    TOKEN_PROGRAM_ID,
    wallet
  );
  
  const fromTokenAccount = await mintToken.getOrCreateAssociatedAccountInfo(
    wallet.publicKey
  );

  let instructions: web3.TransactionInstruction[] = [];  

  for(let i = 0;i < to.length;i ++) {
    const dest = to[i];
    const destPublicKey = new web3.PublicKey(dest);

    // const associatedDestinationTokenAccount = await mintToken.getOrCreateAssociatedAccountInfo(destPublicKey)
    const associatedDestinationTokenAddr = await Token.getAssociatedTokenAddress(
      mintToken.associatedProgramId,
      mintToken.programId,
      mintPublicKey,
      destPublicKey
    );

    const receiverAccount = await connection.getAccountInfo(associatedDestinationTokenAddr);

    if (receiverAccount === null) {
      instructions.push(
        Token.createAssociatedTokenAccountInstruction(
          mintToken.associatedProgramId,
          mintToken.programId,
          mintPublicKey,
          associatedDestinationTokenAddr,
          destPublicKey,
          wallet.publicKey
        )
      )
    }
    instructions.push(
      Token.createTransferInstruction(
        TOKEN_PROGRAM_ID,
        fromTokenAccount.address,
        associatedDestinationTokenAddr,
        wallet.publicKey,
        [],
        amounts[i] * web3.LAMPORTS_PER_SOL
      )
    );
    
  }

  const transaction = new web3.Transaction().add(...instructions);
  var signature = await web3.sendAndConfirmTransaction(
    connection,
    transaction,
    [wallet]
  );
  console.log("SIGNATURE", signature);
  console.log("SUCCESS");

  return transaction;
}

const keypair = os.homedir() + '/.config/solana/id.json';

// cluster can be became 'devnet' | 'testnet' | 'mainnet-beta'
const env = 'mainnet-beta';
const rpcUrl = web3.clusterApiUrl(env);

const rawdata = fs.readFileSync(keypair);
const keyData = JSON.parse(rawdata);
const walletKeyPair = web3.Keypair.fromSecretKey(new Uint8Array(keyData));

const connection = new web3.Connection(rpcUrl);

describe('bulk-transfer', () => {
  const tokenMintAddress = '6FzDRNrhR33hmBHf5kwtUr9MxvPFc9dqwEqyzX2CEad1';
  const dest1 = new web3.PublicKey('2hi2o31i9H9ejYh2SKUvocdzXTwy7DQs9X37sCehZbYE');
  // const dest2 = new web3.PublicKey('DGfd7WtGFNSfc7ay1Ydo8mXdgEFecEhvuHovtK1HyYmv');
  const dest3 = new web3.PublicKey('DGfd7WtGFNSfc7ay1Ydo8mXdgEFecEhvuHovtK1HyYmv');

  it('main wallet token balance', async () => {
    console.log(walletKeyPair.publicKey.toBase58())
    const mainWalletTokens = await connection.getTokenAccountsByOwner(walletKeyPair.publicKey, {mint: new web3.PublicKey(tokenMintAddress)});
    if(mainWalletTokens.value.length == 0)
    {
        console.log("Balance: 0");
    }
    else {
      const token = mainWalletTokens.value.pop();
      const balance = (await connection.getTokenAccountBalance(token.pubkey)).value.uiAmount;
      console.log("Main wallet Balance: ", balance);
    }
  })

  it('bulk transfer', async () => {
    const destAddres = [
      dest1.toBase58(),
      // dest2.toBase58(),
      dest3.toBase58()
    ];

    const amounts = [
      10,
      // 15,
      10000
    ];
    const transactionObject = await bulkTransfer(tokenMintAddress, walletKeyPair, destAddres, connection, amounts)

    const destTokens = await connection.getTokenAccountsByOwner(dest1, {mint: new web3.PublicKey(tokenMintAddress)});
    if(destTokens.value.length == 0)
    {
        console.log("Balance: 0");
    }
    else {
      const token = destTokens.value.pop();
      const balance = (await connection.getTokenAccountBalance(token.pubkey)).value.uiAmount;
      console.log("Balance: ", balance);
    }

    // const dest2Tokens = await connection.getTokenAccountsByOwner(dest2, {mint: new web3.PublicKey(tokenMintAddress)});
    // if(dest2Tokens.value.length == 0)
    // {
    //     console.log("Balance: 0");
    // }
    // else {
    //   const token = dest2Tokens.value.pop();
    //   const balance = (await connection.getTokenAccountBalance(token.pubkey)).value.uiAmount;
    //   console.log("Balance: ", balance);
    // }

    const dest3Tokens = await connection.getTokenAccountsByOwner(dest3, {mint: new web3.PublicKey(tokenMintAddress)});
    if(dest3Tokens.value.length == 0)
    {
        console.log("Balance: 0");
    }
    else {
      const token = dest3Tokens.value.pop();
      const balance = (await connection.getTokenAccountBalance(token.pubkey)).value.uiAmount;
      console.log("Balance: ", balance);
    }
  })
});
