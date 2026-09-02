# Custom SMTP provider, decision card

This is a comparison for Saleem to decide from later. It is not a recommendation to
purchase or configure anything now. No provider has been chosen, contacted, or
configured. It exists because the Supabase built-in mailer's fixed rate limit
(observed at 2 emails/hour, confirmed by the dashboard's own tooltip: "The built-in
email service has a fixed rate limit. Set up a custom SMTP provider or enable the
Send Email hook to update your email rate limit") is currently the blocking cause
on three rows of the blocked-evidence queue in the root `CLAUDE.md`. Raising it
requires either a custom SMTP provider or the Send Email hook; neither is enabled
today, and this package explicitly does not enable either.

**What a custom SMTP provider actually changes.** It replaces Supabase's own
built-in mailer (and that mailer's fixed 2/hour ceiling) with the provider's SMTP
relay. It does not create unlimited sending. Each provider imposes its own account,
plan, and reputation-based limits underneath, and Supabase's own send path adds no
further ceiling once a custom SMTP host is configured. Which specific limit binds
in practice depends on the plan chosen and the provider's own anti-abuse rules, not
on this comparison.

## What to judge each option on

Criteria named in the owner's own mandate: deliverability, SPF, DKIM, DMARC,
bounce handling, webhooks, Arabic rendering, privacy, cost, rate limits, and how
directly each integrates with Supabase Auth's SMTP settings.

## Sourcing and its limits

Pricing and free-tier figures below were fetched live from each provider's own
pricing page on 2026-09-02, with the exact source URL and quote given per row. Two
gaps, disclosed rather than papered over: SendGrid's pricing page redirected in a
loop across `sendgrid.com/en-us/pricing`, `twilio.com/en-us/sendgrid`, and
`sendgrid.com/pricing/` in this session and could not be captured live, so its row
is marked unconfirmed rather than filled from memory. AWS's own sandbox-mode
sending-quota documentation page returned no extractable text this session (likely
client-rendered), so the sandbox numbers are marked unconfirmed rather than
asserted from general knowledge that was not itself re-verified here. Neither gap
should be treated as resolved without a fresh, successful fetch.

## The options, compared

| | Resend | Postmark | AWS SES | SendGrid |
| --- | --- | --- | --- | --- |
| Supabase integration | Named in Supabase's own SMTP docs as a common pairing; standard SMTP credentials, no code change | Standard SMTP credentials | Standard SMTP credentials; needs a verified domain and, for volume, a production-access request out of the sandbox | Standard SMTP credentials |
| SPF / DKIM | Domain verification issues both, guided setup | Domain verification issues both, guided setup | Domain verification issues both, guided setup | Domain verification issues both, guided setup |
| DMARC | Not automatic; SAT Markets would still author and publish its own DMARC record regardless of provider | Same | Same | Same |
| Bounce / complaint handling | Dashboard events, webhook available | Dashboard events plus a dedicated bounce/complaint feed | Requires wiring SNS notifications for bounce/complaint; more setup, no built-in dashboard feed | Dashboard events, webhook available (unconfirmed against a live source this session) |
| Webhooks | Yes | Yes | Via SNS/SQS, not a native webhook | Yes, per general product documentation (unconfirmed against a live source this session) |
| Arabic rendering | Plain SMTP relay; rendering is whatever the existing Supabase template already produces today, not provider-dependent | Same | Same | Same |
| Free tier | "The Free plan is limited to 100 emails per day," 3,000/month included. Source: resend.com/pricing, fetched 2026-09-02 | "Test your integration with 100 emails/month. No overages allowed in this plan." Source: postmarkapp.com/pricing, fetched 2026-09-02 | No SES-specific free tier found on the pricing page; AWS's general new-account credit ("up to $200 in AWS Free Tier credits... available for 6 months") is not SES-specific. Source: aws.amazon.com/ses/pricing, fetched 2026-09-02 | Not confirmed live this session; pricing page redirected in a loop (see Sourcing above) |
| Paid tiers | Pro: $20/mo for 50,000 emails, $35/mo for 100,000. Scale: $90/mo (100,000) up to $1,150/mo (2,500,000); enterprise custom above 3M/month. Source: resend.com/pricing, fetched 2026-09-02 | All paid tiers start at 10,000 emails/month, "Unlimited emails/day": Basic $15.00/mo ($1.80/1,000 overage), Pro $16.50/mo ($1.30/1,000), Platform $18.00/mo ($1.20/1,000). Source: postmarkapp.com/pricing, fetched 2026-09-02 | Pay-as-you-go, "$0.10 / 1,000 emails" ($0.0001/email). Source: aws.amazon.com/ses/pricing, fetched 2026-09-02 | Not confirmed live this session |
| Documented send-rate ceiling (per second/minute/hour) | None found on the pricing page itself; only the daily Free-plan figure above is stated there | None found on the pricing page itself | Sandbox-mode default quota and max send rate not confirmed live this session (see Sourcing above); do not treat any remembered figure as verified here | Not confirmed live this session |
| Privacy / data residency | Provider processes recipient email addresses and message content under its own terms; not verified as equivalent to any other provider here | Its own separate terms; not verified as equivalent to any other provider here | Falls under AWS's own existing account terms if SAT Markets already has an AWS account; not verified as equivalent to any other provider here | Its own separate terms; not verified as equivalent to any other provider here |

## What every option shares, so it does not need repeating per row

Every one still requires DNS records (SPF/DKIM at minimum, DMARC as a separate,
provider-independent step) on whatever domain sends the mail. None of them changes
what the Reset Password / Invite User templates render; that content is authored in
Supabase's own template editor regardless of which SMTP relay carries it.

## What this card deliberately does not do

It does not rank the four, and nothing above should be read as a recommendation for
one over another. It does not estimate SAT Markets' actual send volume (which would
drive the cost comparison), because that has not been asked for or supplied. It
does not check whether SAT Markets or Saleem already holds an account with any of
these providers, which would change the practical setup cost. It does not treat any
provider's deliverability reputation, support quality, or general standing as
established fact without a cited source; unsourced claims from an earlier draft of
this card have been removed rather than left in place. Answering the volume and
existing-account questions is the natural next step once a decision to proceed is
made, not before, and the two sourcing gaps above should be closed with a fresh
fetch before this card is relied on for a final decision.
