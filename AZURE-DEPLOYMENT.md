# Deploying Movie Collection to Azure App Service

## Prerequisites

- Azure account (https://azure.microsoft.com)
- Azure CLI installed (https://docs.microsoft.com/en-us/cli/azure/install-azure-cli)
- Git installed

## Option 1: Deploy via Azure Portal + GitHub

### Step 1: Push to GitHub

```bash
# Initialize git repo (if not already)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit"

# Create repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/movie-collection.git
git push -u origin main
```

### Step 2: Create Azure App Service

1. Go to https://portal.azure.com
2. Click **Create a resource** → **Web App**
3. Configure:
   - **Subscription:** Your subscription
   - **Resource Group:** Create new or use existing
   - **Name:** `movie-collection-app` (must be unique, becomes your-name.azurewebsites.net)
   - **Publish:** Code
   - **Runtime stack:** Node 18 LTS (or newer)
   - **Operating System:** Linux (recommended) or Windows
   - **Region:** Choose closest to you
   - **Pricing Plan:** Free F1 (for testing) or Basic B1 ($13/mo for production)

4. Click **Review + create** → **Create**

### Step 3: Configure Deployment

1. Go to your App Service in Azure Portal
2. Navigate to **Deployment Center**
3. Select **GitHub** as source
4. Authorize and select your repository
5. Select branch: `main`
6. Click **Save**

### Step 4: Configure Environment Variables

1. Go to **Configuration** → **Application settings**
2. Click **+ New application setting**
3. Add:
   - **Name:** `ANTHROPIC_API_KEY`
   - **Value:** Your API key
4. Click **Save** → **Continue**

### Step 5: Configure Startup (Linux only)

1. Go to **Configuration** → **General settings**
2. Set **Startup Command:** `npm start`
3. Click **Save**

---

## Option 2: Deploy via Azure CLI

### Step 1: Login to Azure

```bash
az login
```

### Step 2: Create Resource Group

```bash
az group create --name movie-collection-rg --location eastus
```

### Step 3: Create App Service Plan

```bash
# Free tier (F1)
az appservice plan create \
  --name movie-collection-plan \
  --resource-group movie-collection-rg \
  --sku F1 \
  --is-linux

# Or Basic tier (B1) for production - $13/mo
az appservice plan create \
  --name movie-collection-plan \
  --resource-group movie-collection-rg \
  --sku B1 \
  --is-linux
```

### Step 4: Create Web App

```bash
az webapp create \
  --name movie-collection-app \
  --resource-group movie-collection-rg \
  --plan movie-collection-plan \
  --runtime "NODE:18-lts"
```

### Step 5: Configure Environment Variables

```bash
az webapp config appsettings set \
  --name movie-collection-app \
  --resource-group movie-collection-rg \
  --settings ANTHROPIC_API_KEY="your-api-key-here"
```

### Step 6: Deploy Code

```bash
# From your project directory
az webapp up \
  --name movie-collection-app \
  --resource-group movie-collection-rg \
  --runtime "NODE:18-lts"
```

Or deploy from GitHub:

```bash
az webapp deployment source config \
  --name movie-collection-app \
  --resource-group movie-collection-rg \
  --repo-url https://github.com/YOUR_USERNAME/movie-collection \
  --branch main \
  --manual-integration
```

---

## Option 3: Deploy via VS Code

1. Install **Azure App Service** extension in VS Code
2. Sign in to Azure
3. Right-click on the project folder → **Deploy to Web App**
4. Follow prompts to create or select an App Service
5. Configure environment variables in Azure Portal

---

## Post-Deployment Configuration

### Enable Persistent Storage (Important!)

By default, Azure App Service has ephemeral storage. To persist your movie data:

1. Go to **Configuration** → **Path mappings**
2. Add a new **Azure Storage Mount**:
   - **Name:** `data`
   - **Storage Account:** Create or select one
   - **Storage Container:** Create a blob container
   - **Mount Path:** `/home/site/wwwroot/data`
3. Click **Save**

Alternatively, for Linux App Service, the `/home` directory is persistent by default.

### Configure Custom Domain (Optional)

1. Go to **Custom domains**
2. Click **+ Add custom domain**
3. Follow instructions to verify domain ownership
4. Add SSL certificate (free with App Service Managed Certificate)

---

## Pricing Tiers

| Tier | Cost | Features |
|------|------|----------|
| **F1 (Free)** | $0 | 60 min CPU/day, 1GB RAM, no custom domain |
| **B1 (Basic)** | ~$13/mo | Always on, custom domain, 1.75GB RAM |
| **S1 (Standard)** | ~$70/mo | Auto-scale, staging slots, backups |

**Recommendation:** Start with Free (F1) for testing, upgrade to Basic (B1) for regular use.

---

## Troubleshooting

### View Logs

```bash
az webapp log tail \
  --name movie-collection-app \
  --resource-group movie-collection-rg
```

Or in Portal: **App Service** → **Log stream**

### Common Issues

1. **App not starting:**
   - Check logs for errors
   - Verify Node.js version matches (18+)
   - Ensure `npm start` works locally

2. **API key not working:**
   - Verify environment variable is set correctly
   - Restart the app after changing settings

3. **Data not persisting:**
   - Configure persistent storage (see above)
   - Use Azure Blob Storage for production

4. **Photo upload failing:**
   - Check file size limits (default 30MB on Azure)
   - Increase limit in Configuration → General settings

### Increase Upload Size (if needed)

Add to **Configuration** → **Application settings**:
- `WEBSITE_MAX_UPLOAD_SIZE_MB` = `50`

---

## Files Created for Azure Deployment

- `web.config` - IIS configuration for Node.js (Windows hosting)
- `.deployment` - Azure deployment configuration
- `.gitignore` - Excludes sensitive files from Git
- `package.json` - Updated with Node.js engine specification

---

## Useful Links

- Azure App Service Docs: https://docs.microsoft.com/en-us/azure/app-service/
- Node.js on Azure: https://docs.microsoft.com/en-us/azure/app-service/quickstart-nodejs
- Azure CLI Reference: https://docs.microsoft.com/en-us/cli/azure/webapp
- Pricing Calculator: https://azure.microsoft.com/en-us/pricing/calculator/
