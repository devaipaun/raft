"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Book = {
  id: number;
  title: string;
  author: string;
  publisher: string | null;
  tag: string | null;
  description: string | null;
  cover_url: string | null;
};

export default function Home() {
  const [query, setQuery] = useState("");
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBooks = async () => {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("books")
        .select(
          "id, title, author, publisher, tag, description, cover_url"
        )
        .order("id", { ascending: true });

      if (error) {
        console.error("Eroare:", error.message);
        setBooks([]);
      } else {
        setBooks(data ?? []);
      }

      setLoading(false);
    };

    fetchBooks();
  }, []);

  const filteredBooks = useMemo(() => {
    const q = query.trim().toLowerCase();

    if (!q) return books;

    return books.filter((book) => {
      return (
        book.title.toLowerCase().includes(q) ||
        book.author.toLowerCase().includes(q) ||
        (book.publisher ?? "").toLowerCase().includes(q) ||
        (book.tag ?? "").toLowerCase().includes(q)
      );
    });
  }, [books, query]);

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* HEADER */}
        <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-2 text-sm uppercase tracking-[0.2em] text-zinc-400">
              Biblioteca personală
            </p>
            <h1 className="text-4xl font-bold tracking-tight">Raft</h1>
            <p className="mt-2 max-w-2xl text-sm text-zinc-400">
              Găsește rapid ce ai în bibliotecă și verifică dacă ai deja o carte.
            </p>
          </div>

          {/* SEARCH */}
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Caută după titlu, autor, editură..."
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm outline-none md:w-80"
          />
        </header>

        {/* STATS */}
        <section className="mb-8 grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
          <Stat label="Total cărți" value={books.length} />
          <Stat label="Rezultate" value={filteredBooks.length} />
          <Stat
            label="Edituri"
            value={new Set(books.map((b) => b.publisher).filter(Boolean)).size}
          />
          <Stat
            label="Tag-uri"
            value={new Set(books.map((b) => b.tag).filter(Boolean)).size}
          />
        </section>

        {/* HEADER LIST */}
        <section className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Cărți</h2>
            <p className="text-sm text-zinc-400">
              {query ? `Rezultate pentru "${query}"` : "Toate cărțile"}
            </p>
          </div>

          <Link
            href="/admin"
            className="rounded-xl border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-900"
          >
            + Adaugă carte
          </Link>
        </section>

        {/* CONTENT */}
        {loading ? (
          <p>Se încarcă...</p>
        ) : filteredBooks.length === 0 ? (
          <p>Nu există rezultate</p>
        ) : (
          <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
            {filteredBooks.map((book, index) => (
              <Link
                key={book.id}
                href={`/books/${book.id}`}
                className="group overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800"
              >
                <div className="p-3">
                  {/* 🔥 COPERTA */}
                  <div className="relative mb-3 h-56 overflow-hidden rounded-xl">
                    {book.cover_url ? (
                      <img
                        src={book.cover_url}
                        alt={book.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div
                        className={`flex h-full items-end p-4 ${
                          [
                            "bg-gradient-to-b from-amber-300 to-amber-700",
                            "bg-gradient-to-b from-sky-300 to-blue-700",
                            "bg-gradient-to-b from-rose-300 to-red-700",
                            "bg-gradient-to-b from-emerald-300 to-green-700",
                            "bg-gradient-to-b from-violet-300 to-purple-700",
                            "bg-gradient-to-b from-orange-300 to-orange-700",
                            "bg-gradient-to-b from-cyan-300 to-cyan-700",
                            "bg-gradient-to-b from-lime-300 to-lime-700",
                          ][index % 8]
                        }`}
                      >
                        <div className="w-full bg-black/20 p-2 text-white text-sm">
                          {book.title}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* TEXT */}
                  <div className="space-y-1">
                    {book.tag && (
                      <span className="text-xs text-zinc-400">
                        {book.tag}
                      </span>
                    )}
                    <p className="text-sm font-semibold">{book.title}</p>
                    <p className="text-xs text-zinc-400">{book.author}</p>
                  </div>
                </div>
              </Link>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}

/* COMPONENT STAT */
function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
      <p className="text-sm text-zinc-400">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}