const path = require('path');

// Azure Key Vault integration for production
// In Azure, set AZURE_KEY_VAULT_NAME environment variable
// Secrets will be fetched from the vault using Managed Identity
let azureSecrets = null;

async function getAzureSecrets() {
  if (azureSecrets !== null) {
    return azureSecrets;
  }

  const keyVaultName = process.env.AZURE_KEY_VAULT_NAME;

  if (!keyVaultName) {
    azureSecrets = {};
    return azureSecrets;
  }

  try {
    const { DefaultAzureCredential } = require('@azure/identity');
    const { SecretClient } = require('@azure/keyvault-secrets');

    const vaultUrl = `https://${keyVaultName}.vault.azure.net`;
    const credential = new DefaultAzureCredential();
    const client = new SecretClient(vaultUrl, credential);

    // Fetch secrets from Key Vault
    const secrets = {};

    try {
      const anthropicKeySecret = await client.getSecret('ANTHROPIC-API-KEY');
      secrets.anthropicApiKey = anthropicKeySecret.value;
    } catch (e) {
      console.warn('Could not fetch ANTHROPIC-API-KEY from Key Vault:', e.message);
    }

    try {
      const appPasswordSecret = await client.getSecret('APP-PASSWORD');
      secrets.appPassword = appPasswordSecret.value;
    } catch (e) {
      // APP-PASSWORD is optional
    }

    try {
      const tmdbKeySecret = await client.getSecret('TMDB-API-KEY');
      secrets.tmdbApiKey = tmdbKeySecret.value;
    } catch (e) {
      // TMDB-API-KEY is optional
    }

    azureSecrets = secrets;
    console.log('Loaded secrets from Azure Key Vault');
    return azureSecrets;
  } catch (error) {
    console.error('CRITICAL: Azure Key Vault connection failed:', error.message);
    console.error('Secrets will not be available. Check Managed Identity configuration.');
    azureSecrets = {};
    return azureSecrets;
  }
}

// Check if running on Azure
const isAzure = !!process.env.AZURE_KEY_VAULT_NAME;

// Synchronous config for immediate use
// Local dev: uses env vars
// Azure: secrets are undefined until initializeConfig() is called
const config = {
  port: process.env.PORT || 3000,
  dataDir: path.join(__dirname, '..', 'data'),
  sourcesDir: path.join(__dirname, '..', 'sources'),
  processedDir: path.join(__dirname, '..', 'sources', 'processed'),
  maxBackups: 10,
  // On Azure: secrets are loaded from Key Vault only (no env var fallback)
  // Local dev: use env vars
  anthropicApiKey: isAzure ? undefined : process.env.ANTHROPIC_API_KEY,
  appPassword: isAzure ? undefined : process.env.APP_PASSWORD,
  tmdbApiKey: isAzure ? undefined : process.env.TMDB_API_KEY
};

// Initialize config with Azure Key Vault secrets (call at app startup)
async function initializeConfig() {
  const secrets = await getAzureSecrets();

  // On Azure: ONLY use Key Vault secrets (no env var fallback for security)
  // Local dev: already loaded from env vars above
  if (isAzure) {
    config.anthropicApiKey = secrets.anthropicApiKey;
    config.appPassword = secrets.appPassword;
    config.tmdbApiKey = secrets.tmdbApiKey;

    // Log warning if required secrets are missing
    if (!config.anthropicApiKey) {
      console.warn('WARNING: ANTHROPIC-API-KEY not found in Azure Key Vault');
    }
  }

  return config;
}

module.exports = config;
module.exports.initializeConfig = initializeConfig;
