import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

type BookPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function BookPage({ params }: BookPageProps) {
  const { id } = await params;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: book, error } = await supabase
    .from("books")
    .select("id, title, author, publisher, tag, description, cover_url")
    .eq("id", Number(id))
    .single();

  if (error || !book) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="mb-8 inline-flex rounded-xl border border-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-900"
        >
          ← Înapoi
        </Link>

        <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-4">
            <div className="overflow-hidden rounded-2xl">
              {book.cover_url ? (
                <img
                  src={book.cover_url}
                  alt={book.title}
                  className="h-[420px] w-full object-cover"
                />
              ) : (
                <div className="flex h-[420px] items-end bg-gradient-to-b from-amber-300 to-amber-700 p-6">
                  <div className="w-full rounded-xl bg-black/20 p-4 text-white">
                    <p className="text-xl font-bold">{book.title}</p>
                    <p className="mt-2 text-sm">{book.author}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
            {book.tag && (
              <span className="inline-block rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-300">
                {book.tag}
              </span>
            )}

            <h1 className="mt-4 text-3xl font-bold">{book.title}</h1>
            <p className="mt-2 text-lg text-zinc-300">{book.author}</p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <Info label="Autor" value={book.author} />
              <Info label="Editură" value={book.publisher ?? "—"} />
              <Info label="Categorie" value={book.tag ?? "—"} />
              <Info label="Status" value="Disponibilă" />
            </div>

            <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
              <p className="text-xs uppercase text-zinc-500">Descriere</p>
              <p className="mt-3 text-sm leading-6 text-zinc-300">
                {book.description ?? "Fără descriere."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
      <p className="text-xs uppercase text-zinc-500">{label}</p>
      <p className="mt-2 text-sm text-zinc-200">{value}</p>
    </div>
  );
}