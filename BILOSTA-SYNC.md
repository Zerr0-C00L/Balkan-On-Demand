# Bilosta Content Sync

Automated workflow to keep your Stremio addon database in sync with the Bilosta CDN server.

## Overview

The Bilosta sync system automatically discovers new content on the server and merges it with your existing database while preserving all manually added metadata (TMDB enrichment, descriptions, etc.).

## Features

✅ **Automatic Discovery** - Crawls Bilosta server to find all video files  
✅ **Smart Merging** - Adds new content while preserving existing metadata  
✅ **TMDB Enrichment** - Automatically fetches metadata for new items  
✅ **Scheduled Runs** - Daily automatic updates at 2 AM UTC  
✅ **Manual Triggers** - Run sync anytime from GitHub Actions  
✅ **Change Detection** - Only commits when new content is found  
✅ **Detailed Logs** - Full reports of what was added/updated  

## Files

### Scripts
- **`scripts/sync-bilosta-content.js`** - Main sync script that crawls server and merges content
- **`scripts/analyze-bilosta-structure.js`** - Analyzes server structure and generates reports

### GitHub Actions
- **`.github/workflows/sync-bilosta.yml`** - Automated sync workflow (runs daily)
- **`.github/workflows/update-content.yml`** - Legacy BauBau XML update (still active)

### Data Files
- **`data/baubau-content.json`** - Main content database
- **`data/bilosta/bilosta-all-urls.txt`** - Complete list of all server URLs
- **`data/bilosta-server-structure.json`** - Parsed folder structure
- **`data/BILOSTA-STRUCTURE.md`** - Human-readable structure report

## How It Works

### 1. Crawling Phase
The script recursively crawls the Bilosta server starting from the root URL:
```
https://content.bilosta.org/SERCRT721/
├── FILMOVI/
│   ├── exyu/
│   └── strani/
├── SERIJE/
├── CRTANI/
└── 4k/
```

It discovers all video files (`.mp4`, `.mkv`, `.avi`, etc.) and builds a complete inventory.

### 2. Merging Phase
For each discovered file:
- **If URL exists in database** → Skip (preserve existing metadata)
- **If URL is new** → Create basic entry with:
  - Auto-generated ID
  - Title extracted from filename
  - Stream URL and quality
  - Category based on folder path
  - `needsEnrichment: true` flag

### 3. Enrichment Phase (Optional)
New items are enriched with TMDB metadata:
- Movie title, year, poster
- Genres and cast
- Plot description
- IMDB/TMDB IDs

### 4. Save Phase
- Updates `baubau-content.json` with merged content
- Updates URL lists in `data/bilosta/`
- Commits changes to GitHub
- Triggers Heroku deployment

## Usage

### Automatic Updates
The workflow runs daily at **2 AM UTC (3 AM CET)** automatically.

### Manual Trigger

1. Go to **Actions** tab in GitHub
2. Select **"Sync Bilosta Content"** workflow
3. Click **"Run workflow"**
4. Configure options:
   - **Remove old items**: Delete entries for files no longer on server (default: false)
   - **Enrich new items**: Fetch TMDB metadata for new content (default: true)
5. Click **"Run workflow"** button

### Local Testing

```bash
# Run sync locally
node scripts/sync-bilosta-content.js

# Analyze server structure
node scripts/analyze-bilosta-structure.js
```

## Configuration

### Required Secrets
Add these in **Settings → Secrets → Actions**:

- `TMDB_API_KEY` - Your TMDB API key for metadata enrichment (optional but recommended)

### Workflow Schedule
Edit `.github/workflows/sync-bilosta.yml` to change schedule:
```yaml
schedule:
  - cron: '0 2 * * *'  # 2 AM UTC daily
```

Common schedules:
- Every 6 hours: `'0 */6 * * *'`
- Twice daily: `'0 2,14 * * *'`
- Weekly (Monday 2 AM): `'0 2 * * 1'`

## Sync Output

### Console Output
```
🚀 Bilosta Content Sync

📍 Server: https://content.bilosta.org/SERCRT721/

📂 Loading existing database...
✓ Loaded 3848 movies, 37 series

🕷️  Crawling Bilosta server...
📁 FILMOVI/
  📁 exyu/
    📄 Roda.mp4
    📄 Drava.mp4
  ...

✅ Crawl complete in 45.23s
📊 Found 15181 video files

🔄 Merging content...
✓ Existing: Roda.mp4
+ New: NewMovie2024.mp4
✓ Existing: Drava.mp4
...

📊 Sync Summary:
  • Existing items: 3848
  • New items: 25
  • Total movies: 3873
  • Items needing enrichment: 25
```

