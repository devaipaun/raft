"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const supabase = createClient();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError("Email sau parolă greșită");
    } else {
      router.push("/admin");
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white flex flex-col">
      
      {/* 🔙 BACK BUTTON */}
      <div className="p-4">
        <Link
          href="/"
          className="inline-flex rounded-xl border border-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-900"
        >
          ← Înapoi la bibliotecă
        </Link>
      </div>

      {/* FORM */}
      <div className="flex flex-1 items-center justify-center">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-sm space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-6"
        >
          <h1 className="text-xl font-bold">Login</h1>

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl bg-zinc-800 p-3 text-sm"
          />

          <input
            type="password"
            placeholder="Parolă"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl bg-zinc-800 p-3 text-sm"
          />

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          <button className="w-full rounded-xl bg-white p-3 text-black font-semibold">
            Login
          </button>
        </form>
      </div>
    </main>
  );
}