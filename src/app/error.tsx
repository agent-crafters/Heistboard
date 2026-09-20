"use client";

export default function Error() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-ink text-paper">
      <section
        className="max-w-lg w-full p-8 rounded-xl border border-coral/40 bg-charcoal-900/90 backdrop-blur-md shadow-2xl shadow-coral/10"
        role="alert"
      >
        <p className="font-mono text-xs uppercase tracking-widest text-coral font-bold mb-2">
          Recovery available
        </p>
        <h1 className="text-2xl font-bold font-display tracking-wide text-white mb-3">
          Editor unavailable
        </h1>
        <p className="text-sm text-paper-muted leading-relaxed mb-6">
          The authoring tools did not finish loading. Reload the editor without
          sending or storing any Mission Plan data.
        </p>
        <div className="flex justify-end gap-3">
          <button
            className="inline-flex items-center justify-center px-5 py-2.5 font-mono text-xs uppercase tracking-wider font-bold rounded-lg bg-coral text-white hover:bg-coral-soft transition-all shadow-lg shadow-coral/20 cursor-pointer"
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
