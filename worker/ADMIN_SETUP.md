# DUVERO Admin – deployment checklist

The code is committed to GitHub, but is NOT live until the steps below are completed.

1. In Cloudflare D1, open the database bound as `DUVERO_DB` to the existing Worker `duvero-quote-api`. In the SQL Console run all statements in `worker/admin-schema.sql`. Back up existing data first. Do not replace the existing `locations` table.
2. In Worker Settings > Variables and Secrets add `ADMIN_PASSWORD` as a strong unique secret (one shared admin password), and `ADMIN_SESSION_SECRET` as an independent random secret of at least 32 bytes. Do not put passwords in GitHub or front-end JavaScript.
3. Configure Cloudflare Access or equivalent rate-limiting / WAF protection for the admin login endpoint, and preferably the admin page. The app has a signed eight-hour session token held only in browser memory.
4. Replace the existing Worker code with the latest `worker/worker.js` from GitHub and Deploy. Retain existing bindings and secrets: `DUVERO_DB`, `RESEND_API_KEY`, `QUOTE_RECIPIENT`, `TURNSTILE_SECRET_KEY`, `QUOTE_ENABLED`, `ALLOWED_ORIGIN`.
5. The admin UI lives at `/admin/` and needs Cloudflare Pages to serve the committed `admin/index.html` and `admin/admin.js`.
6. Submit a test enquiry using `/quote.html?test=1`, confirm it appears in Admin with a monthly quotation number, save prices, preview, and send to a controlled test email address.
7. IMPORTANT: the generated quotation PDF in this first implementation is a basic quote summary using the existing Worker PDF helper. It is not yet the approved three-page branded offer with the full NSAB conditions. Do not use the Send button for real customer quotations until the approved three-page template has been implemented and tested.
8. Compare Freight creates separate numbered records for each selected mode. Ensure all selected modes and data are reviewed during testing.
