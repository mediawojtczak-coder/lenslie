# Lenslie

Platforma do udostępniania zdjęć klientom fotografa.

## Technologie
- **Next.js** (strona i aplikacja), hosting na **Vercel**
- **Supabase** (baza danych i konta) – do podłączenia
- **Cloudflare R2** (przechowywanie zdjęć) – do podłączenia

## Strony
- `/` – strona główna
- `/logowanie` – logowanie fotografa
- `/panel` – panel fotografa
- `/galeria/[id]` – galeria widziana przez klienta

## Ustawienia
Klucze do usług wpisz w Vercel (Settings → Environment Variables).
Lista potrzebnych zmiennych jest w pliku `.env.example`.

## Plan
1. Wgrywanie zdjęć do R2 i miniatury
2. Galeria z hasłem dla klienta
3. Konta fotografów i panel
4. Wersja angielska (PL/EN)
5. Płatności i rezerwacje
