# E-Mail-Vorlagen für Supabase Auth

Die HTML-Dateien in diesem Ordner sind **Kopier-Vorlagen** für das Supabase Dashboard:

**Dashboard:** Authentication → Email Templates

| Datei | Supabase-Template-Name |
|--------|-------------------------|
| `supabase-confirm-signup.html` | Confirm signup |
| `supabase-magic-link.html` | Magic Link |
| `supabase-reset-password.html` | Reset password |

**Betreffzeilen** (Subject) trägst du im Dashboard jeweils selbst ein (z. B. „Medic Inc – E-Mail bestätigen“).

**Wichtig für Passwort-Reset:** Unter **Authentication → URL Configuration** muss die Redirect-URL eurer App eingetragen sein, z. B.:

- `https://www.medicinc.de/reset-password`
- ggf. `http://localhost:5173/reset-password` für lokale Tests

Die App ruft `resetPasswordForEmail` mit `redirectTo: …/reset-password` auf.

**Platzhalter** kommen von Supabase (Go-Templates), z. B. `{{ .ConfirmationURL }}`, `{{ .Email }}`, `{{ .SiteURL }}` – nicht durch feste URLs ersetzen.
