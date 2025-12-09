#!/usr/bin/env node

/**
 * Generate Cryptographic Keys and Secrets
 *
 * One-shot script per generare chiavi RSA, JWT secrets, API keys
 * per development/test/production environments.
 *
 * Usage:
 *   npm run keys:generate           # Interactive mode
 *   npm run keys:generate -- --type=rsa --bits=2048
 *   npm run keys:generate -- --type=jwt-secret
 *   npm run keys:generate -- --type=api-key
 *   npm run keys:generate -- --env=production --all
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class KeyGenerator {
  constructor(options = {}) {
    this.env = options.env || 'development';
    this.outputDir = options.outputDir || path.join(__dirname, '../.keys');
    this.verbose = options.verbose || false;
  }

  /**
   * Generate RSA key pair for JWT signing
   */
  generateRSAKeyPair(bits = 2048) {
    this.log(`🔐 Generating RSA-${bits} key pair...`);

    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: bits,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
      },
    });

    const timestamp = new Date().toISOString().split('T')[0];
    const basename = `rsa-${bits}-${this.env}-${timestamp}`;

    // Save to files
    this.ensureOutputDir();
    const privateKeyPath = path.join(this.outputDir, `${basename}.key`);
    const publicKeyPath = path.join(this.outputDir, `${basename}.pub`);

    fs.writeFileSync(privateKeyPath, privateKey, { mode: 0o600 });
    fs.writeFileSync(publicKeyPath, publicKey, { mode: 0o644 });

    this.log(`✅ RSA key pair generated:`);
    this.log(`   Private: ${privateKeyPath}`);
    this.log(`   Public:  ${publicKeyPath}`);

    // Print for .env
    console.log('\n📋 Add to .env file:\n');
    console.log(`# JWT Signing Keys (${this.env})`);
    console.log(`JWT_PRIVATE_KEY_PATH=${privateKeyPath}`);
    console.log(`JWT_PUBLIC_KEY_PATH=${publicKeyPath}`);

    // Print base64-encoded (for env vars)
    console.log('\n# Or inline (base64-encoded):\n');
    console.log(
      `JWT_PRIVATE_KEY="${Buffer.from(privateKey).toString('base64')}"`,
    );
    console.log(
      `JWT_PUBLIC_KEY="${Buffer.from(publicKey).toString('base64')}"`,
    );

    return { privateKey, publicKey, privateKeyPath, publicKeyPath };
  }

  /**
   * Generate JWT secret (symmetric HMAC)
   */
  generateJWTSecret(bytes = 64) {
    this.log(`🔐 Generating JWT secret (${bytes} bytes)...`);

    const secret = crypto.randomBytes(bytes).toString('base64url');

    this.log(`✅ JWT secret generated (${secret.length} chars)`);

    console.log('\n📋 Add to .env file:\n');
    console.log(`# JWT Secret (HMAC-SHA256) - ${this.env}`);
    console.log(`JWT_SECRET="${secret}"`);

    // Also save to file
    this.ensureOutputDir();
    const secretPath = path.join(
      this.outputDir,
      `jwt-secret-${this.env}-${Date.now()}.txt`,
    );
    fs.writeFileSync(secretPath, secret, { mode: 0o600 });
    this.log(`   Saved: ${secretPath}`);

    return secret;
  }

  /**
   * Generate API key (for service-to-service auth)
   */
  generateAPIKey(prefix = 'sk') {
    this.log('🔐 Generating API key...');

    // Format: prefix_env_random (e.g., sk_prod_abc123...)
    const random = crypto.randomBytes(32).toString('base64url');
    const apiKey = `${prefix}_${this.env}_${random}`;

    this.log(`✅ API key generated (${apiKey.length} chars)`);

    console.log('\n📋 Add to .env file:\n');
    console.log(`# API Key - ${this.env}`);
    console.log(`API_KEY="${apiKey}"`);

    // Save to file
    this.ensureOutputDir();
    const keyPath = path.join(
      this.outputDir,
      `api-key-${this.env}-${Date.now()}.txt`,
    );
    fs.writeFileSync(keyPath, apiKey, { mode: 0o600 });
    this.log(`   Saved: ${keyPath}`);

    return apiKey;
  }

  /**
   * Generate session secret for cookie signing
   */
  generateSessionSecret(bytes = 64) {
    this.log(`🔐 Generating session secret (${bytes} bytes)...`);

    const secret = crypto.randomBytes(bytes).toString('hex');

    this.log(`✅ Session secret generated`);

    console.log('\n📋 Add to .env file:\n');
    console.log(`# Session Secret (cookie signing) - ${this.env}`);
    console.log(`SESSION_SECRET="${secret}"`);

    return secret;
  }

  /**
   * Generate Keycloak client secret
   */
  generateKeycloakClientSecret() {
    this.log('🔐 Generating Keycloak client secret...');

    // Keycloak format: UUID-like
    const secret = crypto.randomUUID();

    this.log('✅ Keycloak client secret generated');

    console.log('\n📋 Add to .env file:\n');
    console.log(`# Keycloak Client Secret - ${this.env}`);
    console.log(`KEYCLOAK_CLIENT_SECRET="${secret}"`);

    console.log('\n⚠️  Also configure in Keycloak Admin Console:');
    console.log('   1. Go to realm > Clients > [your-client]');
    console.log('   2. Credentials tab');
    console.log(`   3. Set Client Secret: ${secret}`);

    return secret;
  }

  /**
   * Generate all keys for an environment
   */
  generateAll() {
    console.log(`\n🔑 Generating all keys for environment: ${this.env}\n`);
    console.log('='.repeat(60));

    this.generateRSAKeyPair(2048);
    console.log('\n' + '='.repeat(60));

    this.generateJWTSecret();
    console.log('\n' + '='.repeat(60));

    this.generateAPIKey();
    console.log('\n' + '='.repeat(60));

    this.generateSessionSecret();
    console.log('\n' + '='.repeat(60));

    this.generateKeycloakClientSecret();
    console.log('\n' + '='.repeat(60));

    console.log('\n✅ All keys generated!');
    console.log(`\n📁 Keys saved to: ${this.outputDir}`);
    console.log('\n⚠️  Security reminders:');
    console.log('   - Add .keys/ to .gitignore');
    console.log('   - Never commit secrets to git');
    console.log('   - Use different keys per environment');
    console.log('   - Rotate keys every 90 days');
  }

  /**
   * Ensure output directory exists
   */
  ensureOutputDir() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true, mode: 0o700 });
      this.log(`📁 Created directory: ${this.outputDir}`);
    }
  }

  /**
   * Log with verbose control
   */
  log(message) {
    if (this.verbose || message.startsWith('✅') || message.startsWith('📋')) {
      console.log(message);
    }
  }
}

