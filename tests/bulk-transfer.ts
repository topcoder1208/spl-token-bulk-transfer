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
const env = 'devnet';
const rpcUrl = web3.clusterApiUrl(env);

const rawdata = fs.readFileSync(keypair);
const keyData = JSON.parse(rawdata);
const walletKeyPair = web3.Keypair.fromSecretKey(new Uint8Array(keyData));

const connection = new web3.Connection(rpcUrl);

describe('bulk-transfer', () => {

  it('bulk transfer', async () => {
    const destAddres = [
      '9RnnWGWdjJbu7yCo8hstY71qnwu6TVoCKBGLkJnP3yc2',
      'FhdvNwrYMSxMXuYvAsvFVAu7gRUvBNvXzFqv1pfbJkbU',
      'EiLPoWsbPkS1T8rxRGhaS5kUY2cgjGMUof4Ugwz2zTLw'
    ];

    const amounts = [
      10,
      15,
      10000
    ];
    const tokenMintAddress = 'HSxwKQwxqafTSCvFRyEmi8S61PXLHBf3d7xWjkZ3hScP';
    const transactionObject = await bulkTransfer(tokenMintAddress, walletKeyPair, destAddres, connection, amounts)
  })
});
