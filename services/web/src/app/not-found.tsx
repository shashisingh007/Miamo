import Link from 'next/link';

// ─── Root 404 page ───────────────────────────────────────────────
// Rendered by the Next.js App Router whenever a route is unmatched
// or a server component calls `notFound()`. Matches the brand chrome.
export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-miamo-bg px-6">
      <div className="max-w-md w-full bg-miamo-card rounded-2xl border border-zinc-200 p-8 text-center shadow-soft">
        <div className="text-6xl font-bold bg-gradient-to-r from-rose-main to-rose-dark bg-clip-text text-transparent mb-2">
          404
        </div>
        <h1 className="text-xl font-semibold text-text-primary mb-2">Page not found</h1>
        <p className="text-sm text-text-secondary mb-6">
          We couldn’t find what you were looking for. It may have moved or never existed.
        </p>
        <Link
          href="/"
          className="inline-block px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-main to-rose-dark text-white font-medium text-sm shadow-button hover:shadow-button-hover transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-main focus-visible:ring-offset-2"
        >
          Back to Miamo
        </Link>
      </div>
    </div>
  );
}