// CLI
const args = process.argv.slice(2);

// Parse arguments
const options = {
  type: null,
  env: 'development',
  bits: 2048,
  bytes: 64,
  verbose: false,
  all: false,
};

args.forEach(arg => {
  if (arg.startsWith('--type=')) options.type = arg.split('=')[1];
  if (arg.startsWith('--env=')) options.env = arg.split('=')[1];
  if (arg.startsWith('--bits=')) options.bits = parseInt(arg.split('=')[1]);
  if (arg.startsWith('--bytes=')) options.bytes = parseInt(arg.split('=')[1]);
  if (arg === '--verbose' || arg === '-v') options.verbose = true;
  if (arg === '--all') options.all = true;
});

const generator = new KeyGenerator({
  env: options.env,
  verbose: options.verbose,
});

// Execute based on type
if (options.all) {
  generator.generateAll();
} else if (options.type === 'rsa') {
  generator.generateRSAKeyPair(options.bits);
} else if (options.type === 'jwt-secret') {
  generator.generateJWTSecret(options.bytes);
} else if (options.type === 'api-key') {
  generator.generateAPIKey();
} else if (options.type === 'session-secret') {
  generator.generateSessionSecret(options.bytes);
} else if (options.type === 'keycloak-secret') {
  generator.generateKeycloakClientSecret();
} else {
  // Interactive mode
  console.log('🔑 Key Generator - Interactive Mode\n');
  console.log('Available key types:');
  console.log('  1. RSA key pair (JWT signing)');
  console.log('  2. JWT secret (HMAC)');
  console.log('  3. API key (service auth)');
  console.log('  4. Session secret (cookie)');
  console.log('  5. Keycloak client secret');
  console.log('  6. All of the above\n');

  console.log('Usage examples:');
  console.log('  npm run keys:generate -- --type=rsa --env=production');
  console.log('  npm run keys:generate -- --type=jwt-secret');
  console.log('  npm run keys:generate -- --all --env=production');
  console.log('\nRun with --help for more options');
}
