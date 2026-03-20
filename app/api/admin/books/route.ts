import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function getPath(url: string | null) {
  if (!url) return null;

  const marker = '/book-covers/';
  const idx = url.indexOf(marker);
  if (idx === -1) return null;

  return decodeURIComponent(url.slice(idx + marker.length));
}

export async function DELETE(req: Request) {
  const { ids } = await req.json();

  const { data: books } = await supabase
    .from('books')
    .select('cover_url')
    .in('id', ids);

  const paths = (books || [])
    .map((b) => getPath(b.cover_url))
    .filter(Boolean);

  if (paths.length) {
    await supabase.storage.from('book-covers').remove(paths);
  }

  await supabase.from('books').delete().in('id', ids);

  return NextResponse.json({ success: true });
}