'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

const supabase = createClient();

export default function DeleteBooksPage() {
  const [books, setBooks] = useState<any[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [includeDescription, setIncludeDescription] = useState(false);

  useEffect(() => {
    loadBooks();
  }, []);

  async function loadBooks() {
    const { data } = await supabase.from('books').select('*');
    setBooks(data || []);
  }

  const filtered = useMemo(() => {
    if (!query) return books;

    return books.filter((b) => {
      const values = [
        b.title,
        b.author,
        b.publisher,
        b.tag,
      ];

      if (includeDescription) values.push(b.description);

      return values.some((v) =>
        (v || '').toLowerCase().includes(query.toLowerCase())
      );
    });
  }, [books, query, includeDescription]);

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id]
    );
  }

  function selectAllVisible() {
    const ids = filtered.map((b) => b.id);

    const allSelected = ids.every((id) => selected.includes(id));

    if (allSelected) {
      setSelected((prev) => prev.filter((id) => !ids.includes(id)));
    } else {
      setSelected((prev) => [...new Set([...prev, ...ids])]);
    }
  }

  async function deleteBooks(ids: string[]) {
    if (!ids.length) return;

    const ok = confirm(`Ștergi ${ids.length} cărți?`);
    if (!ok) return;

    await fetch('/api/admin/books', {
      method: 'DELETE',
      body: JSON.stringify({ ids }),
    });

    setBooks((prev) => prev.filter((b) => !ids.includes(b.id)));
    setSelected([]);
  }

  return (
    <div className="p-6 pb-24">
      <div className="mb-6 flex items-center gap-4">
        <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
        >
            <ArrowLeft className="h-4 w-4" />
            Raft
        </Link>

        <h1 className="text-xl font-semibold">Delete books</h1>
      </div>

      {/* SEARCH */}
      <div className="mb-4 flex gap-4">
        <input
          className="border px-3 py-2 w-full"
          placeholder="Search..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={includeDescription}
            onChange={(e) => setIncludeDescription(e.target.checked)}
          />
          Description
        </label>
      </div>

      {/* SELECT ALL */}
      <button
        onClick={selectAllVisible}
        className="mb-4 border px-3 py-2"
      >
        Select all visible
      </button>

      {/* LIST */}
      <div className="space-y-2">
        {filtered.map((b) => (
          <div key={b.id} className="border p-3 flex gap-3 items-center">
            <input
              type="checkbox"
              checked={selected.includes(b.id)}
              onChange={() => toggle(b.id)}
            />

            <img
              src={b.cover_url}
              className="w-12 h-16 object-cover"
            />

            <div className="flex-1">
              <div>{b.title}</div>
              <div className="text-sm text-gray-500">{b.author}</div>
            </div>

            <button
              onClick={() => deleteBooks([b.id])}
              className="bg-red-500 text-white px-3 py-1"
            >
              Delete
            </button>
          </div>
        ))}
      </div>

      {/* STICKY DELETE */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 flex justify-between">
        <div>{selected.length} selected</div>

        <button
          onClick={() => deleteBooks(selected)}
          className="bg-red-600 text-white px-4 py-2"
        >
          Delete selected
        </button>
      </div>
    </div>
  );
}