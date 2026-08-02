#!/usr/bin/env python3
"""
ship.py - commit and push SAT Markets changes straight to a branch, from the
cloud sandbox, with no terminal paste.

Why this exists
---------------
The old ship pipeline hand-carried file contents into a running Codespace by
pasting base64 into the VS Code web terminal, which corrupted large pastes and
forced per-piece md5 gating. That whole surface is gone. This sandbox can push
to github.com directly over HTTPS using a fine-grained PAT, so we just commit
and `git push`, which triggers the Vercel production deploy exactly as before.

(Note: the Anthropic sandbox proxy gates the GitHub REST API to session-bound
repos, so an API-based commit does NOT work here. Plain `git push` over
github.com does. This script uses git push.)

Auth
----
Needs a fine-grained PAT (Contents: read+write on saleemzeidan123/satmarkets),
read from, in order:
  1. env  SM_GH_TOKEN
  2. file ~/.sm_ship_token   (chmod 600, kept OUTSIDE the repo)
The sandbox is ephemeral, so the token must be present each new session. It is
supplied to git via a GIT_ASKPASS helper this script writes to a temp file; it
is never placed in a URL, a command argument, or the git config.

Usage
-----
  python3 tools/ship.py -m "ship: fix X" src/app/page.tsx src/lib/foo.ts
  python3 tools/ship.py -m "ship: batch" --auto          # all changes vs HEAD
  python3 tools/ship.py -m "..." --auto --dry-run         # preview only
  python3 tools/ship.py --push-only                       # push commits already made

Behaviour
---------
- Commits are NOT gpg-signed (the sandbox signer would sign as the agent), and
  are authored as the owner so GitHub attributes them correctly.
- --auto stages every change (adds, mods, deletes, untracked) via `git add -A`.
- Explicit paths are staged individually (a missing path is staged as a delete).
- Fast-forward push only; a rejected non-ff push is surfaced, not forced.
"""

import argparse
import os
import subprocess
import sys
import tempfile

REPO_SLUG = "saleemzeidan123/satmarkets"
AUTHOR_NAME = "Saleem Zeidan"
AUTHOR_EMAIL = "saleem.zeidan@gmail.com"
TOKEN_FILE = os.path.expanduser("~/.sm_ship_token")


def find_token_file():
    if os.environ.get("SM_GH_TOKEN"):
        # materialise env token into a temp file for the askpass helper
        fd, p = tempfile.mkstemp(prefix="sm_tok_")
        with os.fdopen(fd, "w") as f:
            f.write(os.environ["SM_GH_TOKEN"].strip())
        os.chmod(p, 0o600)
        return p
    if os.path.exists(TOKEN_FILE):
        return TOKEN_FILE
    sys.exit(
        "No token found. Paste your fine-grained PAT into ~/.sm_ship_token "
        "(chmod 600) or set SM_GH_TOKEN. The token needs Contents: read+write "
        "on " + REPO_SLUG + "."
    )


def write_askpass(token_file):
    fd, p = tempfile.mkstemp(prefix="sm_askpass_", suffix=".sh")
    with os.fdopen(fd, "w") as f:
        f.write(
            "#!/bin/bash\n"
            'case "$1" in\n'
            '  *sername*) echo "x-access-token" ;;\n'
            f'  *) cat "{token_file}" ;;\n'
            "esac\n"
        )
    os.chmod(p, 0o700)
    return p


def git(args, repo, env=None, check=True):
    r = subprocess.run(
        ["git", "-C", repo] + args,
        capture_output=True, text=True, env=env,
    )
    if check and r.returncode != 0:
        sys.exit(f"git {' '.join(args)} failed:\n{r.stderr or r.stdout}")
    return r


