# Release Process

This document outlines the release process for the 591-crawler project using CalVer (Calendar Versioning).

## Version Format

We use **CalVer** with the format `YYYY.MM.PATCH`:

- `YYYY`: Full year (e.g., 2025)
- `MM`: Zero-padded month (e.g., 01, 07, 12)
- `PATCH`: Incremental number within the month, starting from 1

### Examples
- `2025.07.1` - First release in July 2025
- `2025.07.2` - Second release in July 2025
- `2025.08.1` - First release in August 2025

## Release Workflow

### 1. Pre-Release Checklist

Before creating a new release, ensure:

- [ ] All tests pass: `pnpm test`
- [ ] Code is properly linted and formatted
- [ ] All changes are committed to the main branch
- [ ] Working directory is clean: `git status`

### 2. Version Update

Use the automated version update script:

```bash
# Update version and create git tag
pnpm run version:update
```

This script will:
- Calculate the next version based on current date
- Update `package.json` version field
- Stage the package.json changes
- Create a git tag (e.g., `v2025.07.1`)

### 3. Review Changes

```bash
# Review staged changes
git diff --cached

# Current version
pnpm run version:show
```

### 4. Commit Release

```bash
# Commit the version update
git commit -m "bump: Release version $(pnpm run version:show --silent)"

# Example output: "bump: Release version 2025.07.1"
```

### 5. Push to Remote

```bash
# Push commits and tags
git push && git push --tags
```

### 6. Deploy

```bash
# Deploy updated version
pnpm run deploy:docker

# Optional: Follow deployment logs  
pnpm run deploy:docker:logs
```

### 7. Verify Deployment

```bash
# Check API version
curl -s http://localhost:3000/info | jq '.version'

# Check container status
pnpm run docker:status
```

## Hotfix Process

For urgent fixes within the same month:

1. Create a hotfix branch: `git checkout -b hotfix/urgent-fix`
2. Make necessary changes
3. Run tests: `pnpm test`
4. Merge to main: `git checkout main && git merge hotfix/urgent-fix`
5. Follow normal release process (version will auto-increment patch number)

## Rollback Process

If a deployment needs to be rolled back:

```bash
# Rollback to previous Docker image
pnpm run docker:rollback

# Check rollback status
pnpm run docker:status
```

## Version History

You can view all releases and their git tags:

```bash
# List all version tags
git tag --list | sort -V

# Show tag details
git show v2025.07.1
```

## Automated Integration

### GitHub Actions (Future)

When setting up CI/CD, the release process can be automated:

```yaml
# .github/workflows/release.yml (example)
name: Release
on:
  push:
    tags: ['v*']
steps:
  - name: Deploy
    run: |
      pnpm run deploy:docker
      # Additional deployment steps
```

### Version API Endpoint

The API automatically reports the current version:

```bash
# Get version via API
curl -s http://localhost:3000/info | jq '{name, version, versionInfo}'
```

## Notes

- **No breaking changes**: Follow semantic versioning principles for API compatibility
- **Docker tags**: Each deployment creates timestamped Docker images for rollback
- **Git tags**: All versions are tagged for easy reference and checkout
- **Automated**: Version calculation is automatic based on calendar date
- **Team coordination**: Coordinate releases to avoid conflicts within the same month

## Troubleshooting

### Tag Already Exists
If `pnpm run version:update` reports that a tag already exists:
- Check current version: `pnpm run version:show`  
- Verify git tags: `git tag --list | grep $(date +%Y.%m)`
- The script will skip tag creation but still update package.json

### Version Mismatch
If API shows different version than package.json:
- Redeploy: `pnpm run deploy:docker`
- Check container: `docker exec 591-crawler_crawler-api_1 cat /app/package.json | jq .version`

### Failed Deployment
If deployment fails:
- Check logs: `pnpm run docker:logs`
- Rollback if needed: `pnpm run docker:rollback`
- Fix issues and re-deploy