// generate-keypair.js
const { Keypair } = require('@solana/web3.js');
const fs = require('fs');

// Generate new keypair
const keypair = Keypair.generate();

// Convert secret key to hex string
const secretKeyHex = Buffer.from(keypair.secretKey).toString('hex');

// Save to .env file
fs.appendFileSync('.env', `SOLANA_PRIVATE_KEY=${secretKeyHex}\n`);

console.log('Public Key:', keypair.publicKey.toBase58());
console.log('Private Key (hex) saved to .env');