# Setting Up Your Public Issues Repository

Follow these steps to create a separate public repository for issues following Stremio's best practice (like stremio-bugs).

## Step 1: Create the Public Repository

1. Go to https://github.com/new
2. **Repository name:** `Balkan-On-Demand-Issues`
3. **Description:** "Bug reports, feature requests, and support for Balkan On Demand Stremio addon"
4. **Visibility:** ✅ Public
5. **Do NOT initialize** with README, .gitignore, or license
6. Click "Create repository"

## Step 2: Copy the Issue Templates

The issue templates are already in your main repository at `.github/ISSUE_TEMPLATE/`. You need to copy them to the new issues repository.

### Option A: Using Git (Recommended)

```bash
# Navigate to a temporary directory
cd ~/Desktop

# Clone your new issues repository
git clone git@github.com:Zerr0-C00L/Balkan-On-Demand-Issues.git
cd Balkan-On-Demand-Issues

# Copy the README from your main repo
cp "/Users/zeroq/Stremio-Addons/Balkan On Demand/ISSUES_REPO_README.md" README.md

# Copy the issue templates
mkdir -p .github/ISSUE_TEMPLATE
cp -r "/Users/zeroq/Stremio-Addons/Balkan On Demand/.github/ISSUE_TEMPLATE/"* .github/ISSUE_TEMPLATE/

# Commit and push
git add -A
git commit -m "Initial setup: Add README and issue templates"
git push origin main
```

### Option B: Using GitHub Web Interface

1. In the new repository, click "Add file" → "Create new file"
2. Name it `README.md` and paste the content from `ISSUES_REPO_README.md`
3. Create the issue templates by creating files at:
   - `.github/ISSUE_TEMPLATE/bug_report.yml`
   - `.github/ISSUE_TEMPLATE/feature_request.yml`
   - `.github/ISSUE_TEMPLATE/question.yml`
   - `.github/ISSUE_TEMPLATE/config.yml`

## Step 3: Configure Repository Settings

### Enable Issues
1. Go to Settings → General → Features
2. Make sure "Issues" is enabled ✅

### Add Repository Description
1. Go to the main page of your issues repository
2. Click the gear icon ⚙️ next to "About"
3. **Description:** "Bug reports and feature requests for Balkan On Demand"
4. **Website:** (your addon URL if you have one)
5. **Topics:** `stremio` `addon` `support` `issues`

### Add Issue Labels (Optional but Recommended)
1. Go to Issues → Labels
2. Create these labels:
   - 🐛 `bug` (red) - Something isn't working
   - ✨ `enhancement` (blue) - New feature or request
   - ❓ `question` (purple) - Further information is requested
   - 📝 `needs-triage` (yellow) - Needs initial review
   - ✅ `fixed` (green) - Issue has been resolved
   - 🔄 `in-progress` (orange) - Currently being worked on
   - 📚 `documentation` (cyan) - Documentation related

## Step 4: Update Your Main Repository

Your main repository (`Balkan-On-Demand`) should remain **private** to protect:
- Content sources and CDN endpoints
- Infrastructure configuration
- API keys and secrets

Update the README.md in your main repo to include:

```markdown
## 🐛 Issues & Support

This repository is private to protect content sources. For bug reports, feature requests, and support:

**👉 Visit our [Issues Repository](https://github.com/Zerr0-C00L/Balkan-On-Demand-Issues)**

- [🐛 Report a Bug](https://github.com/Zerr0-C00L/Balkan-On-Demand-Issues/issues/new?template=bug_report.yml)
- [💡 Request a Feature](https://github.com/Zerr0-C00L/Balkan-On-Demand-Issues/issues/new?template=feature_request.yml)
- [❓ Ask a Question](https://github.com/Zerr0-C00L/Balkan-On-Demand-Issues/issues/new?template=question.yml)
```

## Step 5: Test the Setup

1. Go to your issues repository
2. Click "Issues" → "New issue"
3. You should see three template options:
   - 🐛 Bug Report
   - 💡 Feature Request
   - ❓ Question
4. Try creating a test issue using one template
5. Verify all fields appear correctly

## Step 6: Promote Your Issues Repository

Let users know where to report issues:

1. **In Stremio:** Your addon manifest now includes support links that point to the issues repo
2. **In Documentation:** Add the issues repo link to your README
3. **In Social Media:** Share the issues repo link when users ask for support

## Best Practices

✅ **Do:**
- Respond to issues promptly
- Use labels to organize issues
- Close fixed issues with a comment explaining the resolution
- Be friendly and helpful to users
- Link related issues together

❌ **Don't:**
- Share sensitive information (API keys, server IPs, etc.)
- Close issues without explanation
- Ignore duplicate reports (merge them instead)
- Be rude or dismissive to users

## Example Repositories

Here are some well-managed public issues repositories:
- [stremio-bugs](https://github.com/Stremio/stremio-bugs) - Official Stremio issues
- [Torrentio issues](https://github.com/TheBeastLT/torrentio-scraper/issues)

---

✅ **Your addon now has professional issue tracking following Stremio best practices!**
