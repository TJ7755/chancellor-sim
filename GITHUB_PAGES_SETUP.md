# GitHub Pages Setup Guide

This repository has been configured to deploy the Chancellor Sim game to GitHub Pages automatically.

## What Has Been Done

The following changes have been made to prepare the repository for GitHub Pages deployment:

1. **GitHub Actions Workflow** (`.github/workflows/static.yml`)
   - Configured to build the React application on push to the `main` branch
   - Installs Node.js 18 and project dependencies
   - Builds the React app with production optimisations
   - Deploys the build output to GitHub Pages

2. **Package Configuration** (`chancellor-sim/package.json`)
   - Added `homepage` field: `https://tj7755.github.io/chancellor-sim`
   - This ensures all asset paths are correctly prefixed for GitHub Pages deployment

3. **Build Process**
   - The workflow uses `CI=false` to allow the build to succeed with linting warnings
   - This is necessary as the code has some unused variables that would otherwise cause the build to fail

## How to Complete the Setup

To enable GitHub Pages for this repository, follow these steps:

### 1. Merge This Pull Request

First, merge this pull request into the `main` branch. This will trigger the GitHub Actions workflow automatically.

### 2. Enable GitHub Pages in Repository Settings

1. Go to your repository on GitHub: `https://github.com/TJ7755/chancellor-sim`
2. Click on **Settings** (top navigation bar)
3. Scroll down to the **Pages** section in the left sidebar
4. Under **Source**, select **GitHub Actions** from the dropdown menu
   - Note: Do NOT select "Deploy from a branch" - select "GitHub Actions" instead
5. Click **Save**

### 3. Wait for Deployment

After enabling GitHub Pages and merging to main:

1. Go to the **Actions** tab in your repository
2. You should see a workflow run called "Deploy React app to Pages"
3. Wait for it to complete (usually takes 2-3 minutes)
4. Once complete, your site will be live at: `https://tj7755.github.io/chancellor-sim`

### 4. Verify Deployment

Visit `https://tj7755.github.io/chancellor-sim` to see your game running live.

## Automatic Updates

After the initial setup, any push to the `main` branch will automatically:

1. Build the React application
2. Deploy the new build to GitHub Pages
3. Update the live site within a few minutes

## Manual Deployment

You can also manually trigger a deployment:

1. Go to the **Actions** tab
2. Select "Deploy React app to Pages" from the workflows list
3. Click "Run workflow"
4. Select the `main` branch
5. Click "Run workflow" button

## Troubleshooting

### Workflow Fails

If the GitHub Actions workflow fails:

1. Check the **Actions** tab for error messages
2. Common issues:
   - Node.js dependency conflicts (run `npm ci` locally to test)
   - TypeScript compilation errors (run `npm run build` locally to test)
   - Permissions issues (ensure GitHub Actions has write permissions for Pages)

### Page Shows 404

If you see a 404 error:

1. Check that GitHub Pages is enabled in Settings → Pages
2. Verify the source is set to "GitHub Actions"
3. Ensure at least one successful workflow run has completed
4. Wait a few minutes for DNS propagation

### Assets Not Loading

If the page loads but CSS/JS files are missing:

1. Check that the `homepage` field in `chancellor-sim/package.json` matches your GitHub Pages URL
2. Verify the workflow is uploading from `./chancellor-sim/build` directory
3. Check browser console for 404 errors on specific assets

## Repository Structure

```
chancellor-sim/
├── .github/
│   └── workflows/
│       └── static.yml              # GitHub Actions deployment workflow
├── chancellor-sim/                 # React application directory
│   ├── src/                        # Source code
│   ├── public/                     # Static assets
│   ├── build/                      # Production build output (generated)
│   └── package.json                # Dependencies and scripts (includes homepage)
├── README.md                       # Main repository documentation
└── GITHUB_PAGES_SETUP.md          # This file
```

## Notes

- The game data is stored in the browser's local storage and IndexedDB
- Each visitor will have their own independent game state
- No backend server is required for the game to function
- The build process takes approximately 1-2 minutes
- The deployment process takes approximately 1-2 minutes after the build

## Support

If you encounter any issues with the deployment:

1. Check the GitHub Actions logs in the Actions tab
2. Verify all settings in Settings → Pages
3. Review the troubleshooting section above
4. Check the GitHub Pages documentation: https://docs.github.com/en/pages

## Technical Details

### Build Configuration

- **Node.js version**: 18.x
- **Build command**: `CI=false npm run build`
- **Build directory**: `chancellor-sim/build`
- **Base URL**: `/chancellor-sim/`

### Dependencies

The workflow caches npm dependencies to speed up subsequent builds. If you need to clear the cache:

1. Go to Settings → Actions → Caches
2. Delete the relevant cache entry
3. Re-run the workflow

### Security

The workflow uses minimal permissions:
- `contents: read` - to checkout the repository
- `pages: write` - to deploy to GitHub Pages
- `id-token: write` - for authentication with GitHub Pages

No secrets or sensitive data are exposed in the deployment process.
