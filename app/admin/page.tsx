"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Tesseract from "tesseract.js";

type CoverCandidate = {
  id: string;
  source: "google" | "openlibrary";
  title: string;
  author: string;
  publisher?: string;
  imageUrl: string;
};

export default function AdminPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    title: "",
    author: "",
    publisher: "",
    tag: "",
    description: "",
  });

  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);

  const [frontImageName, setFrontImageName] = useState("");
  const [backImageName, setBackImageName] = useState("");

  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"success" | "error" | "info">(
    "info"
  );

  const [isSaving, setIsSaving] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isSearchingCovers, setIsSearchingCovers] = useState(false);

  const [ocrText, setOcrText] = useState("");
  const [coverCandidates, setCoverCandidates] = useState<CoverCandidate[]>([]);
  const [selectedCoverId, setSelectedCoverId] = useState<string | null>(null);
  const [manualCoverQuery, setManualCoverQuery] = useState("");

  const [autoFilled, setAutoFilled] = useState({
    title: false,
    author: false,
  });

  const [publisherOptions, setPublisherOptions] = useState<string[]>([]);
  const [tagOptions, setTagOptions] = useState<string[]>([]);

  const [zoomedImageUrl, setZoomedImageUrl] = useState<string | null>(null);
  const [zoomedImageLabel, setZoomedImageLabel] = useState("");

  const frontPreviewUrl = useMemo(() => {
    if (!frontFile) return null;
    return URL.createObjectURL(frontFile);
  }, [frontFile]);

  const backPreviewUrl = useMemo(() => {
    if (!backFile) return null;
    return URL.createObjectURL(backFile);
  }, [backFile]);

  useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();

      if (!data.user) {
        router.push("/login");
      }
    };

    checkUser();
  }, [router]);

  useEffect(() => {
    const loadOptions = async () => {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("books")
        .select("publisher, tag")
        .order("id", { ascending: false });

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

  function setUiMessage(
    text: string | null,
    type: "success" | "error" | "info" = "info"
  ) {
    setMessage(text);
    setMessageType(type);
  }

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;

    if (name === "title") {
      setAutoFilled((prev) => ({ ...prev, title: false }));
    }

    if (name === "author") {
      setAutoFilled((prev) => ({ ...prev, author: false }));
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function handleFrontFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setFrontFile(file);
    setFrontImageName(file ? file.name : "");
    setOcrText("");
    setCoverCandidates([]);
    setSelectedCoverId(null);
    setUiMessage(null);
  }

  function handleBackFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setBackFile(file);
    setBackImageName(file ? file.name : "");
    setOcrText("");
    setCoverCandidates([]);
    setSelectedCoverId(null);
    setUiMessage(null);
  }

  async function extractTextFromImage(file: File) {
    const result = await Tesseract.recognize(file, "eng+ron", {
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

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("Canvas context indisponibil.");
    }

    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.8);
    });

    if (!blob) {
      throw new Error("Nu am putut comprima imaginea.");
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
    const res = await fetch("/api/books-covers/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    });

    if (!res.ok) return [];

    const data = await res.json();
    return Array.isArray(data.candidates) ? data.candidates : [];
  }

  async function handleManualCoverSearch() {
    if (!manualCoverQuery.trim()) {
      setUiMessage("Scrie ceva pentru căutarea manuală a copertei.", "error");
      return;
    }

    setIsSearchingCovers(true);
    setSelectedCoverId(null);

    try {
      const candidates = await searchCoverCandidates({
        query: manualCoverQuery.trim(),
      });

      setCoverCandidates(candidates);

      if (candidates.length === 0) {
        setUiMessage("Nu am găsit coperți pentru această căutare.", "info");
      } else {
        setUiMessage("Am găsit câteva coperți posibile ✔", "success");
      }
    } catch (error) {
      console.error(error);
      setUiMessage("Eroare la căutarea manuală a copertei.", "error");
    } finally {
      setIsSearchingCovers(false);
    }
  }

  async function handleScan() {
    if (!frontFile && !backFile) {
      setUiMessage("Selectează cel puțin o imagine.", "error");
      return;
    }

    setIsScanning(true);
    setUiMessage("Se extrag informațiile din imagine...", "info");
    setOcrText("");
    setCoverCandidates([]);
    setSelectedCoverId(null);

    try {
      let combinedText = "";

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
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 2);

      const cleanLines = lines.filter(
        (line) =>
          !line.toLowerCase().includes("[front]") &&
          !line.toLowerCase().includes("[back]") &&
          !line.toLowerCase().includes("download") &&
          !line.toLowerCase().includes("profile") &&
          !line.toLowerCase().includes("details") &&
          !/^[^a-zA-ZăâîșțĂÂÎȘȚ0-9]+$/.test(line)
      );

      let detectedAuthor = "";
      let detectedTitle = "";

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

      setManualCoverQuery([nextTitle, nextAuthor].filter(Boolean).join(" "));

      const candidates = await searchCoverCandidates({
        title: nextTitle,
        author: nextAuthor,
      });

      setCoverCandidates(candidates);

      if (candidates.length === 0) {
        setUiMessage(
          "Am extras textul, dar nu am găsit coperți online. Poți căuta manual mai jos sau salva cu poza din față ca fallback.",
          "info"
        );
      } else {
        setUiMessage("Am găsit informații și câteva coperți posibile ✔", "success");
      }
    } catch (err) {
      console.error(err);
      setUiMessage("Eroare la scanare.", "error");
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

    const extension =
      contentType.includes("png")
        ? "png"
        : contentType.includes("webp")
        ? "webp"
        : "jpg";

    const filePath = `covers/${Date.now()}-${filenameBase}.${extension}`;

    const { error } = await supabase.storage
      .from("books-covers")
      .upload(filePath, blob, {
        contentType,
        upsert: false,
      });

    if (error) {
      throw new Error(error.message);
    }

    const { data } = supabase.storage.from("books-covers").getPublicUrl(filePath);
    return data.publicUrl;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!formData.title.trim() || !formData.author.trim()) {
      setUiMessage("Titlul și autorul sunt obligatorii.", "error");
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
        const response = await fetch(selectedCover.imageUrl);
        const blob = await response.blob();

        coverUrl = await uploadBlobToStorage(
          blob,
          "external-cover",
          blob.type || "image/jpeg"
        );
     } else if (frontFile) {
       const resizedBlob = await resizeImageForCover(frontFile);

       coverUrl = await uploadBlobToStorage(
        resizedBlob,
        "uploaded-front-cover",
        "image/jpeg"
    );
}

      const supabase = createClient();

      const { error } = await supabase.from("books").insert({
        title: formData.title.trim(),
        author: formData.author.trim(),
        publisher: formData.publisher.trim() || null,
        tag: formData.tag.trim() || null,
        description: formData.description.trim() || null,
        cover_url: coverUrl,
      });

      if (error) {
        setUiMessage(`Eroare: ${error.message}`, "error");
      } else {
        setUiMessage("Cartea a fost salvată ✔", "success");

        setFormData({
          title: "",
          author: "",
          publisher: "",
          tag: "",
          description: "",
        });

        setFrontFile(null);
        setBackFile(null);
        setFrontImageName("");
        setBackImageName("");
        setOcrText("");
        setCoverCandidates([]);
        setSelectedCoverId(null);
        setManualCoverQuery("");
        setAutoFilled({
          title: false,
          author: false,
        });
      }
    } catch (err) {
      console.error(err);
      setUiMessage("Eroare neașteptată la salvare.", "error");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <>
      <main className="min-h-screen bg-zinc-950 text-white">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Admin</h1>
              <p className="text-sm text-zinc-400">Adaugă cărți în bibliotecă</p>
            </div>

            <div className="flex gap-3">
              <Link
                href="/"
                className="rounded-xl border border-zinc-700 px-4 py-2 text-sm"
              >
                ← Înapoi
              </Link>

              <button
                onClick={handleLogout}
                className="rounded-xl border border-red-500 px-4 py-2 text-sm text-red-400"
              >
                Logout
              </button>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_430px]">
            <form
              onSubmit={handleSubmit}
              className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 space-y-4"
            >
              <div>
                <input
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="Titlu"
                  className={`w-full rounded-xl p-3 transition ${
                    autoFilled.title
                      ? "border border-green-500 bg-green-900/30"
                      : "bg-zinc-800"
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
                      ? "border border-green-500 bg-green-900/30"
                      : "bg-zinc-800"
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
                    {frontImageName || "Nicio imagine selectată pentru față"}
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
                    {backImageName || "Nicio imagine selectată pentru spate"}
                  </p>
                </div>
              </div>

              {message ? (
                <p
                  className={`text-sm ${
                    messageType === "success"
                      ? "text-green-400"
                      : messageType === "error"
                      ? "text-red-400"
                      : "text-zinc-300"
                  }`}
                >
                  {message}
                </p>
              ) : null}

              <button
                disabled={isSaving}
                className="w-full rounded-xl bg-white p-3 font-semibold text-black"
              >
                {isSaving ? "Se salvează..." : "Salvează"}
              </button>

              <button
                type="button"
                onClick={handleScan}
                disabled={isScanning}
                className="w-full rounded-xl border border-zinc-700 p-3 text-white"
              >
                {isScanning
                  ? "Se extrag informațiile..."
                  : "Extrage informațiile din poză"}
              </button>
            </form>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
              <h2 className="mb-4 text-sm text-zinc-400">Preview imagini</h2>

              <div className="grid gap-4">
                <div>
                  <p className="mb-2 text-xs uppercase text-zinc-500">Față</p>
                  {frontPreviewUrl ? (
                    <button
                      type="button"
                      onClick={() => {
                        setZoomedImageUrl(frontPreviewUrl);
                        setZoomedImageLabel("Preview față");
                      }}
                      className="block w-full"
                    >
                      <div className="flex h-[220px] items-center justify-center overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
                        <img
                          src={frontPreviewUrl}
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
                        setZoomedImageLabel("Preview spate");
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
                    className="rounded-xl border border-zinc-700 px-4 text-sm text-white"
                  >
                    {isSearchingCovers ? "Caut..." : "Caută"}
                  </button>
                </div>
              </div>

              {coverCandidates.length > 0 ? (
                <div className="mt-6">
                  <p className="mb-3 text-sm font-semibold text-zinc-300">
                    Coperți găsite
                  </p>

                  <div className="grid gap-3">
                    {coverCandidates.map((candidate) => (
                      <button
                        key={candidate.id}
                        type="button"
                        onClick={() => {
                          setSelectedCoverId(candidate.id);
                          if (!formData.publisher && candidate.publisher) {
                            setFormData((prev) => ({
                              ...prev,
                              publisher: candidate.publisher ?? prev.publisher,
                            }));
                          }
                        }}
                        className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${
                          selectedCoverId === candidate.id
                            ? "border-green-500 bg-green-900/20"
                            : "border-zinc-700 hover:bg-zinc-800"
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

              {ocrText ? (
                <div className="mt-4 rounded-xl border border-zinc-800 p-3 text-xs text-zinc-400">
                  <p className="mb-2 font-semibold text-zinc-300">
                    Text detectat:
                  </p>
                  <pre className="whitespace-pre-wrap">{ocrText}</pre>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </main>

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
                className="rounded-lg border border-zinc-700 px-3 py-1 text-sm"
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