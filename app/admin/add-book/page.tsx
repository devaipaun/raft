'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Tesseract from 'tesseract.js';

type CoverCandidate = {
  id: string;
  source: 'google' | 'openlibrary';
  title: string;
  author: string;
  publisher?: string;
  imageUrl: string;
};

export default function AdminPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    title: '',
    author: '',
    publisher: '',
    tag: '',
    description: '',
  });

  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);

  const [frontImageName, setFrontImageName] = useState('');
  const [backImageName, setBackImageName] = useState('');

  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>(
    'info'
  );

  const [isSaving, setIsSaving] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isSearchingCovers, setIsSearchingCovers] = useState(false);

  const [ocrText, setOcrText] = useState('');
  const [ocrLines, setOcrLines] = useState<string[]>([]);
  const [selectedTitleLines, setSelectedTitleLines] = useState<string[]>([]);
  const [selectedAuthorLines, setSelectedAuthorLines] = useState<string[]>([]);
  const [selectedPublisherLines, setSelectedPublisherLines] = useState<string[]>([]);

  const [coverCandidates, setCoverCandidates] = useState<CoverCandidate[]>([]);
  const [selectedCoverId, setSelectedCoverId] = useState<string | null>(null);
  const [manualCoverQuery, setManualCoverQuery] = useState('');
  const [selectedCoverPreviewUrl, setSelectedCoverPreviewUrl] = useState<string | null>(
    null
  );

  const [autoFilled, setAutoFilled] = useState({
    title: false,
    author: false,
  });

  const [publisherOptions, setPublisherOptions] = useState<string[]>([]);
  const [tagOptions, setTagOptions] = useState<string[]>([]);

  const [zoomedImageUrl, setZoomedImageUrl] = useState<string | null>(null);
  const [zoomedImageLabel, setZoomedImageLabel] = useState('');

  const frontPreviewUrl = useMemo(() => {
    if (!frontFile) return null;
    return URL.createObjectURL(frontFile);
  }, [frontFile]);

  const backPreviewUrl = useMemo(() => {
    if (!backFile) return null;
    return URL.createObjectURL(backFile);
  }, [backFile]);

  const displayedFrontPreviewUrl = selectedCoverPreviewUrl || frontPreviewUrl;

  useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();

      if (!data.user) {
        router.push('/login');
      }
    };

    checkUser();
  }, [router]);

  useEffect(() => {
    const loadOptions = async () => {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('books')
        .select('publisher, tag')
        .order('id', { ascending: false });

      if (error || !data) return;

      const publishers = Array.from(
        new Set(
          data
            .map((item) => item.publisher)
            .filter((value): value is string => !!value && value.trim().length > 0)
        )
      ).sort((a, b) => a.localeCompare(b));

      const tags = Array.from(
        new Set(
          data
            .map((item) => item.tag)
            .filter((value): value is string => !!value && value.trim().length > 0)
        )
      ).sort((a, b) => a.localeCompare(b));

      setPublisherOptions(publishers);
      setTagOptions(tags);
    };

    loadOptions();
  }, []);

  useEffect(() => {
    if (selectedTitleLines.length === 0) return;

    setFormData((prev) => ({
      ...prev,
      title: selectedTitleLines.join(' ').trim(),
    }));

    setAutoFilled((prev) => ({
      ...prev,
      title: false,
    }));

    setManualCoverQuery((prev) => {
      const nextTitle = selectedTitleLines.join(' ').trim();
      const nextAuthor =
        selectedAuthorLines.length > 0
          ? selectedAuthorLines.join(' ').trim()
          : formData.author.trim();

      if (!nextTitle && !nextAuthor) return prev;
      return [nextTitle, nextAuthor].filter(Boolean).join(' ');
    });
  }, [selectedTitleLines, selectedAuthorLines, formData.author]);

  useEffect(() => {
    if (selectedAuthorLines.length === 0) return;

    setFormData((prev) => ({
      ...prev,
      author: selectedAuthorLines.join(' ').trim(),
    }));

    setAutoFilled((prev) => ({
      ...prev,
      author: false,
    }));

    setManualCoverQuery((prev) => {
      const nextTitle =
        selectedTitleLines.length > 0
          ? selectedTitleLines.join(' ').trim()
          : formData.title.trim();
      const nextAuthor = selectedAuthorLines.join(' ').trim();

      if (!nextTitle && !nextAuthor) return prev;
      return [nextTitle, nextAuthor].filter(Boolean).join(' ');
    });
  }, [selectedAuthorLines, selectedTitleLines, formData.title]);

  useEffect(() => {
    if (selectedPublisherLines.length === 0) return;

    setFormData((prev) => ({
      ...prev,
      publisher: selectedPublisherLines.join(' ').trim(),
    }));
  }, [selectedPublisherLines]);

  function setUiMessage(
    text: string | null,
    type: 'success' | 'error' | 'info' = 'info'
  ) {
    setMessage(text);
    setMessageType(type);
  }

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;

    if (name === 'title') {
      setAutoFilled((prev) => ({ ...prev, title: false }));
      setSelectedTitleLines([]);
    }

    if (name === 'author') {
      setAutoFilled((prev) => ({ ...prev, author: false }));
      setSelectedAuthorLines([]);
    }

    if (name === 'publisher') {
      setSelectedPublisherLines([]);
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function handleFrontFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setFrontFile(file);
    setFrontImageName(file ? file.name : '');
    setSelectedCoverPreviewUrl(null);
    setOcrText('');
    setOcrLines([]);
    setSelectedTitleLines([]);
    setSelectedAuthorLines([]);
    setSelectedPublisherLines([]);
    setCoverCandidates([]);
    setSelectedCoverId(null);
    setUiMessage(null);
  }

  function handleBackFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setBackFile(file);
    setBackImageName(file ? file.name : '');
    setOcrText('');
    setOcrLines([]);
    setSelectedTitleLines([]);
    setSelectedAuthorLines([]);
    setSelectedPublisherLines([]);
    setCoverCandidates([]);
    setSelectedCoverId(null);
    setUiMessage(null);
  }

  async function extractTextFromImage(file: File) {
    const result = await Tesseract.recognize(file, 'eng+ron', {
      logger: (m) => console.log(m),
    });
    return result.data.text;
  }

  async function resizeImageForCover(file: File): Promise<Blob> {
    const imageUrl = URL.createObjectURL(file);

    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = imageUrl;
      });

      const maxWidth = 600;
      const maxHeight = 900;

      let { width, height } = img;

      const scale = Math.min(maxWidth / width, maxHeight / height, 1);

      const targetWidth = Math.round(width * scale);
      const targetHeight = Math.round(height * scale);

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Canvas context indisponibil.');
      }

      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/jpeg', 0.8);
      });

      if (!blob) {
        throw new Error('Nu am putut comprima imaginea.');
      }

      return blob;
    } finally {
      URL.revokeObjectURL(imageUrl);
    }
  }

  async function searchCoverCandidates(params: {
    query?: string;
    title?: string;
    author?: string;
  }) {
    const res = await fetch('/api/book-covers/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!res.ok) return [];

    const data = await res.json();
    return Array.isArray(data.candidates) ? data.candidates : [];
  }

  async function handleManualCoverSearch() {
    const manualQuery = manualCoverQuery.trim();
    const title = formData.title.trim();
    const author = formData.author.trim();

    if (!manualQuery && !title && !author) {
      setUiMessage('Scrie ceva pentru căutarea manuală a copertei.', 'error');
      return;
    }

    setIsSearchingCovers(true);
    setSelectedCoverId(null);
    setCoverCandidates([]);
    setUiMessage(null);

    try {
      const candidates = await searchCoverCandidates({
        query: manualQuery,
      });

      setCoverCandidates(candidates);

      if (candidates.length === 0) {
        setUiMessage('Nu am găsit coperți pentru această căutare.', 'info');
      } else {
        setUiMessage('Am găsit câteva coperți posibile ✔', 'success');
      }
    } catch (error) {
      console.error(error);
      setUiMessage('Eroare la căutarea manuală a copertei.', 'error');
    } finally {
      setIsSearchingCovers(false);
    }
  }

  function toggleTitleLine(line: string) {
    setSelectedTitleLines((prev) => {
      if (prev.includes(line)) {
        const next = prev.filter((item) => item !== line);

        if (next.length === 0) {
          setFormData((current) => ({
            ...current,
            title: autoFilled.title ? '' : current.title,
          }));
        }

        return next;
      }

      return [...prev, line];
    });
  }

  function toggleAuthorLine(line: string) {
    setSelectedAuthorLines((prev) => {
      if (prev.includes(line)) {
        const next = prev.filter((item) => item !== line);

        if (next.length === 0) {
          setFormData((current) => ({
            ...current,
            author: autoFilled.author ? '' : current.author,
          }));
        }

        return next;
      }

      return [...prev, line];
    });
  }

  function togglePublisherLine(line: string) {
    setSelectedPublisherLines((prev) => {
      if (prev.includes(line)) {
        const next = prev.filter((item) => item !== line);

        if (next.length === 0) {
          setFormData((current) => ({
            ...current,
            publisher: '',
          }));
        }

        return next;
      }

      return [...prev, line];
    });
  }

  function clearOcrSelection() {
    setOcrText('');
    setOcrLines([]);
    setSelectedTitleLines([]);
    setSelectedAuthorLines([]);
    setSelectedPublisherLines([]);
    setFormData((prev) => ({
      ...prev,
      title: autoFilled.title ? '' : prev.title,
      author: autoFilled.author ? '' : prev.author,
    }));

    setAutoFilled({
      title: false,
      author: false,
    });

    setUiMessage('Am ignorat textul detectat din OCR.', 'info');
  }

  async function handleScan() {
    if (!frontFile && !backFile) {
      setUiMessage('Selectează cel puțin o imagine.', 'error');
      return;
    }

    setIsScanning(true);
    setUiMessage('Se extrag informațiile din imagine...', 'info');
    setOcrText('');
    setOcrLines([]);
    setSelectedTitleLines([]);
    setSelectedAuthorLines([]);
    setSelectedPublisherLines([]);
    setCoverCandidates([]);
    setSelectedCoverId(null);
    setSelectedCoverPreviewUrl(null);

    try {
      let combinedText = '';

      if (frontFile) {
        const frontText = await extractTextFromImage(frontFile);
        combinedText += `\n[FRONT]\n${frontText}\n`;
      }

      if (backFile) {
        const backText = await extractTextFromImage(backFile);
        combinedText += `\n[BACK]\n${backText}\n`;
      }

      setOcrText(combinedText);

      const lines = combinedText
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 2);

      const cleanLines = lines.filter(
        (line) =>
          !line.toLowerCase().includes('[front]') &&
          !line.toLowerCase().includes('[back]') &&
          !line.toLowerCase().includes('download') &&
          !line.toLowerCase().includes('profile') &&
          !line.toLowerCase().includes('details') &&
          !/^[^a-zA-ZăâîșțĂÂÎȘȚ0-9]+$/.test(line)
      );

      setOcrLines(cleanLines);

      let detectedAuthor = '';
      let detectedTitle = '';

      if (cleanLines.length > 0) {
        detectedAuthor = cleanLines[0];
      }

      if (cleanLines.length > 1) {
        detectedTitle = cleanLines[1];
      }

      if (cleanLines.length > 2 && detectedTitle.length < 5) {
        detectedTitle = cleanLines[2];
      }

      const nextTitle = formData.title || detectedTitle;
      const nextAuthor = formData.author || detectedAuthor;

      setFormData((prev) => ({
        ...prev,
        title: nextTitle,
        author: nextAuthor,
      }));

      setAutoFilled({
        title: !formData.title && !!detectedTitle,
        author: !formData.author && !!detectedAuthor,
      });

      setManualCoverQuery([nextTitle, nextAuthor].filter(Boolean).join(' '));

      const candidates = await searchCoverCandidates({
        title: nextTitle,
        author: nextAuthor,
      });

      setCoverCandidates(candidates);

      if (candidates.length === 0) {
        setUiMessage(
          'Am extras textul, dar nu am găsit coperți online. Poți căuta manual mai jos sau salva cu poza din față ca fallback.',
          'info'
        );
      } else {
        setUiMessage('Am găsit informații și câteva coperți posibile ✔', 'success');
      }
    } catch (err) {
      console.error(err);
      setUiMessage('Eroare la scanare.', 'error');
    } finally {
      setIsScanning(false);
    }
  }

  async function uploadBlobToStorage(
    blob: Blob,
    filenameBase: string,
    contentType: string
  ) {
    const supabase = createClient();

    const extension = contentType.includes('png')
      ? 'png'
      : contentType.includes('webp')
      ? 'webp'
      : 'jpg';

    const filePath = `covers/${Date.now()}-${filenameBase}.${extension}`;

    const { error } = await supabase.storage
      .from('book-covers')
      .upload(filePath, blob, {
        contentType,
        upsert: false,
      });

    if (error) {
      throw new Error(error.message);
    }

    const { data } = supabase.storage.from('book-covers').getPublicUrl(filePath);
    return data.publicUrl;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!formData.title.trim() || !formData.author.trim()) {
      setUiMessage('Titlul și autorul sunt obligatorii.', 'error');
      return;
    }

    setIsSaving(true);
    setUiMessage(null);

    try {
      let coverUrl: string | null = null;

      const selectedCover = coverCandidates.find(
        (candidate) => candidate.id === selectedCoverId
      );

      if (selectedCover) {
        coverUrl = selectedCover.imageUrl;
      } else if (frontFile) {
        const resizedBlob = await resizeImageForCover(frontFile);

        coverUrl = await uploadBlobToStorage(
          resizedBlob,
          'uploaded-front-cover',
          'image/jpeg'
        );
      }

      const supabase = createClient();

      const { error } = await supabase.from('books').insert({
        title: formData.title.trim(),
        author: formData.author.trim(),
        publisher: formData.publisher.trim() || null,
        tag: formData.tag.trim() || null,
        description: formData.description.trim() || null,
        cover_url: coverUrl,
      });

      if (error) {
        setUiMessage(`Eroare: ${error.message}`, 'error');
      } else {
        setUiMessage('Cartea a fost salvată ✔', 'success');

        setFormData({
          title: '',
          author: '',
          publisher: '',
          tag: '',
          description: '',
        });

        setFrontFile(null);
        setBackFile(null);
        setFrontImageName('');
        setBackImageName('');
        setOcrText('');
        setOcrLines([]);
        setSelectedTitleLines([]);
        setSelectedAuthorLines([]);
        setSelectedPublisherLines([]);
        setCoverCandidates([]);
        setSelectedCoverId(null);
        setManualCoverQuery('');
        setSelectedCoverPreviewUrl(null);
        setAutoFilled({
          title: false,
          author: false,
        });
      }
    } catch (err) {
      console.error(err);
      setUiMessage('Eroare neașteptată la salvare.', 'error');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  }

  return (
    <>
      <div className="pb-10">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-gray-900">
              Add book
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Adaugă cărți în bibliotecă
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="rounded-xl border border-red-500 bg-white px-4 py-2 text-sm text-red-500 transition hover:bg-red-50"
          >
            Logout
          </button>
        </div>

        <div className="rounded-3xl bg-zinc-950 p-4 text-white md:p-6">
          <div className="grid gap-6 lg:grid-cols-[1fr_430px]">
            <form
              onSubmit={handleSubmit}
              className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-6"
            >
              <div>
                <input
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="Titlu"
                  className={`w-full rounded-xl p-3 transition ${
                    autoFilled.title
                      ? 'border border-green-500 bg-green-900/30'
                      : 'bg-zinc-800'
                  }`}
                />
                {autoFilled.title ? (
                  <p className="mt-1 text-xs text-green-400">completat automat</p>
                ) : null}
              </div>

              <div>
                <input
                  name="author"
                  value={formData.author}
                  onChange={handleChange}
                  placeholder="Autor"
                  className={`w-full rounded-xl p-3 transition ${
                    autoFilled.author
                      ? 'border border-green-500 bg-green-900/30'
                      : 'bg-zinc-800'
                  }`}
                />
                {autoFilled.author ? (
                  <p className="mt-1 text-xs text-green-400">completat automat</p>
                ) : null}
              </div>

              <input
                name="publisher"
                value={formData.publisher}
                onChange={handleChange}
                placeholder="Editură"
                list="publisher-options"
                className="w-full rounded-xl bg-zinc-800 p-3"
              />
              <datalist id="publisher-options">
                {publisherOptions.map((publisher) => (
                  <option key={publisher} value={publisher} />
                ))}
              </datalist>

              <input
                name="tag"
                value={formData.tag}
                onChange={handleChange}
                placeholder="Tag"
                list="tag-options"
                className="w-full rounded-xl bg-zinc-800 p-3"
              />
              <datalist id="tag-options">
                {tagOptions.map((tag) => (
                  <option key={tag} value={tag} />
                ))}
              </datalist>

              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Descriere"
                className="w-full rounded-xl bg-zinc-800 p-3"
                rows={4}
              />

              <div className="space-y-4">
                <div>
                  <input
                    id="front-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleFrontFileChange}
                    className="hidden"
                  />
                  <label
                    htmlFor="front-upload"
                    className="inline-flex cursor-pointer rounded-xl border border-zinc-700 px-4 py-3 text-sm text-white hover:bg-zinc-800"
                  >
                    Alege poza din față
                  </label>
                  <p className="mt-2 text-sm text-zinc-400">
                    {frontImageName || 'Nicio imagine selectată pentru față'}
                  </p>
                </div>

                <div>
                  <input
                    id="back-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleBackFileChange}
                    className="hidden"
                  />
                  <label
                    htmlFor="back-upload"
                    className="inline-flex cursor-pointer rounded-xl border border-zinc-700 px-4 py-3 text-sm text-white hover:bg-zinc-800"
                  >
                    Alege poza din spate
                  </label>
                  <p className="mt-2 text-sm text-zinc-400">
                    {backImageName || 'Nicio imagine selectată pentru spate'}
                  </p>
                </div>
              </div>

              {message ? (
                <p
                  className={`text-sm ${
                    messageType === 'success'
                      ? 'text-green-400'
                      : messageType === 'error'
                      ? 'text-red-400'
                      : 'text-zinc-300'
                  }`}
                >
                  {message}
                </p>
              ) : null}

              <button
                disabled={isSaving}
                className="w-full rounded-xl bg-white p-3 font-semibold text-black"
              >
                {isSaving ? 'Se salvează...' : 'Salvează'}
              </button>

              <button
                type="button"
                onClick={handleScan}
                disabled={isScanning}
                className="w-full rounded-xl border border-zinc-700 p-3 text-white"
              >
                {isScanning
                  ? 'Se extrag informațiile...'
                  : 'Extrage informațiile din poză'}
              </button>
            </form>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
              <h2 className="mb-4 text-sm text-zinc-400">Preview imagini</h2>

              <div className="grid gap-4">
                <div>
                  <p className="mb-2 text-xs uppercase text-zinc-500">Față</p>
                  {displayedFrontPreviewUrl ? (
                    <button
                      type="button"
                      onClick={() => {
                        setZoomedImageUrl(displayedFrontPreviewUrl);
                        setZoomedImageLabel('Preview față');
                      }}
                      className="block w-full"
                    >
                      <div className="flex h-[220px] items-center justify-center overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
                        <img
                          src={displayedFrontPreviewUrl}
                          alt="Preview față"
                          className="h-full w-full object-contain"
                        />
                      </div>
                    </button>
                  ) : (
                    <div className="flex h-[220px] items-center justify-center rounded-xl border border-dashed border-zinc-700 text-zinc-500">
                      Fără imagine față
                    </div>
                  )}
                </div>

                <div>
                  <p className="mb-2 text-xs uppercase text-zinc-500">Spate</p>
                  {backPreviewUrl ? (
                    <button
                      type="button"
                      onClick={() => {
                        setZoomedImageUrl(backPreviewUrl);
                        setZoomedImageLabel('Preview spate');
                      }}
                      className="block w-full"
                    >
                      <div className="flex h-[220px] items-center justify-center overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
                        <img
                          src={backPreviewUrl}
                          alt="Preview spate"
                          className="h-full w-full object-contain"
                        />
                      </div>
                    </button>
                  ) : (
                    <div className="flex h-[220px] items-center justify-center rounded-xl border border-dashed border-zinc-700 text-zinc-500">
                      Fără imagine spate
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6">
                <p className="mb-2 text-sm font-semibold text-zinc-300">
                  Căutare manuală copertă
                </p>
                <div className="flex gap-2">
                  <input
                    value={manualCoverQuery}
                    onChange={(e) => setManualCoverQuery(e.target.value)}
                    placeholder="Ex: John Brockman Totul are o explicație"
                    className="w-full rounded-xl bg-zinc-800 p-3 text-sm"
                  />
                  <button
                    type="button"
                    onClick={handleManualCoverSearch}
                    disabled={isSearchingCovers}
                    className={`flex items-center justify-center gap-2 rounded-xl px-4 text-sm text-white transition ${
                      isSearchingCovers
                        ? 'cursor-not-allowed border border-blue-500 bg-blue-600/20 text-blue-200'
                        : 'border border-zinc-700 bg-zinc-900 hover:bg-zinc-800'
                    }`}
                  >
                    {isSearchingCovers ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
                    ) : null}

                    {isSearchingCovers ? 'Caut...' : 'Caută'}
                  </button>
                </div>
              </div>

              {isSearchingCovers ? (
                <div className="mt-6">
                  <p className="mb-3 text-sm font-semibold text-zinc-300">
                    Căutăm câteva variante de copertă...
                  </p>

                  <div className="grid gap-3">
                    {[1, 2, 3].map((item) => (
                      <div
                        key={item}
                        className="flex animate-pulse items-center gap-3 rounded-xl border border-zinc-700 p-3"
                      >
                        <div className="h-20 w-14 rounded bg-zinc-800" />

                        <div className="flex-1 space-y-2">
                          <div className="h-4 w-3/4 rounded bg-zinc-800" />
                          <div className="h-3 w-1/2 rounded bg-zinc-800" />
                          <div className="h-3 w-1/3 rounded bg-zinc-800" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : coverCandidates.length > 0 ? (
                <div className="mt-6">
                  <p className="mb-3 text-sm font-semibold text-zinc-300">
                    Coperți găsite
                  </p>

                  <div className="grid max-h-[420px] gap-3 overflow-y-auto pr-1">
                    {coverCandidates.map((candidate) => (
                      <button
                        key={candidate.id}
                        type="button"
                        onClick={() => {
                          const hasExistingData =
                            !!formData.title.trim() ||
                            !!formData.author.trim() ||
                            !!formData.publisher.trim();

                          const hasExistingFrontPreview = !!displayedFrontPreviewUrl;

                          let shouldReplaceData = true;
                          let shouldReplacePreview = true;

                          if (hasExistingData) {
                            shouldReplaceData = window.confirm(
                              'Există deja informații completate. Vrei să le înlocuiești cu cele de pe copertă?'
                            );
                          }

                          if (hasExistingFrontPreview) {
                            shouldReplacePreview = window.confirm(
                              'Există deja o imagine în preview-ul din față. Vrei să o înlocuiești cu coperta selectată?'
                            );
                          }

                          setSelectedCoverId(candidate.id);

                          if (shouldReplaceData) {
                            setFormData((prev) => ({
                              ...prev,
                              title: candidate.title ?? '',
                              author: candidate.author ?? '',
                              publisher: candidate.publisher ?? '',
                            }));

                            setManualCoverQuery(
                              [candidate.title, candidate.author]
                                .filter(Boolean)
                                .join(' ')
                            );

                            setSelectedTitleLines([]);
                            setSelectedAuthorLines([]);

                            setAutoFilled({
                              title: false,
                              author: false,
                            });
                          }

                          if (shouldReplacePreview) {
                            setSelectedCoverPreviewUrl(candidate.imageUrl);
                          }
                        }}
                        className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${
                          selectedCoverId === candidate.id
                            ? 'border-green-500 bg-green-900/20'
                            : 'border-zinc-700 hover:bg-zinc-800'
                        }`}
                      >
                        <img
                          src={candidate.imageUrl}
                          alt={candidate.title}
                          className="h-20 w-14 rounded object-cover"
                        />
                        <div>
                          <p className="text-sm font-semibold text-white">
                            {candidate.title}
                          </p>
                          <p className="text-xs text-zinc-400">{candidate.author}</p>
                          <p className="text-xs text-zinc-500">
                            {candidate.publisher || candidate.source}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>

                  <p className="mt-2 text-xs text-zinc-500">
                    Dacă nu alegi nimic, aplicația va folosi poza din față ca fallback.
                  </p>
                </div>
              ) : null}

              {isScanning ? (
                <div className="mt-4 rounded-xl border border-blue-500/40 bg-blue-500/5 p-4">
                  <div className="flex items-center gap-3">
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
                    <div>
                      <p className="text-sm font-semibold text-blue-200">
                        Se citesc imaginile și se extrage textul...
                      </p>
                      <p className="text-xs text-blue-300/80">
                        Analizăm fața și spatele cărții.
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              {ocrText ? (
                <div className="mt-4 rounded-xl border border-zinc-800 p-3 text-xs text-zinc-400">
                  <p className="mb-2 font-semibold text-zinc-300">Text detectat:</p>
                  <pre className="whitespace-pre-wrap">{ocrText}</pre>
                </div>
              ) : null}

              {ocrLines.length > 0 ? (
                <div className="mt-4 rounded-xl border border-zinc-800 p-3">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-zinc-300">
                      Selectează din textul detectat
                    </p>

                    <button
                      type="button"
                      onClick={clearOcrSelection}
                      className="rounded-lg border border-amber-500 bg-amber-500/10 px-3 py-1 text-xs text-amber-300 transition hover:bg-amber-500/20"
                    >
                      Nimic util
                    </button>
                  </div>

                  <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                    {ocrLines.map((line, index) => {
                      const isSelectedForTitle = selectedTitleLines.includes(line);
                      const isSelectedForAuthor = selectedAuthorLines.includes(line);
                      const isSelectedForPublisher = selectedPublisherLines.includes(line);

                      return (
                        <div
                          key={`${line}-${index}`}
                          className="rounded-lg border border-zinc-800 bg-zinc-950 p-2"
                        >
                          <p className="mb-2 text-sm text-zinc-300">{line}</p>

                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => toggleTitleLine(line)}
                              className={`rounded-lg px-2 py-1 text-xs transition ${
                                isSelectedForTitle
                                  ? 'border border-blue-400 bg-blue-500/20 text-blue-300'
                                  : 'border border-zinc-700 text-blue-400 hover:bg-zinc-800'
                              }`}
                            >
                              {isSelectedForTitle ? 'Scoate din titlu' : 'Adaugă la titlu'}
                            </button>

                            <button
                              type="button"
                              onClick={() => toggleAuthorLine(line)}
                              className={`rounded-lg px-2 py-1 text-xs transition ${
                                isSelectedForAuthor
                                  ? 'border border-green-400 bg-green-500/20 text-green-300'
                                  : 'border border-zinc-700 text-green-400 hover:bg-zinc-800'
                              }`}
                            >
                              {isSelectedForAuthor ? 'Scoate din autor' : 'Adaugă la autor'}
                            </button>

                            <button
                              type="button"
                              onClick={() => togglePublisherLine(line)}
                              className={`rounded-lg px-2 py-1 text-xs transition ${
                                isSelectedForPublisher
                                  ? 'border border-purple-400 bg-purple-500/20 text-purple-300'
                                  : 'border border-zinc-700 text-purple-400 hover:bg-zinc-800'
                              }`}
                            >
                              {isSelectedForPublisher
                                ? 'Scoate din editură'
                                : 'Adaugă la editură'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {zoomedImageUrl ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
          onClick={() => setZoomedImageUrl(null)}
        >
          <div
            className="max-h-[90vh] max-w-[90vw] rounded-2xl bg-zinc-900 p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between gap-4">
              <p className="text-sm text-zinc-300">{zoomedImageLabel}</p>
              <button
                type="button"
                onClick={() => setZoomedImageUrl(null)}
                className="rounded-lg border border-zinc-700 px-3 py-1 text-sm text-white"
              >
                Închide
              </button>
            </div>

            <img
              src={zoomedImageUrl}
              alt={zoomedImageLabel}
              className="max-h-[75vh] max-w-[85vw] object-contain"
            />
          </div>
        </div>
      ) : null}
    </>
  );
}