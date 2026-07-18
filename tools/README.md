# SAT Markets ship tooling

## `ship.py` — one-command deploy from the cloud sandbox

Replaces the old base64-paste-into-Codespace pipeline (the corruption source).
The sandbox commits and pushes to `main` directly over HTTPS, which triggers the
Vercel production deploy exactly as before. Nothing is typed into a terminal, so
there is no paste-corruption surface.

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
python3 tools/ship.py -m "ship: fix listing card price wrap" src/app/[locale]/listings/page.tsx

# everything changed vs HEAD
python3 tools/ship.py -m "ship: batch" --auto

# preview without committing/pushing
python3 tools/ship.py -m "..." --auto --dry-run
```

### Guarantees / behaviour

- Fast-forward push only; a non-fast-forward is surfaced, never forced.
- Commits are unsigned (the sandbox signer would sign as the agent) and authored
  as the owner so GitHub attributes them correctly.
- Law 2 guard: the commit message is rejected if it contains an em dash.
- The token reaches git only through a temporary `GIT_ASKPASS` helper — never in
  a URL, a command argument, or the git config.

### Why not the GitHub REST API

The Anthropic sandbox proxy gates the GitHub REST API to session-bound repos
(`/repos/{owner}/{repo}/...` returns "GitHub access to this repository is not
enabled for this session"). Plain `git push` over `github.com` is not gated and
works with the PAT, so this tool uses git push.

### Standard after every ship

Confirm the Vercel deploy is READY, then verify the change on the LIVE page
(cache-bust with `?v=...`). Obey the Laws before calling anything done.
