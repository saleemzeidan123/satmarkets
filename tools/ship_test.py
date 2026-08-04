#!/usr/bin/env python3
"""Tests for the release-safety guards in tools/ship.py.

Why this file exists
--------------------
PKG-NEXT16-SECURITY slice B was shipped with the branch flag omitted. The flag
defaulted to main, so a Next.js framework migration commit that was supposed to
sit on an isolated branch went to the production branch instead, and the
production alias served a partially migrated tree for the rest of the package.
No test could have caught it, because the defect was a default value and there
was nothing that read defaults.

So the guard was written as a pure function, check_target, that takes the four
things the decision actually depends on and returns either None to allow the
push or the refusal text. It touches no git, no network and no filesystem,
which is what makes the incident reproducible here in one line.

The first test below is that reproduction: it calls check_target the way the
slice B invocation would have called it, with branch omitted, and asserts the
push is refused. Under the old code that same call would have carried
branch="main" and been allowed.

Run: npm run ship-test   (or python3 tools/ship_test.py)
"""

import ast
import pathlib
import re
import sys

# Importing ship.py must not leave a compiled copy in the tree. One was
# committed by accident once already; the .gitignore rule and this line are
# the two halves of not doing it again.
sys.dont_write_bytecode = True

ROOT = pathlib.Path(__file__).resolve().parent.parent
SHIP = ROOT / "tools" / "ship.py"

sys.path.insert(0, str(ROOT / "tools"))
import ship  # noqa: E402

FAILURES = []
PASSES = 0


def check(name, condition, detail=""):
    global PASSES
    if condition:
        PASSES += 1
    else:
        FAILURES.append(f"{name}\n    {detail}" if detail else name)


def refused(branch, allow_main=False, allow_cross=False, current="next16-security"):
    return ship.check_target(branch, allow_main, allow_cross, current)


# 1. The incident itself, reproduced.
r = refused(None, current="next16-security")
check(
    "omitting the branch is refused (the slice B failure)",
    r is not None,
    "check_target returned None, meaning a push with no --branch would proceed",
)
check(
    "the refusal names the flag the caller has to add",
    r is not None and "--branch" in r,
    f"refusal text was: {r!r}",
)
check(
    "the refusal explains the incident rather than only the rule",
    r is not None and "slice B" in r,
    "a bare 'required argument' message teaches nobody why",
)

# 2. The default is gone at the source level. check_target cannot see argparse,
#    so the guard is only real if the flag genuinely has no default.
tree = ast.parse(SHIP.read_text())
branch_defaults = []
for node in ast.walk(tree):
    if not isinstance(node, ast.Call):
        continue
    func = node.func
    if not (isinstance(func, ast.Attribute) and func.attr == "add_argument"):
        continue
    if not node.args:
        continue
    first = node.args[0]
    if isinstance(first, ast.Constant) and first.value == "--branch":
        for kw in node.keywords:
            if kw.arg == "default":
                branch_defaults.append(ast.literal_eval(kw.value))

check(
    "--branch is declared exactly once",
    len(branch_defaults) <= 1,
    f"found {len(branch_defaults)} defaults for --branch: {branch_defaults}",
)
check(
    "--branch has no default value",
    branch_defaults in ([], [None]),
    f"--branch still defaults to {branch_defaults!r}; that default was the defect",
)

# 3. main needs a second, explicit authorisation.
r = refused("main", current="main")
check("pushing main without --allow-main is refused", r is not None)
check(
    "the main refusal names --allow-main",
    r is not None and "--allow-main" in r,
    f"refusal text was: {r!r}",
)
check(
    "main with --allow-main from a main checkout is allowed",
    refused("main", allow_main=True, current="main") is None,
    "the promotion path must remain usable, or it will be worked around",
)

# 4. Cross-branch pushes are refused unless said out loud.
r = refused("main", allow_main=True, current="next16-security")
check(
    "a next16-security checkout pushing to main is refused as cross-branch",
    r is not None,
    "this is the shape of the slice B push: HEAD:main from a feature checkout",
)
check(
    "the cross-branch refusal names both branches",
    r is not None and "next16-security" in r and "main" in r,
    f"refusal text was: {r!r}",
)
check(
    "cross-branch is allowed when --allow-cross-branch is passed",
    refused("main", allow_main=True, allow_cross=True, current="next16-security") is None,
)
check(
    "a matching checkout and target is allowed",
    refused("next16-security", current="next16-security") is None,
    "the ordinary case must stay one flag, not three",
)

