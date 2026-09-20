export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="w-full max-w-xl rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-6 flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Phase 01: Initialized
          </span>
          <span className="text-xs font-mono text-zinc-400 dark:text-zinc-500">
            v0.1.0
          </span>
        </div>

        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
          Doctor Patient Management System
        </h1>

        <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          Core architectural foundation configured. Ready for subsequent modular feature implementation.
        </p>

        <div className="mt-8 border-t border-zinc-100 pt-6 dark:border-zinc-800">
          <dl className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <dt className="text-zinc-400 dark:text-zinc-500">Architecture</dt>
              <dd className="mt-1 font-medium text-zinc-700 dark:text-zinc-300">
                Modular Monolith
              </dd>
            </div>
            <div>
              <dt className="text-zinc-400 dark:text-zinc-500">Runtime</dt>
              <dd className="mt-1 font-medium text-zinc-700 dark:text-zinc-300">
                Next.js App Router
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </main>
  );
}
