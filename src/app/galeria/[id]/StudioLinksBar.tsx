import type { StudioLinks } from "@/lib/studio-links";

// Cienki, elegancki pasek: Facebook, Instagram i telefon fotografa
export default function StudioLinksBar({ links, en }: { links: StudioLinks; en?: boolean }) {
  const tel = links.phone?.replace(/[^\d+]/g, "");
  return (
    <nav className="g-studio" aria-label={en ? "Contact the photographer" : "Kontakt z fotografem"}>
      {links.facebook && (
        <a href={links.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook">
          <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true">
            <path d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.5-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.8 1.4-3.8 3.9v2.3H8v3h2.5V21" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
          </svg>
        </a>
      )}
      {links.instagram && (
        <a href={links.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
          <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true">
            <rect x="3.75" y="3.75" width="16.5" height="16.5" rx="4.75" fill="none" stroke="currentColor" strokeWidth="1.3" />
            <circle cx="12" cy="12" r="3.9" fill="none" stroke="currentColor" strokeWidth="1.3" />
            <circle cx="17.1" cy="6.9" r=".9" fill="currentColor" />
          </svg>
        </a>
      )}
      {links.phone && (
        <>
          <i aria-hidden="true" />
          <a href={`tel:${tel?.startsWith("+") ? tel : `+48${tel}`}`} className="g-studio-tel">
            <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
              <path d="M6.6 3.8h2.6l1.4 4-1.9 1.3a10.5 10.5 0 0 0 6.2 6.2l1.3-1.9 4 1.4v2.6a2 2 0 0 1-2.1 2A16.3 16.3 0 0 1 4.6 5.9a2 2 0 0 1 2-2.1Z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
            </svg>
            {links.phone}
          </a>
        </>
      )}
    </nav>
  );
}
