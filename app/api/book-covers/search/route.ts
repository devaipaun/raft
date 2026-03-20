import { NextRequest, NextResponse } from "next/server";

type CoverCandidate = {
  id: string;
  source: "google" | "openlibrary";
  title: string;
  author: string;
  publisher?: string;
  imageUrl: string;
};

async function searchGoogleBooks(query: string) {
  const results: CoverCandidate[] = [];

  const res = await fetch(
    `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(
      query
    )}&maxResults=6`,
    { cache: "no-store" }
  );

  if (!res.ok) return results;

  const data = await res.json();
  const items = Array.isArray(data.items) ? data.items : [];

  for (const item of items) {
    const volumeInfo = item.volumeInfo ?? {};
    const imageLinks = volumeInfo.imageLinks ?? {};

    const imageUrl =
      imageLinks.smallThumbnail ||
      imageLinks.thumbnail ||
      imageLinks.small ||
      imageLinks.medium;

    if (!imageUrl) continue;

    results.push({
      id: `google-${item.id}`,
      source: "google",
      title: volumeInfo.title ?? "Fără titlu",
      author: Array.isArray(volumeInfo.authors)
        ? volumeInfo.authors.join(", ")
        : "Autor necunoscut",
      publisher: volumeInfo.publisher ?? "",
      imageUrl: imageUrl.replace("http://", "https://"),
    });
  }

  return results;
}

async function searchOpenLibrary(query: string) {
  const results: CoverCandidate[] = [];

  const res = await fetch(
    `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=6`,
    { cache: "no-store" }
  );

  if (!res.ok) return results;

  const data = await res.json();
  const docs = Array.isArray(data.docs) ? data.docs : [];

  for (const doc of docs) {
    if (!doc.cover_i) continue;

    results.push({
      id: `openlibrary-${doc.key ?? doc.cover_i}`,
      source: "openlibrary",
      title: doc.title ?? "Fără titlu",
      author: Array.isArray(doc.author_name)
        ? doc.author_name.join(", ")
        : "Autor necunoscut",
      publisher: Array.isArray(doc.publisher) ? doc.publisher[0] : "",
      imageUrl: `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`,
    });
  }

  return results;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const manualQuery = String(body.query ?? "").trim();
    const title = String(body.title ?? "").trim();
    const author = String(body.author ?? "").trim();

    const queries = [
      manualQuery,
      [title, author].filter(Boolean).join(" ").trim(),
      title,
      author,
    ].filter(Boolean);

    const allCandidates: CoverCandidate[] = [];

    for (const query of queries) {
      const googleCandidates = await searchGoogleBooks(query);
      const openLibraryCandidates = await searchOpenLibrary(query);

      const combined = [...googleCandidates, ...openLibraryCandidates];

      for (const candidate of combined) {
        allCandidates.push(candidate);
      }

      if (allCandidates.length > 0) break;
    }

    const unique = allCandidates.filter(
      (candidate, index, arr) =>
        arr.findIndex((x) => x.imageUrl === candidate.imageUrl) === index
    );

    return NextResponse.json({
      candidates: unique.slice(0, 3),
    });
  } catch (error) {
    console.error("BOOK COVER SEARCH ERROR:", error);
    return NextResponse.json({ candidates: [] }, { status: 200 });
  }
}