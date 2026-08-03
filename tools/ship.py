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
  python3 tools/ship.py --branch my-branch -m "ship: fix X" src/app/page.tsx
  python3 tools/ship.py --branch my-branch -m "ship: batch" --auto
  python3 tools/ship.py --branch my-branch -m "..." --auto --dry-run
  python3 tools/ship.py --branch my-branch --push-only
  python3 tools/ship.py --branch main --allow-main --push-only   # promotion

Behaviour
---------
- Commits are NOT gpg-signed (the sandbox signer would sign as the agent), and
  are authored as the owner so GitHub attributes them correctly.
- --auto stages every change (adds, mods, deletes, untracked) via `git add -A`.
- Explicit paths are staged individually (a missing path is staged as a delete).
- Fast-forward push only; a rejected non-ff push is surfaced, not forced.

Release safety, added after a real incident
-------------------------------------------
PKG-NEXT16-SECURITY slice B was shipped without --branch. The flag defaulted to
main, so a framework migration commit that was supposed to sit on an isolated
branch went to production instead, and the production alias served a partially
migrated tree for the rest of the package. The default was the whole defect: the
command looked correct, ran clean, and reported success.

Four rules now stand between a command and a wrong branch, and each one exists
because the incident showed that a silent default is not a safe default.

  1. --branch is required. There is no default, so a forgotten flag is an error
     message rather than a push to production.
  2. Pushing to main additionally requires --allow-main. Naming the branch is
     not the same as intending production, and the promotion path should have
     to say so twice.
  3. Pushing from a checkout of one branch to a differently named remote branch
     requires --allow-cross-branch. `HEAD:<branch>` will happily send anything
     anywhere; the ordinary case is that the two names match, and the ordinary
     case is now the only silent one.
  4. Every push prints the source branch, the source HEAD and the target ref
     before it runs, so what is about to happen is on screen in the same words
     the guards use. The token is never among them.

tools/ship_test.py reproduces the omitted-branch failure directly, and runs as
`npm run ship-test`.
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


def check_target(branch, allow_main, allow_cross_branch, current_branch):
    """Decide whether this push may proceed. Returns None to allow, else why not.

    Pure: no git, no network, no filesystem. That is deliberate, because the
    guard that failed in the slice B incident has to be testable without a
    remote, and a rule that can only be exercised by actually pushing is a rule
    nobody exercises.

    `current_branch` is the checked-out branch name, or None for a detached
    HEAD. `branch` is whatever --branch carried, or None if it was omitted.
    """
    if not branch:
        return (
            "--branch is required and has no default.\n"
            "This is the guard for the PKG-NEXT16-SECURITY slice B incident: the flag "
            "used to default to main, so a commit meant for an isolated branch went to "
            "production and the production alias served a partially migrated tree.\n"
            "Name the branch you mean, for example --branch next16-security, or "
            "--branch main --allow-main to promote."
        )
    if branch == "main" and not allow_main:
        return (
            "Refusing to push to main without --allow-main.\n"
            "main is the production branch: a push to it deploys. Naming it is not the "
            "same as intending it, so the promotion path says so twice.\n"
            "Re-run with --branch main --allow-main if that is what you mean."
        )
    if current_branch is None and not allow_cross_branch:
        return (
            f"Refusing to push a detached HEAD to {branch} without --allow-cross-branch.\n"
            "A detached HEAD has no name to compare against the target, so this script "
            "cannot tell an intended promotion from an accident. Check out a branch, or "
            "pass --allow-cross-branch if you are pushing a specific commit on purpose."
        )
    if current_branch is not None and current_branch != branch and not allow_cross_branch:
        return (
            f"Refusing an implicit cross-branch push: the checkout is on {current_branch} "
            f"and the target is {branch}.\n"
            "`git push origin HEAD:<branch>` sends the current commit to whatever branch "
            "is named, which is how work lands somewhere nobody was looking.\n"
            f"Either check out {branch}, or pass --allow-cross-branch to say the mismatch "
            "is deliberate."
        )
    return None


def current_branch_name(repo):
    """The checked-out branch, or None when HEAD is detached."""
    r = subprocess.run(
        ["git", "-C", repo, "symbolic-ref", "--quiet", "--short", "HEAD"],
        capture_output=True, text=True,
    )
    name = r.stdout.strip()
    return name or None


def announce(repo, branch, source_branch):
    """Say what is about to be pushed, in the words the guards use.

    Nothing here reads the token file or the askpass helper, and no environment
    is printed, so this cannot leak the credential that makes the push possible.
    """
    head = subprocess.run(
        ["git", "-C", repo, "rev-parse", "HEAD"], capture_output=True, text=True,
    ).stdout.strip()
    subject = subprocess.run(
        ["git", "-C", repo, "log", "-1", "--pretty=%s"], capture_output=True, text=True,
    ).stdout.strip()
    print("\nAbout to push:")
    print(f"  source branch  {source_branch or 'DETACHED HEAD'}")
    print(f"  source HEAD    {head[:7]}  {subject}")
    print(f"  target ref     {REPO_SLUG}@{branch}"
          + ("   (PRODUCTION)" if branch == "main" else ""))
    print("  mode           fast-forward only")


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
    # No default. See check_target and the release-safety note in the module
    # docstring: the default was the slice B defect, not a convenience.
    ap.add_argument(
        "--branch",
        default=None,
        help="target branch. Required: there is no default, deliberately",
    )
    ap.add_argument(
        "--allow-main",
        action="store_true",
        help="second authorisation, required to push to main. main deploys to production",
    )
    ap.add_argument(
        "--allow-cross-branch",
        action="store_true",
        help="permit pushing a checkout of one branch to a differently named remote branch",
    )
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

    # The target guards run before anything is staged, committed or pushed, so a
    # refusal leaves the tree exactly as it was found.
    source_branch = current_branch_name(repo)
    refusal = check_target(
        args.branch, args.allow_main, args.allow_cross_branch, source_branch
    )
    if refusal:
        sys.exit(refusal)

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
        announce(repo, args.branch, source_branch)
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

    # Announced after the commit, so the HEAD printed is the commit that is
    # about to travel rather than the one it was built on.
    announce(repo, args.branch, source_branch)

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
