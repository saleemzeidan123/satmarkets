# Codex audit findings register, status tracking

Source: Codex audit 2026-07-22, snapshot `6c6797e`. Statuses per Codex direction:
Confirmed open | Partially addressed | Blocked by evidence or decision |
Fixed and awaiting deployment verification | Closed with live evidence |
Not independently reverified. "Partially addressed" never counts as fixed.
Original rank and severity are preserved. Update this file in the same commit as
any fix; move to "Closed with live evidence" only after live EN and AR checks.

| Rank | Sev | Finding (short) | Status after PKG-0A | Evidence / note |
| --- | --- | --- | --- | --- |
| 1 | P0 | Arabic body/UI inherits Hanken via --sans | Closed with live evidence | PKG-1A WS08: direction-aware `--sans`/`--serif` tokens plus `html[dir=rtl]` body/footer/skip-link/form-control family. Live computed-style sweep on 5 AR pages (home, listings, rent-index, requirements, brokers; 1,589 Arabic nodes) shows 0 Hanken-Latin nodes. |
