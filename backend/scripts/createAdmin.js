#!/usr/bin/env node
/**
 * One-time admin account seeder.
 *
 * Usage:
 *   node scripts/createAdmin.js admin@example.com MySecurePassword123
 *
 * This is the ONLY way to create an account with role=admin.
 * Normal self-registration always assigns role=user.
 */
'use strict';
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const bcrypt  = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const { initDB, findUserByEmail, createUser } = require('../modules/database');

const [,, email, password] = process.argv;

if (!email || !password) {
  console.error('Usage: node scripts/createAdmin.js <email> <password>');
  process.exit(1);
}
if (password.length < 8) {
  console.error('Password must be at least 8 characters.');
  process.exit(1);
}

(async () => {
  await initDB();
  const normalised = email.trim().toLowerCase();
  const existing   = findUserByEmail(normalised);

  if (existing) {
    if (existing.role === 'admin') {
      console.log(`Admin account "${normalised}" already exists.`);
    } else {
      console.error(`Account "${normalised}" exists but has role="${existing.role}". Delete it first if you want to re-create it as admin.`);
    }
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  createUser({ id: uuidv4(), email: normalised, passwordHash, role: 'admin' });
  console.log(`✓ Admin account created: ${normalised}`);
  process.exit(0);
})();
