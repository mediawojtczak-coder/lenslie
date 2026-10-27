# Lenslie

Platforma do udostępniania zdjęć klientom fotografa.

## Technologie
- **Next.js** (strona i aplikacja), hosting na **Vercel** (przed startem przeniesienie na Cloudflare Workers)
- **Supabase**: konta fotografów, wybory klientów, statystyki
- **Cloudflare R2** (UE): zdjęcia, wersje do internetu, znak wodny, muzyka, logo
- **Resend**: e-maile (przypomnienia, powiadomienia)

## Strony
- `/` – strona główna, `/cennik`, `/regulamin`, `/polityka-prywatnosci`
- `/logowanie`, `/rejestracja`, `/haslo` – konto fotografa
- `/panel` – lista galerii; `/panel/galeria/[id]` – zdjęcia, wybory klientów, statystyki, ustawienia; `/panel/konto`
- `/galeria/[id]` – galeria klienta; `/galeria/[id]/goscie/[token]` – link dla gości
- `/admin` – panel administratora (adresy z `ADMIN_EMAILS`)
- `/api/cron/codziennie` – codzienne przypomnienia i usuwanie galerii 30 dni po wygaśnięciu (`vercel.json`)

## Ustawienia
Klucze do usług wpisz w Vercel (Settings → Environment Variables). Lista zmiennych jest w `.env.example`.

W Supabase:
1. SQL z tabelami `galleries`, `profiles`, `selections`, `gallery_events` (zasady RLS: fotograf widzi tylko swoje dane).
2. Authentication → URL Configuration: Site URL i Redirect URLs (`https://<domena>/**`).
3. Przed otwarciem rejestracji: włączyć zapisy, potwierdzanie e-maili i własny SMTP (Resend).

## Do zrobienia
1. Płatności (Przelewy24 / Stripe)
2. Domena lenslie.com
3. Wersja angielska (PL/EN)
4. Przeniesienie na Cloudflare Workers (cron → Cron Triggers)
