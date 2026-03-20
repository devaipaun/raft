'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Search, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

type Book = {
  id: string;
  title?: string | null;
  author?: string | null;
  publisher?: string | null;
  tag?: string | null;
  description?: string | null;
  cover_url?: string | null;
};

export default function DeleteBooksPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [includeDescription, setIncludeDescription] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadBooks();
  }, []);

  async function loadBooks() {
    setLoading(true);
    const { data } = await supabase
      .from('books')
      .select('*')
      .order('title', { ascending: true });

    setBooks(data || []);
    setLoading(false);
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return books;

    return books.filter((b) => {
      const values = [b.title, b.author, b.publisher, b.tag];
      if (includeDescription) values.push(b.description);

      return values.some((v) => (v || '').toLowerCase().includes(q));
    });
  }, [books, query, includeDescription]);

  const allVisibleIds = filtered.map((b) => b.id);
  const allVisibleSelected =
    allVisibleIds.length > 0 && allVisibleIds.every((id) => selected.includes(id));

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function selectAllVisible() {
    if (allVisibleSelected) {
      setSelected((prev) => prev.filter((id) => !allVisibleIds.includes(id)));
      return;
    }

    setSelected((prev) => [...new Set([...prev, ...allVisibleIds])]);
  }

  async function deleteBooks(ids: string[]) {
    if (!ids.length) return;

    const ok = window.confirm(`Ștergi ${ids.length} carte/cărți? Acțiunea este definitivă.`);
    if (!ok) return;

    setDeleting(true);

    try {
      const res = await fetch('/api/admin/books', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids }),
      });

      if (!res.ok) {
        throw new Error('Delete failed');
      }

      setBooks((prev) => prev.filter((b) => !ids.includes(b.id)));
      setSelected((prev) => prev.filter((id) => !ids.includes(id)));
    } catch (error) {
      console.error(error);
      alert('A apărut o eroare la ștergere.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-6 pb-28">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm transition hover:bg-gray-100"
            >
              <ArrowLeft className="h-4 w-4" />
              Înapoi
            </Link>

            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
                Delete books
              </h1>
              <p className="text-sm text-gray-500">
                Caută, selectează și șterge cărți din bibliotecă.
              </p>
            </div>
          </div>
        </div>

        <div className="sticky top-0 z-20 mb-5 rounded-2xl border border-gray-200 bg-white/90 p-4 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                className="w-full rounded-xl border border-gray-200 bg-white px-10 py-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-gray-400"
                placeholder="Caută după titlu, autor, editură sau tag..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            <label className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={includeDescription}
                onChange={(e) => setIncludeDescription(e.target.checked)}
                className="h-4 w-4"
              />
              Include descrierea
            </label>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-gray-600">
            <button
              onClick={selectAllVisible}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 font-medium text-gray-700 transition hover:bg-gray-50"
            >
              {allVisibleSelected ? 'Deselect all visible' : 'Select all visible'}
            </button>

            <span>{filtered.length} rezultate</span>
            <span>•</span>
            <span>{books.length} total</span>
            <span>•</span>
            <span>{selected.length} selectate</span>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500">
            Se încarcă cărțile...
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
            <div className="text-base font-medium text-gray-800">Niciun rezultat</div>
            <div className="mt-1 text-sm text-gray-500">
              Încearcă alt termen sau dezactivează căutarea în descriere.
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((b) => {
              const isSelected = selected.includes(b.id);

              return (
                <div
                  key={b.id}
                  className={`group flex items-center gap-4 rounded-2xl border bg-white p-4 shadow-sm transition ${
                    isSelected
                      ? 'border-red-300 ring-1 ring-red-200'
                      : 'border-gray-200 hover:border-gray-300 hover:shadow'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggle(b.id)}
                    className="h-5 w-5"
                  />

                  <div className="h-20 w-14 overflow-hidden rounded-lg border border-gray-200 bg-gray-100 shrink-0">
                    {b.cover_url ? (
                      <img
                        src={b.cover_url}
                        alt={b.title || 'Book cover'}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[10px] text-gray-400">
                        no cover
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="truncate text-base font-semibold text-gray-900">
                      {b.title || '(fără titlu)'}
                    </div>

                    <div className="mt-1 text-sm text-gray-600">
                      <span className="font-medium text-gray-700">Autor:</span>{' '}
                      {b.author || '—'}
                    </div>

                    <div className="text-sm text-gray-600">
                      <span className="font-medium text-gray-700">Editură:</span>{' '}
                      {b.publisher || '—'}
                    </div>

                    <div className="text-sm text-gray-600">
                      <span className="font-medium text-gray-700">Tag:</span>{' '}
                      {b.tag || '—'}
                    </div>
                  </div>

                  <button
                    onClick={() => deleteBooks([b.id])}
                    disabled={deleting}
                    className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
          <div className="text-sm text-gray-700">
            <span className="font-semibold">{selected.length}</span> carte/cărți selectate
          </div>

          <button
            onClick={() => deleteBooks(selected)}
            disabled={!selected.length || deleting}
            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
          >
            <Trash2 className="h-4 w-4" />
            {deleting ? 'Se șterge...' : 'Șterge selecția'}
          </button>
        </div>
      </div>
    </div>
  );
}