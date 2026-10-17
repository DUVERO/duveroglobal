# DUVERO quote email integration (not yet enabled)

This Cloudflare Worker sends quote requests using Resend without exposing the API key to visitors. **It is not deployed and the website remains in test mode.**

1. Create a free Gmail address to receive quote requests.
2. Verify `duveroglobal.com` as a sending domain in Resend and add its SPF/DKIM records in Cloudflare DNS. Follow Resend's exact DNS instructions; do not replace existing mail MX records.
3. Deploy this Worker separately using Cloudflare Wrangler in the `worker/` directory. Set `RESEND_API_KEY` and `QUOTE_RECIPIENT` as Worker secrets. Never put keys in the frontend or GitHub.
4. Before enabling production, add abuse protection (Turnstile and/or rate limiting), test CORS, input validation, Gmail delivery, Reply-To, and error handling.
5. Set `QUOTE_ENABLED=true` only when ready, then explicitly connect the website to the Worker URL in a separate change. Do not remove the site's test banner before a real successful delivery test.

The Gmail inbox can receive these messages, but it cannot automatically receive direct mail addressed to info@duveroglobal.com. For that, configure Cloudflare Email Routing or a mailbox service separately.

**Important:** This is a deployment scaffold, not a live mail service. The current frontend intentionally makes no network requests.
