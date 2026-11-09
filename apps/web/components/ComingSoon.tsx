import Link from 'next/link';

// Placeholder for screens that are built in later steps, so the bottom bar never leads to a 404.
export default function ComingSoon({ title, note }: { title: string; note: string }) {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center px-8 text-center">
      <h1 className="text-2xl font-extrabold">{title}</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-muted">{note}</p>
      <Link href="/" className="mt-6 flex h-12 items-center rounded-2xl bg-brand px-6 font-bold text-white">Back to Home</Link>
    </main>
  );
}
