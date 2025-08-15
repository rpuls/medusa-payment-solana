const bip39 = require('bip39');

const mnemonic = bip39.generateMnemonic(); // Generates a 12-word phrase
console.log('Your mnemonic seed phrase:', mnemonic);