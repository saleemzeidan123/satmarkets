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

## What to judge each option on

Criteria named in the owner's own mandate: deliverability, SPF, DKIM, DMARC,
bounce handling, webhooks, Arabic rendering, privacy, cost, rate limits, and how
directly each integrates with Supabase Auth's SMTP settings.

## The options, compared

| | Resend | Postmark | AWS SES | SendGrid |
| --- | --- | --- | --- | --- |
| Supabase integration | Named in Supabase's own SMTP docs as a common pairing; standard SMTP credentials, no code change | Standard SMTP credentials | Standard SMTP credentials; needs a verified domain and, for volume, a production-access request | Standard SMTP credentials |
| SPF / DKIM | Domain verification issues both, guided setup | Domain verification issues both, guided setup | Domain verification issues both, guided setup | Domain verification issues both, guided setup |
| DMARC | Not automatic; SAT Markets would still author and publish its own DMARC record regardless of provider | Same | Same | Same |
| Bounce / complaint handling | Dashboard events, webhook available | Dashboard events plus a dedicated bounce/complaint feed, historically strong deliverability reputation for transactional mail | Requires wiring SNS notifications for bounce/complaint; more setup, no built-in dashboard feed | Dashboard events, webhook available |
| Webhooks | Yes | Yes | Via SNS/SQS, not a native webhook | Yes |
| Arabic rendering | Plain SMTP relay; rendering is whatever the existing Supabase template already produces today, not provider-dependent | Same | Same | Same |
| Free tier / cost shape | Free tier then per-email pricing | No perpetual free tier; per-email pricing from the start | Pay-as-you-go, generally the lowest per-email cost at volume | Free tier then per-email pricing |
| Rate limit ceiling | Provider-side limits far above Supabase's built-in 2/hour; exact tier depends on plan | Same | Same, and SES starts in a sandbox (verified recipients only) until a production-access request is approved | Same |
| Privacy / data residency | Provider processes recipient email addresses and message content; standard for any transactional-email provider | Same | Same, under AWS's existing data-processing terms if SAT Markets already has an AWS account | Same |

## What every option shares, so it does not need repeating per row

Any of the four removes the 2/hour ceiling. Every one still requires DNS records
(SPF/DKIM at minimum, DMARC as a separate, provider-independent step) on whatever
domain sends the mail. None of them changes what the Reset Password / Invite User
templates render; that content is authored in Supabase's own template editor
regardless of which SMTP relay carries it.

## What this card deliberately does not do

It does not rank the four. It does not estimate SAT Markets' actual send volume
(which would drive the cost comparison), because that has not been asked for or
supplied. It does not check whether SAT Markets or Saleem already holds an account
with any of these providers, which would change the practical setup cost. Answering
either of those is the natural next step once a decision to proceed is made, not
before.