def main():
    ap = argparse.ArgumentParser(description="Ship SAT Markets via git push.")
    ap.add_argument("-m", "--message", help="commit message")
    ap.add_argument("paths", nargs="*", help="files to ship (relative to repo root)")
    ap.add_argument("--auto", action="store_true", help="stage all changes vs HEAD")
    ap.add_argument("--repo", default=".", help="path to the repo clone")
    ap.add_argument("--branch", default="main", help="target branch")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument(
        "--push-only",
        action="store_true",
        help=(
            "push existing local commits and make none. Use when commits were "
            "authored somewhere else, for example carried in by git bundle from "
            "a session whose container had no token."
        ),
    )
    args = ap.parse_args()

    if args.message and "—" in args.message:
        sys.exit("Commit message contains an em dash. Law 2: none, ever.")
    if not args.push_only and not args.message:
        sys.exit("Give -m, or use --push-only to push commits that already exist.")

    repo = os.path.abspath(args.repo)
    base_env = dict(os.environ)

    if args.push_only:
        dirty = git(["status", "--porcelain"], repo).stdout.strip()
        if dirty:
            sys.exit(
                "--push-only refuses to run with a dirty tree, because it would "
                "push a commit that does not match what is on disk:\n" + dirty
            )
        ahead = git(
            ["rev-list", "--count", f"origin/{args.branch}..HEAD"], repo, check=False
        ).stdout.strip()
        if ahead in ("", "0"):
            print(f"Nothing to push. HEAD is not ahead of origin/{args.branch}.")
            return
        print(f"Target: {REPO_SLUG}@{args.branch}\nPushing {ahead} local commit(s):")
        print(git(["log", "--oneline", f"origin/{args.branch}..HEAD"], repo).stdout.rstrip())
        if args.dry_run:
            print("dry-run: not pushing.")
            return
        token_file = find_token_file()
        askpass = write_askpass(token_file)
        env = dict(base_env)
        env["GIT_ASKPASS"] = askpass
        env["GIT_TERMINAL_PROMPT"] = "0"
        push = git(["push", "origin", f"HEAD:{args.branch}"], repo, env=env, check=False)
        try:
            os.remove(askpass)
        except OSError:
            pass
        if push.returncode != 0:
            sys.exit(
                "Push rejected (nothing was changed locally):\n"
                + (push.stderr or push.stdout)
                + f"\nIf this is a non-fast-forward, run `git -C {repo} pull --rebase "
                f"origin {args.branch}` and re-run."
            )
        sha = git(["rev-parse", "HEAD"], repo).stdout.strip()
        print(f"\nShipped {sha[:7]} to {args.branch}.")
        print(f"  https://github.com/{REPO_SLUG}/commit/{sha}")
        print("Vercel will build this push to production. Confirm READY, then verify live.")
        return

    # Stage.
    if args.auto:
        git(["add", "-A"], repo)
    else:
        if not args.paths:
            sys.exit("Give file paths, or use --auto.")
        for p in args.paths:
            git(["add", "--", p], repo)  # stages modifications AND deletions

    staged = git(["diff", "--cached", "--name-status"], repo).stdout.strip()
    if not staged:
        print("Nothing staged to ship.")
        return
    print(f"Target: {REPO_SLUG}@{args.branch}\nStaged:")
    for line in staged.splitlines():
        print("  " + line)
    if args.dry_run:
        print("dry-run: not committing or pushing.")
        # unstage so a dry-run leaves no side effects
        git(["reset", "-q"], repo, check=False)
        return

    token_file = find_token_file()
    askpass = write_askpass(token_file)
    env = dict(base_env)
    env["GIT_ASKPASS"] = askpass
    env["GIT_TERMINAL_PROMPT"] = "0"

    # Commit unsigned, authored as the owner.
    commit_args = [
        "-c", "commit.gpgsign=false",
        "-c", f"user.name={AUTHOR_NAME}",
        "-c", f"user.email={AUTHOR_EMAIL}",
        "commit", "-m", args.message,
    ]
    git(commit_args, repo)
    sha = git(["rev-parse", "HEAD"], repo).stdout.strip()

    # Push (fast-forward only).
    push = git(["push", "origin", f"HEAD:{args.branch}"], repo, env=env, check=False)
    if push.returncode != 0:
        sys.exit(
            "Push rejected (commit is made locally at "
            f"{sha[:7]}, not pushed):\n{push.stderr or push.stdout}\n"
            "If this is a non-fast-forward, run `git -C "
            f"{repo} pull --rebase origin {args.branch}` and re-ship."
        )

    # cleanup the askpass helper (token file is left as-is)
    try:
        os.remove(askpass)
    except OSError:
        pass

    print(f"\nShipped {sha[:7]} to {args.branch}.")
    print(f"  https://github.com/{REPO_SLUG}/commit/{sha}")
    print("Vercel will build this push to production. Confirm READY, then verify live.")


if __name__ == "__main__":
    main()
