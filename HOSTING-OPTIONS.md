# Hosting Options for Movie Collection App

## Free Tier Options

### Railway
- **URL:** https://railway.app
- **Free tier:** 500 hours/month, $5 credit
- **Pros:** Easy Git deploy, persistent disk available, good DX
- **Cons:** Requires credit card, limited free tier hours

### Render
- **URL:** https://render.com
- **Free tier:** Free web services
- **Pros:** Simple Git deploy, free SSL, auto-deploy from GitHub
- **Cons:** Spins down after 15 min inactivity (slow cold starts), no persistent storage on free tier

### Fly.io
- **URL:** https://fly.io
- **Free tier:** 3 shared-cpu VMs, 1GB persistent volumes
- **Pros:** Persistent volumes available on free tier, global edge deployment
- **Cons:** CLI-based setup, more complex configuration

### Glitch
- **URL:** https://glitch.com
- **Free tier:** Free hosting with limitations
- **Pros:** Instant deploy, in-browser code editing, good for prototypes
- **Cons:** Sleeps after 5 min inactivity, 200MB storage limit, slow wake-up

### Cyclic
- **URL:** https://cyclic.sh
- **Free tier:** 100,000 requests/month
- **Pros:** No cold starts, simple deploy
- **Cons:** Serverless (ephemeral filesystem), would need database for storage

---

## Low Cost Options ($4-7/month)

### DigitalOcean Droplet
- **URL:** https://www.digitalocean.com
- **Cost:** $4/month (basic droplet)
- **Pros:** Full control, persistent storage, runs 24/7, SSH access, no code changes needed
- **Cons:** Requires server management (updates, security)

### Render Starter
- **URL:** https://render.com/pricing
- **Cost:** $7/month
- **Pros:** Persistent disk, no sleep, easy Git deploy
- **Cons:** Slightly more expensive than VPS

### Railway Pro
- **URL:** https://railway.app/pricing
- **Cost:** $5/month + usage
- **Pros:** Persistent storage, easy deploy, good developer experience
- **Cons:** Usage-based pricing can add up

### Linode (Akamai)
- **URL:** https://www.linode.com
- **Cost:** $5/month (Nanode)
- **Pros:** Reliable VPS, good performance, full control
- **Cons:** Requires server management

### Vultr
- **URL:** https://www.vultr.com
- **Cost:** $5/month (basic)
- **Pros:** Many locations, good performance, full control
- **Cons:** Requires server management

---

## Important Consideration: File Storage

This app uses JSON file storage (`data/movies.json`). On most **free tier platforms**, the filesystem is ephemeral - data is lost on redeploy/restart.

### Solutions:

1. **Use a VPS** (DigitalOcean, Linode, Vultr) - $4-6/mo
   - Full filesystem control
   - No code changes needed
   - Your exact setup works as-is

2. **Use Fly.io with persistent volumes** (Free)
   - Mount a volume at `/data`
   - Data persists across deploys

3. **Switch to a database** (Free tiers available)
   - **Supabase:** https://supabase.com (PostgreSQL, 500MB free)
   - **Turso:** https://turso.tech (SQLite edge, 9GB free)
   - **PlanetScale:** https://planetscale.com (MySQL, 5GB free)
   - **MongoDB Atlas:** https://www.mongodb.com/atlas (512MB free)
   - Requires code changes to replace JSON storage

---

## Recommendations

### Best Free Option
**Fly.io with persistent volume**
- Deploy with `fly launch`
- Add 1GB volume mounted at `/data`
- Keeps your data, runs continuously

### Best Low-Cost Option
**DigitalOcean Droplet ($4/mo)**
- Full control via SSH
- No code changes needed
- Reliable, runs 24/7
- Easy to set up with their Node.js marketplace image

### Best for Zero Maintenance
**Railway or Render (paid tier, ~$5-7/mo)**
- Git push to deploy
- Automatic SSL
- No server management
