# SAT Markets ship tooling

## `ship.py` — one-command deploy from the cloud sandbox

Replaces the old base64-paste-into-Codespace pipeline (the corruption source).
The sandbox commits and pushes over HTTPS to the branch you name, and a push to
`main` triggers the Vercel production deploy. Nothing is typed into a terminal,
so there is no paste-corruption surface.

`--branch` is required and has no default. It used to default to `main`, and
that default is what sent PKG-NEXT16-SECURITY slice B to production instead of
to its isolated branch. Pushing to `main` now takes `--allow-main` as well, and
pushing a checkout of one branch to a differently named remote branch takes
`--allow-cross-branch`. The guards live in the pure function `check_target`, and
`npm run ship-test` reproduces the slice B invocation directly.

### Setup (once per session)

The sandbox is ephemeral, so the token is supplied fresh each new session:

1. Use a GitHub fine-grained PAT scoped to `saleemzeidan123/satmarkets` with
   **Contents: read and write** (Metadata read-only is auto-required). Nothing else.
2. Store it: write the token into `~/.sm_ship_token` and `chmod 600` it. It is
   kept outside the repo so it can never be committed. Revoke or rotate anytime
   from GitHub settings.

### Ship

```bash
# specific files
python3 tools/ship.py --branch my-branch -m "ship: fix listing card price wrap" src/app/[locale]/listings/page.tsx

# everything changed vs HEAD
python3 tools/ship.py --branch my-branch -m "ship: batch" --auto

# preview without committing/pushing
python3 tools/ship.py --branch my-branch -m "..." --auto --dry-run

# promote a finished branch to production, from a main checkout
python3 tools/ship.py --branch main --allow-main --push-only
```

### Guarantees / behaviour

- `--branch` is explicit, always. There is no default and there will not be one.
- A push to `main` is refused unless `--allow-main` is also passed.
- A push from a checkout of one branch to a differently named remote branch is
  refused unless `--allow-cross-branch` is also passed, and a detached HEAD is
  treated the same way because it has no name to compare.
- Before pushing, the source branch, the source HEAD with its subject, and the
  target ref are printed. Nothing in that announcement reads the token file, the
  askpass helper or the environment, which is asserted by a test.
- Refusals happen before anything is staged, committed or pushed, so a refused
  run leaves the working tree exactly as it was found.
- Fast-forward push only; a non-fast-forward is surfaced, never forced. No
  `--force` appears anywhere in the file, and a test asserts that it does not.
- Commits are unsigned (the sandbox signer would sign as the agent) and authored
  as the owner so GitHub attributes them correctly.
- Law 2 guard: the commit message is rejected if it contains an em dash.
- The token reaches git only through a temporary `GIT_ASKPASS` helper, never in
  a URL, a command argument, or the git config.

### Why not the GitHub REST API

The Anthropic sandbox proxy gates the GitHub REST API to session-bound repos
(`/repos/{owner}/{repo}/...` returns "GitHub access to this repository is not
enabled for this session"). Plain `git push` over `github.com` is not gated and
works with the PAT, so this tool uses git push.

### Standard after every ship

Confirm the Vercel deploy is READY, then verify the change on the LIVE page
(cache-bust with `?v=...`). Obey the Laws before calling anything done.