### GitHub Actions Summary
The workflow creates a detailed summary in the Actions tab showing:
- Number of new items discovered
- Number of existing items unchanged
- Updated database statistics
- Links to download full sync logs

## Database Structure

### Movie Entry (Existing)
```json
{
  "id": "bilosta:Um9kYQ==",
  "type": "movie",
  "name": "Roda",
  "year": 2024,
  "poster": "https://image.tmdb.org/t/p/w780/...",
  "genres": ["Drama"],
  "cast": ["Actor Name"],
  "streams": [{
    "url": "https://content.bilosta.org/SERCRT721/FILMOVI/exyu/Roda.mp4",
    "quality": "HD",
    "source": "bilosta"
  }],
  "imdb_id": "tt1234567"
}
```

### Movie Entry (New - Before Enrichment)
```json
{
  "id": "bilosta:TmV3TW92aWU=",
  "type": "movie",
  "name": "New Movie 2024",
  "streams": [{
    "url": "https://content.bilosta.org/SERCRT721/FILMOVI/exyu/NewMovie.mp4",
    "quality": "HD",
    "source": "bilosta"
  }],
  "category": "Direct HD",
  "needsEnrichment": true
}
```

## Categorization Logic

Files are automatically categorized based on their path:

| Path Pattern | Category | Result |
|-------------|----------|---------|
| `/FILMOVI/exyu/` | `movies` | Ex-YU Movies (Domaci Filmovi) |
| `/FILMOVI/strani/` | `foreign` | Foreign Movies (Strani Filmovi) |
| `/4K/` | `foreign` | 4K Movies (usually foreign) |
| `/CRTANI/` | `kids` | Cartoons (Crtani Filmovi) |
| `/SERIJE/` | `series` | TV Series |

## Troubleshooting

### No new items found but you know there are new files
- Check if server is accessible: `curl -I https://content.bilosta.org/SERCRT721/`
- Run sync locally to see detailed logs: `node scripts/sync-bilosta-content.js`
- Check if files are actually video files (only `.mp4`, `.mkv`, `.avi`, etc. are indexed)

### TMDB enrichment not working
- Verify `TMDB_API_KEY` secret is set in GitHub repository settings
- Check API key is valid: https://www.themoviedb.org/settings/api
- Review workflow logs for TMDB API errors

### Workflow not running on schedule
- Check workflow status in Actions tab
- Verify cron schedule is correct (uses UTC timezone)
- Ensure workflow file is in `main` branch

### Too many items marked as "needsEnrichment"
Run the TMDB scraper manually:
```bash
node scrape-tmdb-metadata.js
```

Or trigger enrichment via GitHub Actions → "Manual Content Update"

## Maintenance

### View Current Stats
```bash
# View database statistics
jq '.stats' data/baubau-content.json

# Count items needing enrichment
jq '[.movies[] | select(.needsEnrichment == true)] | length' data/baubau-content.json

# List items by category
jq '[.movies[] | select(.category == "movies")] | length' data/baubau-content.json
```

### Clean Up Old Entries
To remove entries for files that no longer exist on the server:

1. Go to Actions → Sync Bilosta Content
2. Run workflow with **"Remove old items"** set to `true`

**⚠️ Warning:** This will permanently delete database entries. Make sure you have a backup!

### Backup Database
```bash
# Create backup
cp data/baubau-content.json data/baubau-content.backup.json

# Restore from backup
cp data/baubau-content.backup.json data/baubau-content.json
```

## Integration with Existing Workflows

### BauBau XML Updates (update-content.yml)
Still active for processing BauBau API XML files. Runs at 3 AM UTC.

### TMDB Cache Updates (update-tmdb-cache.yml)
Updates TMDB metadata for existing items. Runs weekly.

### Manual Updates (manual-update.yml)
Allows manual triggering of BauBau XML import.

## Performance

- **Crawl time**: ~30-60 seconds (depends on server response)
- **Merge time**: ~5-10 seconds (15,000+ files)
- **TMDB enrichment**: ~2-5 seconds per new item
- **Total workflow time**: ~2-5 minutes (with enrichment)

## Future Enhancements

- [ ] Detect file quality from filename (1080p, 720p, 4K)
- [ ] Improved series/episode detection
- [ ] Duplicate detection and merging
- [ ] Multi-language metadata support
- [ ] Webhook notifications for new content
- [ ] Incremental crawling (only check changed folders)

## Contributing

To improve the sync workflow:

1. Test changes locally first
2. Update documentation
3. Create pull request with description
4. Wait for automated tests to pass

## License

Same as main project.
