# GitHub Actions Troubleshooting

## Release Workflow - 403 Permission Errors

If you encounter a 403 error when creating releases, check the following:

### 1. Repository Settings

Go to your GitHub repository → Settings → Actions → General → Workflow permissions

Ensure one of these is selected:
- ✅ **Read and write permissions** (recommended)
- ✅ **Read repository contents and packages permissions** (with explicit permissions in workflow)

### 2. Workflow Permissions

The release workflow includes:
```yaml
permissions:
  contents: write
```

This grants the GITHUB_TOKEN permission to create releases.

### 3. If Still Getting 403

If you still get 403 errors after checking the above:

1. **Check if the tag already exists**: Delete the tag and try again
   ```bash
   git tag -d v1.0.0
   git push origin :refs/tags/v1.0.0
   ```

2. **Verify GITHUB_TOKEN has permissions**: The token is automatically provided, but repository settings might restrict it

3. **Check repository visibility**: If it's a private repository, ensure Actions are enabled

4. **Try using a Personal Access Token**: Create a PAT with `repo` scope and add it as a secret:
   - Go to Settings → Secrets and variables → Actions
   - Add a new secret named `GH_TOKEN` with your PAT
   - Update the workflow to use `${{ secrets.GH_TOKEN }}` instead of `${{ secrets.GITHUB_TOKEN }}`

### 4. Alternative: Manual Release

If automated releases continue to fail, you can create releases manually:
1. Build the plugin: `npm run build`
2. Go to GitHub → Releases → Draft a new release
3. Create tag and upload files manually
