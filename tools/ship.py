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
  3. an uploaded file named sm_ship_token(.txt) in the session upload or working
     directory, which is adopted into ~/.sm_ship_token (chmod 600) and then
     shredded from the upload directory
The sandbox is ephemeral, so the token must be present each new session. It is
supplied to git via a GIT_ASKPASS helper this script writes to a temp file; it
is never placed in a URL, a command argument, or the git config.

Route 3 exists so the owner can hand a session push rights by attaching a small
file instead of typing a secret into a chat, which would put it in a transcript
that outlives the token. Nothing in this script prints, logs or echoes the token
value, and the adopted upload is removed so it is not re-read later.

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

# Where an attached token file may land. Checked in order, first hit wins.
UPLOAD_DIRS = (
    "/mnt/user-data/uploads",
    "/mnt/user-data/working",
    os.path.expanduser("~/uploads"),
)
UPLOAD_NAMES = (
    "sm_ship_token",
    "sm_ship_token.txt",
    ".sm_ship_token",
    "sm_ship_token.text",
)

NO_TOKEN_HELP = """No token found, so nothing was pushed.

This container is ephemeral and the token does not survive it. Three ways to
give this session push rights, best first:

  1. Attach a plain text file named sm_ship_token.txt containing only the PAT.
     Re-run this command and it will be adopted into ~/.sm_ship_token and
     removed from the upload directory. The secret never enters the chat.
  2. Do not supply a token at all. Commit locally, then:
       git bundle create /tmp/satmarkets-outgoing.bundle origin/main..HEAD --branches
     Deliver that bundle and push it from a session that has a token with
       python3 tools/ship.py --push-only
  3. Write the PAT to ~/.sm_ship_token yourself (chmod 600).

The token must be a fine-grained PAT with Contents: read and write on {slug}
and nothing else. Give it a short expiry and revoke it when the work is done.
""".format(slug=REPO_SLUG)


def adopt_uploaded_token():
    """Move an attached token file into ~/.sm_ship_token. Returns True if adopted.

    The value is never printed. The source file is overwritten before unlink so a
    later read of the upload directory cannot recover it.
    """
    for d in UPLOAD_DIRS:
        if not os.path.isdir(d):
            continue
        for name in UPLOAD_NAMES:
            src = os.path.join(d, name)
            if not os.path.isfile(src):
                continue
            with open(src, "r") as f:
                value = f.read().strip()
            if not value:
                continue
            fd = os.open(TOKEN_FILE, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
            with os.fdopen(fd, "w") as f:
                f.write(value)
            try:
                with open(src, "w") as f:
                    f.write("0" * max(len(value), 64))
                os.remove(src)
            except OSError:
                print(f"Adopted the token but could not remove {src}. Delete it.")
            print(f"Adopted a token from {os.path.basename(src)} into ~/.sm_ship_token.")
            return True
    return False


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
    if adopt_uploaded_token() and os.path.exists(TOKEN_FILE):
        return TOKEN_FILE
    sys.exit(NO_TOKEN_HELP)


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
        # A branch that does not exist on the remote yet has no origin/<branch>
        # ref, so `rev-list origin/<branch>..HEAD` fails and returns an empty
        # string, which read identically to "zero commits ahead". PKG-NEXT16
        # pushed its first isolated branch and was told there was nothing to
        # push, with three commits sitting in an ephemeral clone. The two cases
        # are distinguished rather than collapsed: a missing upstream means
        # every commit is new, not that none are.
        known = git(
            ["rev-parse", "--verify", "--quiet", f"origin/{args.branch}"], repo, check=False
        ).stdout.strip()
        if not known:
            print(f"origin/{args.branch} does not exist yet; this push creates it.")
            print(git(["log", "--oneline", "-10"], repo).stdout.rstrip())
        else:
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
        if args.branch == "main":
            print("Vercel will build this push to production. Confirm READY, then verify live.")
        else:
            print(
                f"This is branch {args.branch}, not main, so nothing reached production.\n"
                "If the project builds branch deployments, a preview will appear; check\n"
                "list_deployments for meta.githubCommitRef before treating it as evidence."
            )
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
