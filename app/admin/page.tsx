import Link from 'next/link';
import { Plus, Trash2 } from 'lucide-react';

export default function AdminPage() {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold tracking-tight text-gray-900">
          Admin
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Alege ce vrei să administrezi în bibliotecă.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Link
          href="/admin/add-book"
          className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md"
        >
          <div className="mb-3 inline-flex rounded-xl bg-gray-100 p-3 text-gray-800">
            <Plus className="h-5 w-5" />
          </div>

          <h3 className="text-lg font-semibold text-gray-900">Add book</h3>
          <p className="mt-1 text-sm text-gray-500">
            Adaugă o carte nouă în bibliotecă, cu OCR, imagini și copertă.
          </p>
        </Link>

        <Link
          href="/admin/delete-books"
          className="rounded-2xl border border-red-200 bg-white p-5 shadow-sm transition hover:shadow-md"
        >
          <div className="mb-3 inline-flex rounded-xl bg-red-50 p-3 text-red-700">
            <Trash2 className="h-5 w-5" />
          </div>

          <h3 className="text-lg font-semibold text-gray-900">Delete books</h3>
          <p className="mt-1 text-sm text-gray-500">
            Caută, selectează și șterge una sau mai multe cărți.
          </p>
        </Link>
      </div>
    </div>
  );
}