# Pushing this repo to GitHub

Written for this machine specifically. It has **Git 2.55** and **Git Credential
Manager** already installed and configured as the credential helper, so pushing
triggers a browser sign-in — no GitHub CLI, no personal access token.

> **One repo, not three.** `apps/timeline`, `apps/webgl` and `apps/ai-search`
> share a single `pnpm-lock.yaml` and a single design-token layer. Split across
> three repositories, two of them would not install or run. They live together
> in one monorepo, which is why this single repository contains all three.

> **Note on the name.** The GitHub repository is called `cardboard-portfolio`,
> after the role it was first assembled for. The code inside carries no
> employer-specific content — it is a general design-engineering portfolio. If
> you rename the repo on GitHub, GitHub redirects the old URL automatically, but
> update `git remote set-url` and the Vercel project links to match.

---

## Step 1 — Create an empty repository on GitHub

In a browser:

1. Go to **https://github.com/new**
2. **Repository name:** `cardboard-portfolio`
3. **Description** (optional): `Design engineering portfolio + three browser-craft demos`
4. **Visibility:** Public
5. **Leave every "Initialize this repository with" option OFF**
   - Do NOT add a README
   - Do NOT add a .gitignore
   - Do NOT choose a license

   This matters: you already have a commit. Adding files on GitHub creates a
   divergent history that you would then have to merge by force.

6. Click **Create repository**

You will land on a page saying *"Quick setup — if you've done this kind of thing
before."* That is expected — the repo is empty.

Alternatively, open it directly with the name pre-filled:

```
https://github.com/new?name=cardboard-portfolio&visibility=public
```

---

## Step 2 — Point your local repo at it

Copy the HTTPS URL from that page (it looks like
`https://github.com/ktsomani/cardboard-portfolio.git`) and run:

```powershell
cd "C:\Users\soman\OneDrive\Documents\deepseek-harness\default-workspace"
git remote add origin https://github.com/ktsomani/cardboard-portfolio.git
git remote -v
```

`git remote -v` should print the URL twice — once for `fetch`, once for `push`.

---

## Step 3 — Push

```powershell
git push -u origin main
```

**What happens next:** Git Credential Manager opens a browser window asking you
to sign in to GitHub (or shows a device code to enter). Approve it. The
credential is stored in Windows Credential Manager, so you only do this once.

The `-u` flag links your local `main` branch to the remote, so future pushes are
just `git push` with no arguments.

**Alternative if the browser flow misbehaves** — use a token instead:

1. Go to **https://github.com/settings/tokens** → *Generate new token (classic)*
2. Scope: check **`repo`** only
3. Copy the token (starts with `ghp_`) — you will not see it again
4. At the password prompt, paste the token **as the password**; username is `ktsomani`

---

## Step 4 — Verify

```powershell
git log --oneline -3
git remote -v
git status
```

- `git log` shows your commits
- `git remote -v` shows `origin`
- `git status` says `Your branch is up to date with 'origin/main'` and *nothing to commit*

Then open **https://github.com/ktsomani/cardboard-portfolio** — the README should
render on the landing page.

---

## What is and is not in the repo

`git ls-files | wc -l` reports 74 files totalling under 0.5 MB. Excluded on
purpose (see `.gitignore`):

| Excluded | Why |
| --- | --- |
| `.pnpm-store/` | a 200 MB+ package cache pnpm created here; cache, not source |
| `node_modules/` | reinstalled by `pnpm install` |
| `dist/` | build output, regenerated |
| `screenshots/` | verification artefacts; regenerate with `scripts/capture-screenshots.ps1` |

So anyone cloning this runs `pnpm install && pnpm dev` and gets all four apps.

---

## Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| `gh: command not found` | Not needed for this route. Use the browser method above. |
| `error: remote origin already exists` | Run `git remote set-url origin <url>` instead of `add` |
| `error: failed to push some refs ... (fetch first)` | You added a README on GitHub. Fix: `git pull --rebase origin main` then push again |
| `src refspec main does not match any` | You are on a different branch. Check `git branch` |
| Browser never opens on push | Set a token (Step 3 alternative), or run `git config --global credential.helper manager` |
| `LF will be replaced by CRLF` warnings | Harmless. `.gitattributes` normalises line endings. |
| Push rejected as too large | Should not happen at 0.5 MB. Check you did not `git add -f` a cache directory. |

---

## Afterwards

1. **Deploy the portfolio.** On Vercel: *Add New → Project → import
   `cardboard-portfolio` → set **Root Directory** to `apps/portfolio`*. This gives
   you a live URL, which the resume currently lacks — it lists
   `kartikdesign.vercel.app`, which returns 404.
2. **Update the resume** to link this repository as the live demo for all three
   projects.
3. **Consider moving off OneDrive** to something like `C:\dev\cardboard-portfolio`.
   OneDrive sync can lock files and has already crashed the Vite dev server once
   here with `EBUSY`.
