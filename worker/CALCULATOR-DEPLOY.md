# DUVERO quotation calculator deployment

## Status
The calculator UI and API changes are committed to GitHub, but Cloudflare D1 and the Worker must be deployed separately. Do not enable the new Admin calculator before completing these steps.

## 1. Database
Open Cloudflare > Workers & Pages > D1 > DUVERO_DB > Console.
Run the statements in `worker/admin-calculator-migration.sql` **once**.
Note: the final ALTER TABLE is not repeatable. If the calculation_data column already exists, skip that statement. Ensure earlier finance, tracking, and email migrations have been applied.

## 2. Worker
Deploy the latest `worker/worker.js` to the existing `duvero-quote-api` Worker. Preserve existing environment variables, secrets, D1 bindings, routes and authentication settings.

## 3. Frontend
GitHub Pages deploys the Admin changes from the default branch. Refresh the page without cache.

## 4. Smoke test (before real customer use)
- Log into Admin and create a supplier.
- Create a charge definition with basis CW and another with Flat.
- Set air conversion to 166.6666667 kg/m³.
- Open a test air RFQ, verify gross kg and CBM from cargo rows.
- Enter net/sale rates, override CW, verify recalculated totals and save.
- Reload the RFQ; verify the calculation and supplier persisted.
- Preview the customer PDF: verify it shows sale prices only, never net rates, suppliers, or costs.
- Verify a previously sent quote cannot be changed by calculator save without first creating a revised draft.
- Do not send a real customer quotation until all tests pass.

## Important
This calculator currently uses one quotation currency for all cost and sale lines. Convert supplier currency before entry. Per-supplier currencies and minimum charges are not yet supported.
