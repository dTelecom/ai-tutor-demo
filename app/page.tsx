"use client";

import { useRouter } from "next/navigation";
import SubjectCard from "@/components/SubjectCard";
import { languages } from "@/lib/languages";

export default function Home() {
  const router = useRouter();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold">Language Tutor</h1>
          <p className="mt-2 text-white/60">
            Choose a language to start learning
          </p>
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
