# Local Release Guide

This guide explains how to build and publish a new version of the **Audio Transcriber & Summarizer** directly from your local machine to GitHub Releases.

## 1. Create a GitHub Personal Access Token (PAT)

To upload builds to GitHub, you need a token with "repo" permissions:

1. Go to [GitHub Token Settings](https://github.com/settings/tokens).
2. Click **Generate new token (classic)**.
3. Give it a name (e.g., "Electron Release Token").
4. Select the **repo** scope (Full control of private repositories).
5. Click **Generate token** and copy it immediately.

## 2. Set the Environment Variable

You need to provide this token to `electron-builder` via the `GH_TOKEN` environment variable.

### On Windows (PowerShell)
Run this command in your terminal before releasing (replace `your_token_here` with your actual token):
```powershell
$env:GH_TOKEN="your_token_here"
```

### On Windows (Command Prompt)
```cmd
set GH_TOKEN=your_token_here
```

## 3. Publish the Release

Once the token is set, run the following command:

```sh
npm run release
```

### What this does:
1. **Builds the project**: Runs `npm run build` to generate the latest frontend assets.
2. **Packages the app**: `electron-builder` packages the application for Windows.
3. **Uploads to GitHub**: It automatically creates a "Draft" release on your GitHub repository and uploads the `.exe` (portable) file.

## 4. Finalize on GitHub
1. Go to the **Releases** section of your GitHub repository.
2. You should see a new draft release.
3. Edit the draft, add a version tag (e.g., `v1.0.1`), and click **Publish release**.

> [!TIP]
> Make sure to update the `"version"` in `package.json` before running the release script if you want to push a new version!
