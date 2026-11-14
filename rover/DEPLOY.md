# Deploying to GitHub Pages (exact steps for a human)

The game is plain static files. No build step. All links are relative, so it works under `https://<user>.github.io/<repo>/` (proved by `node tools/e2e.js --prefix=<repo>`).

Note on layout: the git repository root is the folder that CONTAINS `rover/` (the game folder). The workflow file `.github/workflows/pages.yml` sits at that root and publishes the `rover/` folder.

1. Run the tests once: `npm install` then `npm test` and `npm run e2e` (needs Edge or Chrome).
2. Merge the branch into main and push:
   ```
   git checkout main
   git merge autopilot2
   git push origin main
   ```
   (First time only: create an empty repo on github.com, then `git remote add origin https://github.com/<user>/<repo>.git`.)
3. On GitHub: repo Settings > Pages > Build and deployment > Source: choose "GitHub Actions". The workflow "Deploy to GitHub Pages" then runs on every push to main (see the Actions tab; first run takes about 1 minute).
4. Expected URL: `https://<user>.github.io/<repo>/` (landing page), `.../mission.html` (Mission Design), `.../rover.html` (Rover Rules).
5. Open the URL in a private window and play one run. Paste the URL into the "Link to Final Project" field of the submission.

## Three ways to publish (pick one)
- **A. GitHub Actions (recommended):** merge `autopilot2` into `main` (open a pull request on GitHub and merge it), then Settings > Pages > Source: "GitHub Actions". The workflow publishes the `rover/` folder as the site root.
- **B. Branch, root folder:** Settings > Pages > Source: "Deploy from a branch", branch `main` (after merging) or `autopilot2`, folder `/ (root)`. The root `index.html` redirects to `rover/`, so the URL stays `https://<user>.github.io/<repo>/`.
- **C. Without merging:** same as B but choose branch `autopilot2`.

Fallback without Actions: copy the contents of `rover/` into the repo root (or a `/docs` folder) and choose "Deploy from a branch" in Settings > Pages.
