// Przycisk „Wyloguj” na dole menu bocznego panelu fotografa
export default function SideLogout() {
  return (
    <form method="post" action="/auth/wyloguj" className="side-logout">
      <button type="submit">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M10 16l-4-4 4-4M6 12h10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Wyloguj
      </button>
    </form>
  );
}
