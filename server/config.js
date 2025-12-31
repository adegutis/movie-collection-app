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

    azureSecrets = secrets;
    console.log('Loaded secrets from Azure Key Vault');
    return azureSecrets;
  } catch (error) {
    console.warn('Azure Key Vault not available, falling back to environment variables:', error.message);
    azureSecrets = {};
    return azureSecrets;
  }
}

// Synchronous config for immediate use (uses env vars)
// For Azure deployment, call initializeConfig() at startup
const config = {
  port: process.env.PORT || 3000,
  dataDir: path.join(__dirname, '..', 'data'),
  sourcesDir: path.join(__dirname, '..', 'sources'),
  processedDir: path.join(__dirname, '..', 'sources', 'processed'),
  maxBackups: 10,
  // Default to env vars, will be overwritten by Azure Key Vault if available
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  appPassword: process.env.APP_PASSWORD
};

// Initialize config with Azure Key Vault secrets (call at app startup)
async function initializeConfig() {
  const secrets = await getAzureSecrets();

  // Override with Azure Key Vault secrets if available
  if (secrets.anthropicApiKey) {
    config.anthropicApiKey = secrets.anthropicApiKey;
  }
  if (secrets.appPassword) {
    config.appPassword = secrets.appPassword;
  }

  return config;
}

module.exports = config;
module.exports.initializeConfig = initializeConfig;
