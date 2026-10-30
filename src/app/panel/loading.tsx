// Pokazuje się natychmiast po kliknięciu, zanim serwer przygotuje stronę panelu
export default function PanelLoading() {
  return (
    <div className="app-body" aria-busy="true" aria-label="Ładowanie…">
      <main className="app-main">
        <div className="page-loading">
          <div className="sk sk-line" style={{ width: "32%", height: 22 }} />
          <div className="sk sk-card" />
          <div className="sk-grid">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="sk sk-photo" />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
