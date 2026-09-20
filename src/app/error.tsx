"use client";

export default function Error() {
  return (
    <main className="shell">
      <section className="recovery-panel" role="alert">
        <p className="section-label">Recovery available</p>
        <h1>Editor unavailable</h1>
        <p>
          The authoring tools did not finish loading. Reload the editor without
          sending or storing any Mission Plan data.
        </p>
        <div className="actions">
          <button
            className="button button-primary"
            type="button"
            onClick={() => window.location.reload()}
          >
            Reload editor
          </button>
        </div>
      </section>
    </main>
  );
}
