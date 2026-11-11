import Link from 'next/link';

// A real 404 (search engines drop the page) with ways back, instead of an empty screen.
export default function NotFound() {
  return (
    <main className="px-5 pt-16 text-center">
      <h1 className="text-2xl font-extrabold">We could not find that page</h1>
      <p className="mt-2 text-[15px] text-muted">The link may be old, or the paper may have been removed.</p>
      <div className="mx-auto mt-6 flex max-w-xs flex-col gap-2.5">
        <Link href="/papers" className="flex h-12 items-center justify-center rounded-2xl bg-brand font-bold text-white">Browse past papers</Link>
        <Link href="/" className="flex h-12 items-center justify-center rounded-2xl border-[1.5px] border-edge bg-white font-bold">Go home</Link>
      </div>
    </main>
  );
}
