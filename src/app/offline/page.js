export const metadata = {
  title: 'Offline – LIVORA',
};

export default function OfflinePage() {
  return (
    <main className="main-content">
      <div style={{ textAlign: 'center', padding: '4rem 1.5rem' }}>
        <h1 className="kategorie-title">Keine Verbindung</h1>
        <p className="tracker-sub">
          Diese Seite ist offline nicht verfügbar. Stelle eine Internetverbindung her und versuche es erneut.
        </p>
      </div>
    </main>
  );
}
