# Alpha Waitlist Release Checklist

## Required Secrets

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `MAIL_FROM`
- `PUBLIC_APP_URL`
- `WAITLIST_IP_SALT`
- `WAITLIST_INVITE_TOKEN`

## Deploy Order

1. Deploy DB migration for `alpha_waitlist`.
2. Set/update function secrets in Supabase.
3. Deploy edge functions:
   - `waitlist-submit`
   - `waitlist-confirm`
   - `waitlist-invite`
4. Deploy frontend.

## End-to-End DOI Test

1. Open landing page and submit waitlist form with all required consents checked.
2. Verify success message says email confirmation is required.
3. Open received email and click confirmation link.
4. Verify confirmation page shows success.
5. In DB, verify row has:
   - `status = confirmed`
   - `confirmed_at` is set
   - `doi_token_hash` is null

## Invite Flow Test

1. Call `waitlist-invite` with `dryRun=true` and valid bearer `WAITLIST_INVITE_TOKEN`.
2. Verify target count and sample list are returned.
3. Call again with `dryRun=false` and low limit (e.g. 1-3).
4. Verify emails are delivered and DB row updates:
   - `status = invited`
   - `invite_sent_at` is set

## Rollback Notes

- Frontend can stay deployed; disabling new signups is possible by removing function secret `RESEND_API_KEY`.
- If needed, restore previous migration state using a follow-up migration (do not edit applied migration files).