# 5. A detached HEAD has no name to compare, so it is refused by default.
r = ship.check_target("next16-security", False, False, None)
check("a detached HEAD is refused", r is not None)
check(
    "the detached-HEAD refusal says HEAD is detached",
    r is not None and "detached" in r.lower(),
    f"refusal text was: {r!r}",
)
check(
    "a detached HEAD is allowed with --allow-cross-branch",
    ship.check_target("next16-security", False, True, None) is None,
)

# 6. Both authorisation flags exist and neither is on by default.
src = SHIP.read_text()
for flag in ("--allow-main", "--allow-cross-branch"):
    check(
        f"{flag} is declared as a store_true flag",
        re.search(
            r'add_argument\(\s*"' + re.escape(flag) + r'"[^)]*store_true',
            src,
            re.S,
        )
        is not None,
        f"{flag} not found as an opt-in flag",
    )

# 7. Fast-forward-only behaviour is preserved. A guard that can be stepped
#    around with a force push is decoration.
check(
    "no force push anywhere in ship.py",
    "--force" not in src and "-f\"" not in src and "'-f'" not in src,
    "ship.py must never force-push: fast-forward only is what makes a bad push recoverable",
)
check(
    "the push is still HEAD:<branch> through git push",
    'git(["push", "origin", f"HEAD:{args.branch}"]' in src,
    "the push shape changed; re-read this test before changing it",
)

# 8. The announcement runs on both push paths and leaks nothing.
check(
    "announce is called on both the push-only and the commit-and-push paths",
    src.count("announce(repo, args.branch, source_branch)") == 2,
    f"found {src.count('announce(repo, args.branch, source_branch)')} announce calls, expected 2",
)
# The docstring is prose about what announce must not do, so it is stripped
# before the body is examined. What matters is the code, not the promise.
announce_node = next(
    n for n in ast.walk(tree)
    if isinstance(n, ast.FunctionDef) and n.name == "announce"
)
body = list(announce_node.body)
if body and isinstance(body[0], ast.Expr) and isinstance(body[0].value, ast.Constant) \
        and isinstance(body[0].value.value, str):
    body = body[1:]
announce_src = "\n".join(ast.unparse(n) for n in body)
for forbidden in ("token", "askpass", "environ", "env["):
    check(
        f"announce does not touch {forbidden}",
        forbidden not in announce_src,
        "the pre-push announcement must not be able to print the credential",
    )

# 9. The guard runs before anything is staged, committed or pushed.
guard_at = src.index("refusal = check_target(")
for later in ('git(["add", "-A"], repo)', '"commit", "-m", args.message'):
    check(
        f"the guard runs before {later.split('(')[0].strip()}",
        guard_at < src.index(later),
        "a refusal must leave the working tree exactly as it was found",
    )

# 10. The closing line tells the truth about production on both push paths.
# The commit-and-push path used to say "Vercel will build this push to
# production" after every ship, including branch ships that never went near
# production. That is the slice B error in words rather than in refs: a message
# that reads as a production event when nothing reached production. Both paths
# now close through one function, so there is one sentence to keep true rather
# than two to drift apart.
check(
    "both push paths close through report()",
    src.count("report(sha, args.branch)") == 2,
    f"found {src.count('report(sha, args.branch)')} report calls, expected 2",
)
check(
    "the production sentence is written exactly once",
    src.count("Vercel will build this push to production") == 1,
    "a second copy is a second place for the claim to become untrue",
)

import builtins  # noqa: E402

_out = []
_real_print = builtins.print
try:
    builtins.print = lambda *a, **k: _out.append(" ".join(str(x) for x in a))
    ship.report("0123456789abcdef", "next16-security")
    branch_text = "\n".join(_out)
    _out.clear()
    ship.report("0123456789abcdef", "main")
    main_text = "\n".join(_out)
finally:
    builtins.print = _real_print

check(
    "a branch ship says nothing reached production",
    "nothing reached production" in branch_text,
    branch_text,
)
check(
    "a branch ship does not claim production is building",
    "Vercel will build this push to production" not in branch_text,
    branch_text,
)
check(
    "a main ship does say production is building",
    "Vercel will build this push to production" in main_text,
    main_text,
)
check(
    "both paths close with the commit that was made",
    all(f"{ship.REPO_SLUG}/commit/0123456789abcdef" in t
        for t in (branch_text, main_text)),
    "the ship must always end with the commit URL",
)

print(f"ship_test: {PASSES} checks passed, {len(FAILURES)} failed")
if FAILURES:
    for f in FAILURES:
        print("  FAIL  " + f)
    sys.exit(1)
