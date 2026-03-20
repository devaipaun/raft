'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, Shield } from 'lucide-react';

function formatSegment(segment: string) {
  return segment
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const segments = pathname.split('/').filter(Boolean);
  const adminSegments = segments.slice(1);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm transition hover:bg-gray-100"
              >
                <ArrowLeft className="h-4 w-4" />
                Înapoi acasă
              </Link>

              <div>
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-gray-700" />
                  <h1 className="text-xl font-semibold tracking-tight text-gray-900">
                    Admin
                  </h1>
                </div>

                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-500">
                  <Link href="/admin" className="hover:text-gray-700">
                    Admin
                  </Link>

                  {adminSegments.map((segment, index) => {
                    const href = '/' + segments.slice(0, index + 2).join('/');
                    const isLast = index === adminSegments.length - 1;

                    return (
                      <div key={href} className="flex items-center gap-2">
                        <span>→</span>
                        {isLast ? (
                          <span className="font-medium text-gray-700">
                            {formatSegment(segment)}
                          </span>
                        ) : (
                          <Link href={href} className="hover:text-gray-700">
                            {formatSegment(segment)}
                          </Link>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <nav className="flex flex-wrap items-center gap-2">
              <Link
                href="/admin"
                className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition ${
                  pathname === '/admin'
                    ? 'bg-gray-900 text-white'
                    : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Shield className="h-4 w-4" />
                Admin home
              </Link>

              <Link
                href="/admin/add-book"
                className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition ${
                  pathname === '/admin/add-book'
                    ? 'bg-gray-900 text-white'
                    : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Plus className="h-4 w-4" />
                Add book
              </Link>

              <Link
                href="/admin/delete-books"
                className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition ${
                  pathname === '/admin/delete-books'
                    ? 'bg-red-600 text-white'
                    : 'border border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
                }`}
              >
                <Trash2 className="h-4 w-4" />
                Delete books
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}