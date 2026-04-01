# Alpha Waitlist Release Checklist

## Required Secrets

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `MAIL_FROM`
- `PUBLIC_APP_URL`
- `WAITLIST_IP_SALT`
- `WAITLIST_INVITE_TOKEN`
- `ALPHA_REGISTRATION_CODE` (server-only; der Einladungs-String für Alpha-Registrierung)
- `ALPHA_REGISTRATION_JWT_SECRET` (mindestens 32 Zeichen; zum Signieren des kurz gültigen Registrierungs-Tokens)

## Deploy Order

1. Deploy DB migration for `alpha_waitlist`.
2. Set/update function secrets in Supabase.
3. Deploy edge functions:
   - `waitlist-submit`
   - `waitlist-confirm`
   - `waitlist-invite`
   - `alpha-registration-gate` (öffentlich, Code-Prüfung + JWT)
   - `alpha-register` (öffentlich, erstellt User per Service Role nach gültigem JWT)
4. Deploy frontend.

## Alpha-Registrierung (sicher)

1. In Supabase **Authentication → Providers → Email**: „Enable email signups“ deaktivieren, sobald die Alpha-Registrierung nur noch über die Edge Function laufen soll (sonst kann jemand weiterhin `signUp` direkt gegen die API aufrufen).
2. Secrets `ALPHA_REGISTRATION_CODE` und `ALPHA_REGISTRATION_JWT_SECRET` setzen.
3. Functions deployen: `alpha-registration-gate` und `alpha-register` mit `--no-verify-jwt` (die Absicherung erfolgt über Code + JWT im Body, nicht über User-JWT).
4. Test: Code auf `/register-gate` eingeben → Token → Registrierung abschließen → User in **Authentication → Users** sichtbar.

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
