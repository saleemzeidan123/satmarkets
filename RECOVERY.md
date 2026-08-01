# SAT Markets recovery bundle

This folder exists because the environment Claude builds in is an ephemeral container.
It has been reclaimed mid-package before, taking uncommitted work with it. This is the
copy that does not live there.

## What is here

| File | What it is |
| --- | --- |
| `satmarkets-main-<sha>.bundle` | A complete git bundle of `main` at that commit. Full history, every branch tip listed inside it, not a snapshot of files |
| `status-ledger.md` | The canonical status reference. HEAD, production deployment, completed and conditionally completed packages, open outcomes, open findings by severity, owner dependencies, superseded packages, live-verification gaps |
| `RECOVERY.md` | This file |

## How to restore from the bundle

The bundle is a valid git remote on its own. From any machine with git:

```
git clone satmarkets-main-<sha>.bundle satmarkets
cd satmarkets
git remote set-url origin https://github.com/saleemzeidan123/satmarkets.git
```

To check it before trusting it:

```
git bundle verify satmarkets-main-<sha>.bundle
```

To pull it into a clone that already exists:

```
git fetch /path/to/satmarkets-main-<sha>.bundle main:recovered-main
```

## What this is not

It is not a backup of the deployment, the database or any secret. It carries no
environment file, because none is committed. GitHub remains the authoritative remote and
this bundle is a second copy of the same history, held somewhere that does not disappear
when a container is reclaimed.

## When it is refreshed

At the close of each package, and before beginning the next one. If the newest bundle
here is older than the commit named in `status-ledger.md`, GitHub has the newer state and
this folder is merely stale, not wrong.
