'use strict';
/**
 * Blockchain Integrity Module
 *
 * Simulates a Hyperledger Fabric transaction.
 * The SHA-256 hash is used to generate the txId (HMAC) so the ledger
 * commits to the integrity value cryptographically, but the plaintext
 * hash is never written to any log.
 */
const crypto = require('crypto');
const { insertBlockchainRecord } = require('./database');

const CHANNEL = process.env.BLOCKCHAIN_CHANNEL || 'secure-storage-channel';
const NETWORK = process.env.BLOCKCHAIN_NETWORK || 'fabric-dev';

let _blockCounter = 18_200_000 + Math.floor(Math.random() * 5000);

function generateTxId(fileId, hash) {
  // HMAC binds the hash to the txId without exposing the hash itself
  return crypto
    .createHmac('sha256', fileId)
    .update(hash + Date.now())
    .digest('hex');
}

async function anchorToBlockchain(payload) {
  const { recordId, fileId, hash, owner, fileName, uploadTime } = payload;

  await new Promise(r => setTimeout(r, 80 + Math.random() * 120));

  const txId        = generateTxId(fileId, hash);
  const blockNumber = ++_blockCounter;

  insertBlockchainRecord({
    id:            recordId,
    fileId,
    txId,
    blockNumber,
    confirmations: 1,
    txStatus:      'Confirmed',
    channel:       CHANNEL,
    createdAt:     new Date().toISOString(),
  });

  // Log operational metadata only – hash value is intentionally omitted
  console.log(`[BLOCKCHAIN] TX anchored`);
  console.log(`  txId       : ${txId}`);
  console.log(`  block      : ${blockNumber}`);
  console.log(`  channel    : ${CHANNEL}`);
  console.log(`  owner      : ${owner}`);
  console.log(`  file       : ${fileName}`);
  // NOTE: hash is not logged here

  return {
    txId,
    blockNumber,
    txStatus:      'Confirmed',
    confirmations: 1,
    channel:       CHANNEL,
    network:       NETWORK,
  };
}

module.exports = { anchorToBlockchain };
