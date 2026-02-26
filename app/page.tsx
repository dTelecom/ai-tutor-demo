"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import SubjectCard from "@/components/SubjectCard";
import { languages } from "@/lib/languages";

type Provider = "deepgram" | "dtelecom";

interface ProviderSelection {
  stt: Provider;
  tts: Provider;
}

const STORAGE_KEY = "tutor:providers";
const DEFAULT_PROVIDERS: ProviderSelection = { stt: "dtelecom", tts: "dtelecom" };

function loadProviders(): ProviderSelection {
  if (typeof window === "undefined") return DEFAULT_PROVIDERS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_PROVIDERS, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_PROVIDERS;
}

function ProviderToggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Provider;
  onChange: (v: Provider) => void;
}) {
  const options: { id: Provider; name: string }[] = [
    { id: "dtelecom", name: "dTelecom" },
    { id: "deepgram", name: "Deepgram" },
  ];
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-white/50 w-10">{label}</span>
      <div className="flex rounded-full border border-white/10 bg-white/5 p-0.5">
        {options.map((opt) => (
          <button
            key={opt.id}
            onClick={() => onChange(opt.id)}
            className={`rounded-full px-4 py-1 text-sm transition-colors ${
              value === opt.id
                ? "bg-blue-600 text-white"
                : "text-white/40 hover:text-white/70"
            }`}
          >
            {opt.name}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const [providers, setProviders] = useState<ProviderSelection>(DEFAULT_PROVIDERS);

  useEffect(() => {
    const loaded = loadProviders();
    setProviders(loaded);
    // Persist defaults so lessons page always has a value
    if (!localStorage.getItem(STORAGE_KEY)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(loaded));
    }
  }, []);

  function updateProvider(key: keyof ProviderSelection, value: Provider) {
    const next = { ...providers, [key]: value };
    setProviders(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold">Language Tutor</h1>
          <p className="mt-2 text-white/60">
            Choose a language to start learning
          </p>
        </div>

        <div className="flex justify-center gap-6">
          <ProviderToggle
            label="STT"
            value={providers.stt}
            onChange={(v) => updateProvider("stt", v)}
          />
          <ProviderToggle
            label="TTS"
            value={providers.tts}
            onChange={(v) => updateProvider("tts", v)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {languages.map((lang) => (
            <SubjectCard
              key={lang.id}
              language={lang}
              selected={false}
              onClick={() => router.push(`/lessons/${lang.id}`)}
            />
          ))}
        </div>
      </div>
    </main>
  );
}
