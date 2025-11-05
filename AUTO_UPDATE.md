# 🤖 Automatic Content Updates

This addon has **automatic content updates** configured via GitHub Actions.

## 📅 Automatic Daily Updates

**Schedule:** Every day at 3 AM UTC (4 AM CET)

**What it does:**
1. Downloads latest content from BauBau API (file1-file6)
2. Checks if any new content is available
3. If new content found:
   - Processes XML files with Cinemeta enrichment
   - Updates `data/baubau-content.json`
   - Commits changes to GitHub
   - Triggers automatic Heroku deployment

**Workflow file:** `.github/workflows/update-content.yml`

## 🔧 Manual Update Trigger

You can manually trigger an update anytime:

1. Go to: https://github.com/ZeroQ-Cool/Balkan-On-Demand/actions
2. Click "Manual Content Update"
3. Click "Run workflow"
4. Choose "Force update" option if needed

**Workflow file:** `.github/workflows/manual-update.yml`

## 📊 How It Works

```
┌─────────────────────┐
│  GitHub Actions     │
│  (Scheduled: 3 AM)  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Download XML       │
│  from BauBau API    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Check for Changes  │
└──────────┬──────────┘
           │
     Yes   │   No
    ┌──────┴──────┐
    ▼             ▼
┌────────┐   ┌────────┐
│Process │   │  Skip  │
│Import  │   │ Update │
└───┬────┘   └────────┘
    │
    ▼
┌─────────────────────┐
│  Enrich Metadata    │
│  (Cinemeta API)     │
└──────────┬──────────┘
    │
    ▼
┌─────────────────────┐
│  Update Database    │
│  baubau-content.json│
└──────────┬──────────┘
    │
    ▼
┌─────────────────────┐
│  Git Commit & Push  │
└──────────┬──────────┘
    │
    ▼
┌─────────────────────┐
│  Heroku Auto-Deploy │
│  (if connected)     │
└─────────────────────┘
```

## 🚀 Heroku Auto-Deployment

### Option 1: GitHub Integration (Recommended)

1. Go to Heroku Dashboard
2. Open your app: `balkan-on-demand-828b9dd653f6`
3. Go to "Deploy" tab
4. Connect to GitHub repository
5. Enable "Automatic deploys" from `main` branch

**Result:** Every time GitHub Actions commits new content, Heroku automatically deploys!

### Option 2: Heroku Git Remote

If you prefer direct Git deployment:

```bash
# Add Heroku remote (one time)
heroku git:remote -a balkan-on-demand-828b9dd653f6

# GitHub Actions will push to Heroku automatically
```

## 📋 Viewing Update Logs

### GitHub Actions Logs:
1. Go to: https://github.com/ZeroQ-Cool/Balkan-On-Demand/actions
2. Click on any workflow run
3. View detailed logs

### What Gets Updated:
- ✅ All XML files from BauBau API
- ✅ Database with new movies/series
- ✅ TMDB metadata (98% coverage)
- ✅ Cinemeta enrichment for missing titles

## 🔔 Notifications

GitHub Actions will:
- ✅ Show success/failure in Actions tab
- ✅ Create commit with update statistics
- ✅ Email you if workflow fails (GitHub settings)

## ⚙️ Configuration

### Change Update Frequency

Edit `.github/workflows/update-content.yml`:

```yaml
on:
  schedule:
    # Daily at 3 AM UTC
    - cron: '0 3 * * *'
    
    # Every 12 hours
    # - cron: '0 */12 * * *'
    
    # Every Monday at 2 AM
    # - cron: '0 2 * * 1'
```

### Disable Auto-Updates

1. Go to: https://github.com/ZeroQ-Cool/Balkan-On-Demand/actions
2. Click on "Update BauBau Content"
3. Click "..." → "Disable workflow"

## 🐛 Troubleshooting

### Updates Not Running?

1. Check GitHub Actions tab for errors
2. Verify cron schedule is active
3. Check BauBau API is accessible

### No New Content Detected?

- Normal! If BauBau hasn't added content, workflow skips update
- Check workflow logs: "ℹ️ No new content detected"

### Force Update Anyway?

Use "Manual Content Update" workflow with "Force update: true"

## 📈 Statistics

Each update commit includes:
- 📊 Total movies count
- 📊 Total series count
- 📅 Update timestamp
- 🤖 Automated commit message

Example commit:
```
🤖 Auto-update: New content - 2025-11-07

📊 Updated Stats:
• Movies: 3,810
• Series: 38

Triggered by: GitHub Actions (daily update)
```

## 🎯 Benefits

✅ **Always fresh content** - Never miss new releases  
✅ **Zero maintenance** - Fully automated  
✅ **Smart updates** - Only updates when needed  
✅ **Metadata enriched** - Cinemeta integration  
✅ **Version controlled** - All changes tracked  
✅ **Auto-deployed** - Heroku deploys automatically  

## 📝 Notes

- Updates only run if new content is detected
- GitHub Actions has 2,000 free minutes/month
- Each update takes ~2-3 minutes
- Heroku auto-deploys within 1-2 minutes after commit

---

**Need help?** Check the workflow logs in the Actions tab!
