# Release Process

This document outlines the release process for the 591-crawler project using CalVer (Calendar Versioning) and Git Flow workflow.

## Version Format

We use **CalVer** with the format `YYYY.MM.PATCH`:

- `YYYY`: Full year (e.g., 2025)
- `MM`: Zero-padded month (e.g., 01, 07, 12)  
- `PATCH`: Incremental number within the month, starting from 1

### Examples
- `2025.07.1` - First release in July 2025
- `2025.07.2` - Second release in July 2025
- `2025.08.1` - First release in August 2025

## Git Flow Workflow

### Branch Strategy
- `develop` - Daily development branch
- `main` - Production branch (triggers Railway deployment)

### Development Process
```bash
# 1. Work on develop branch
git checkout develop
git pull origin develop

# 2. Make changes and commit
git add .
git commit -m "feat: your changes"
git push origin develop

# 3. Test locally
bun test
```

## Release Workflow

### 1. Pre-Release Checklist

Before creating a new release, ensure:

- [ ] All features are completed on `develop` branch
- [ ] All tests pass locally: `bun test`
- [ ] Code is properly committed to `develop`
- [ ] Working directory is clean: `git status`

### 2. Merge to Main Branch

```bash
# Switch to main and merge develop
git checkout main
git pull origin main
git merge develop
```

### 3. Version Update

Use the automated version update script:

```bash
# Update version (on main branch)
bun run version:update
```

This script will:
- Calculate the next version based on current date
- Update `package.json` version field
- Provide commands for commit and push

### 4. Commit and Deploy

```bash
# Follow the script's suggested commands:
git add package.json
git commit -m "chore: bump version to 2025.07.1"  
git push origin main
```

This will:
- Commit the version update to main branch
- Trigger GitHub Actions deployment via self-hosted runner
- No manual Docker deployment needed

### 5. Verify Deployment

```bash
# Check API version (once deployed)
curl -s https://your-domain.com/info | jq '.version'

# Monitor GitHub Actions deployment in repository
```

## Hotfix Process

For urgent fixes within the same month:

1. Create a hotfix branch from main: `git checkout main && git checkout -b hotfix/urgent-fix`
2. Make necessary changes
3. Test locally: `bun test`
4. Merge to main: `git checkout main && git merge hotfix/urgent-fix`
5. Follow normal release process (version will auto-increment patch number)
6. Consider merging back to develop: `git checkout develop && git merge main`

## Rollback Process

If a deployment needs to be rolled back:

1. **Via Git**: Revert commit and push
   ```bash
   git checkout main
   git revert HEAD  # Revert last commit
   git push origin main  # This triggers new deployment
   ```
2. **Manual**: SSH to production server and restart previous container version

## Version History

You can view all releases by checking the git commit history:

```bash
# List commits with version updates
git log --oneline --grep="chore: bump version"

# Show specific version commit
git show HEAD  # Show latest version details
```

## CI/CD Integration

The project uses GitHub Actions for automated deployment:

```yaml
# .github/workflows/deploy.yml  
name: CI/CD for Railway Deployment
on:
  push:
    branches: [main]  # Only deploys on main branch
  pull_request:
    branches: [main]  # CI checks on PRs
```

### Version API Endpoint

The API automatically reports the current version:

```bash
# Get version via API
curl -s https://your-domain.com/info | jq '{name, version}'
```

## Notes

- **Git Flow**: Use `develop` for development, `main` for production
- **GitHub Actions deployment**: Automatic deployment on main branch push
- **Self-hosted runner**: Production deployment via GitHub Actions
- **Automated versioning**: Version calculation based on calendar date
- **Branch protection**: Only push to main when ready to deploy

## Troubleshooting

### Version Update Issues
If `bun run version:update` has issues:
- Check current version: `bun run version:show`  
- Ensure you're on main branch: `git branch --show-current`
- Make sure working directory is clean: `git status`

### Deployment Issues
If deployment fails:
- Check GitHub Actions logs for deployment failures
- Verify self-hosted runner status
- Test locally first: `bun test && bun run api`

### Branch Sync Issues
If branches get out of sync:
```bash
# Sync develop with main after release
git checkout develop
git pull origin develop
git merge main
git push origin develop
```