import { NextRequest, NextResponse } from "next/server";

type CoverCandidate = {
  id: string;
  source: "google" | "openlibrary";
  title: string;
  author: string;
  publisher?: string;
  imageUrl: string;
};

type RankedCoverCandidate = CoverCandidate & {
  score: number;
};

function normalizeSearchText(value: string = "") {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function getWords(value: string) {
  return normalizeSearchText(value)
    .split(" ")
    .map((word) => word.trim())
    .filter(Boolean);
}

function buildSearchQueries(params: {
  manualQuery: string;
  title: string;
  author: string;
}) {
  const manualQuery = params.manualQuery.trim();
  const title = params.title.trim();
  const author = params.author.trim();

  const normalizedManualQuery = normalizeSearchText(manualQuery);
  const normalizedTitle = normalizeSearchText(title);
  const normalizedAuthor = normalizeSearchText(author);

  const queries = [
    title && author ? `intitle:${title} inauthor:${author}` : "",
    normalizedTitle && normalizedAuthor
      ? `intitle:${normalizedTitle} inauthor:${normalizedAuthor}`
      : "",
    manualQuery,
    normalizedManualQuery,
    [title, author].filter(Boolean).join(" ").trim(),
    [author, title].filter(Boolean).join(" ").trim(),
    [normalizedTitle, normalizedAuthor].filter(Boolean).join(" ").trim(),
    [normalizedAuthor, normalizedTitle].filter(Boolean).join(" ").trim(),
    title,
    normalizedTitle,
    author,
    normalizedAuthor,
  ].filter(Boolean);

  return Array.from(new Set(queries));
}

function levenshtein(a: string, b: string) {
  const matrix = Array.from({ length: a.length + 1 }, () =>
    new Array(b.length + 1).fill(0)
  );

  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;

      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[a.length][b.length];
}

function fuzzyScore(a: string, b: string) {
  const s1 = normalizeSearchText(a);
  const s2 = normalizeSearchText(b);

  if (!s1 || !s2) return 0;

  const distance = levenshtein(s1, s2);
  const maxLen = Math.max(s1.length, s2.length);

  const similarity = 1 - distance / maxLen;

  if (similarity > 0.9) return 60;
  if (similarity > 0.8) return 40;
  if (similarity > 0.7) return 20;

  return 0;
}

function scoreTextMatch(searchValue: string, candidateValue: string) {
  const search = normalizeSearchText(searchValue);
  const candidate = normalizeSearchText(candidateValue);

  if (!search || !candidate) return 0;
  if (search === candidate) return 120;
  if (candidate.startsWith(search)) return 90;
  if (candidate.includes(search)) return 70;
  if (search.includes(candidate) && candidate.length > 3) return 40;

  const searchWords = getWords(search);
  const candidateWords = getWords(candidate);

  if (searchWords.length === 0 || candidateWords.length === 0) return 0;

  let score = 0;

  for (const word of searchWords) {
    if (candidateWords.includes(word)) {
      score += 14;
      continue;
    }

    const startsWithMatch = candidateWords.some((candidateWord) =>
      candidateWord.startsWith(word)
    );

    if (startsWithMatch) {
      score += 8;
      continue;
    }

    const includesMatch = candidateWords.some((candidateWord) =>
      candidateWord.includes(word)
    );

    if (includesMatch) {
      score += 4;
    }
  }

  return score;
}

function scoreCandidate(
  candidate: CoverCandidate,
  params: {
    manualQuery: string;
    title: string;
    author: string;
  }
  
) {
  const candidateTitle = candidate.title ?? "";
  const candidateAuthor = candidate.author ?? "";
  const candidateCombined = `${candidateTitle} ${candidateAuthor}`.trim();

  let score = 0;

  if (params.title) {
    score += scoreTextMatch(params.title, candidateTitle) * 2.2;
    score += scoreTextMatch(params.title, candidateCombined) * 0.4;
  }

  score += fuzzyScore(params.title, candidateTitle) * 1.5;
 
  if (params.author) {
    score += scoreTextMatch(params.author, candidateAuthor) * 1.8;
    score += scoreTextMatch(params.author, candidateCombined) * 0.3;
  }

  score += fuzzyScore(params.author, candidateAuthor) * 1.2;

  if (params.manualQuery) {
    score += scoreTextMatch(params.manualQuery, candidateCombined) * 1.2;
    score += scoreTextMatch(params.manualQuery, candidateTitle) * 0.5;
  }

  const normalizedSearchTitle = normalizeSearchText(params.title);
  const normalizedSearchAuthor = normalizeSearchText(params.author);
  const normalizedCandidateTitle = normalizeSearchText(candidateTitle);
  const normalizedCandidateAuthor = normalizeSearchText(candidateAuthor);

  if (
    normalizedSearchTitle &&
    normalizedCandidateTitle &&
    normalizedSearchTitle === normalizedCandidateTitle
  ) {
    score += 80;
  }

  if (
    normalizedSearchAuthor &&
    normalizedCandidateAuthor &&
    normalizedSearchAuthor === normalizedCandidateAuthor
  ) {
    score += 60;
  }

  if (
    normalizedSearchTitle &&
    normalizedCandidateTitle.startsWith(normalizedSearchTitle)
  ) {
    score += 25;
  }

  if (
    normalizedSearchAuthor &&
    normalizedCandidateAuthor.startsWith(normalizedSearchAuthor)
  ) {
    score += 20;
  }

  if (candidate.source === "google") {
    score += 8;
  }

  if (candidate.publisher) {
    score += 3;
  }

  return score;
}

function dedupeAndRankCandidates(
  candidates: CoverCandidate[],
  params: {
    manualQuery: string;
    title: string;
    author: string;
  }
) {
  const ranked: RankedCoverCandidate[] = candidates.map((candidate) => ({
    ...candidate,
    score: scoreCandidate(candidate, params),
  }));

  const bestByKey = new Map<string, RankedCoverCandidate>();

  for (const candidate of ranked) {
    const normalizedTitle = normalizeSearchText(candidate.title);
    const normalizedAuthor = normalizeSearchText(candidate.author);
    const normalizedImageUrl = candidate.imageUrl.trim().toLowerCase();

    const key =
      normalizedImageUrl ||
      `${candidate.source}:${normalizedTitle}:${normalizedAuthor}`;

    const existing = bestByKey.get(key);

    if (!existing || candidate.score > existing.score) {
      bestByKey.set(key, candidate);
    }
  }

  return Array.from(bestByKey.values())
    .sort((a, b) => b.score - a.score)
    .map(({ score, ...candidate }) => candidate);
}

async function searchGoogleBooks(query: string) {
  const results: CoverCandidate[] = [];

  const res = await fetch(
    `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(
      query
    )}&maxResults=10`,
    { cache: "no-store" }
  );

  if (!res.ok) return results;

  const data = await res.json();
  const items = Array.isArray(data.items) ? data.items : [];

  for (const item of items) {
    const volumeInfo = item.volumeInfo ?? {};
    const imageLinks = volumeInfo.imageLinks ?? {};

    const imageUrl =
      imageLinks.thumbnail ||
      imageLinks.smallThumbnail ||
      imageLinks.small ||
      imageLinks.medium ||
      imageLinks.large;

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
    `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=10`,
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

    const queries = buildSearchQueries({
      manualQuery,
      title,
      author,
    });

    // console.log("queries", queries);

    const allCandidates: CoverCandidate[] = [];

    for (const query of queries) {
      const [googleCandidates, openLibraryCandidates] = await Promise.all([
        searchGoogleBooks(query),
        searchOpenLibrary(query),
      ]);

      allCandidates.push(...googleCandidates, ...openLibraryCandidates);

      if (allCandidates.length >= 30) {
        break;
      }
    }

    // console.log("allCandidates", allCandidates.length);

    const rankedCandidates = dedupeAndRankCandidates(allCandidates, {
      manualQuery,
      title,
      author,
    });

    return NextResponse.json({
      candidates: rankedCandidates.slice(0, 10),
    });
  } catch (error) {
    console.error("BOOK COVER SEARCH ERROR:", error);
    return NextResponse.json({ candidates: [] }, { status: 200 });
  }
}