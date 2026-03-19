"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AdminPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    title: "",
    author: "",
    publisher: "",
    tag: "",
    description: "",
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageName, setImageName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const previewUrl = useMemo(() => {
    if (!selectedFile) return null;
    return URL.createObjectURL(selectedFile);
  }, [selectedFile]);

  // 🔐 PROTECT ADMIN PAGE
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

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
    setImageName(file ? file.name : "");
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);

    if (!formData.title.trim() || !formData.author.trim()) {
      setMessage("Titlul și autorul sunt obligatorii.");
      return;
    }

    setIsSaving(true);

    try {
      const supabase = createClient();

      let coverUrl: string | null = null;

      // 🔹 upload imagine
      if (selectedFile) {
        const fileExt = selectedFile.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}.${fileExt}`;

        const filePath = `covers/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("book-covers")
          .upload(filePath, selectedFile);

        if (uploadError) {
          setMessage(`Eroare upload: ${uploadError.message}`);
          setIsSaving(false);
          return;
        }

        const { data } = supabase.storage
          .from("book-covers")
          .getPublicUrl(filePath);

        coverUrl = data.publicUrl;
      }

      // 🔹 insert DB
      const { error } = await supabase.from("books").insert({
        title: formData.title.trim(),
        author: formData.author.trim(),
        publisher: formData.publisher.trim() || null,
        tag: formData.tag.trim() || null,
        description: formData.description.trim() || null,
        cover_url: coverUrl,
      });

      if (error) {
        setMessage(`Eroare: ${error.message}`);
      } else {
        setMessage("Cartea a fost salvată ✔");

        setFormData({
          title: "",
          author: "",
          publisher: "",
          tag: "",
          description: "",
        });
        setSelectedFile(null);
        setImageName("");
      }
    } catch (err) {
      console.error(err);
      setMessage("Eroare neașteptată");
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
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto max-w-5xl px-4 py-8">
        
        {/* HEADER */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Admin</h1>
            <p className="text-sm text-zinc-400">
              Adaugă cărți în bibliotecă
            </p>
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

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          
          {/* FORM */}
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 space-y-4"
          >
            <input
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Titlu"
              className="w-full p-3 rounded-xl bg-zinc-800"
            />

            <input
              name="author"
              value={formData.author}
              onChange={handleChange}
              placeholder="Autor"
              className="w-full p-3 rounded-xl bg-zinc-800"
            />

            <input
              name="publisher"
              value={formData.publisher}
              onChange={handleChange}
              placeholder="Editură"
              className="w-full p-3 rounded-xl bg-zinc-800"
            />

            <input
              name="tag"
              value={formData.tag}
              onChange={handleChange}
              placeholder="Tag"
              className="w-full p-3 rounded-xl bg-zinc-800"
            />

            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Descriere"
              className="w-full p-3 rounded-xl bg-zinc-800"
            />

            <input type="file" onChange={handleFileChange} />

            {message && (
              <p className="text-sm text-zinc-300">{message}</p>
            )}

            <button
              disabled={isSaving}
              className="w-full p-3 rounded-xl bg-white text-black font-semibold"
            >
              {isSaving ? "Se salvează..." : "Salvează"}
            </button>
          </form>

          {/* PREVIEW */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
            <h2 className="mb-4 text-sm text-zinc-400">
              Preview copertă
            </h2>

            {previewUrl ? (
              <img
                src={previewUrl}
                className="h-[400px] w-full object-cover rounded-xl"
              />
            ) : (
              <div className="h-[400px] flex items-center justify-center text-zinc-500 border border-dashed rounded-xl">
                Fără imagine
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}