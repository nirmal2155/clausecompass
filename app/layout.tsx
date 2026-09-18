import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { ShieldCheck, Scale, GitCompare, Cpu, Compass, BarChart3 } from "lucide-react";

export const metadata: Metadata = {
  title: "ClauseCompass · Indian Legal Document Co-Pilot",
  description:
    "Grounded legal document co-pilot for Indian citizens. Clause-level risk radar, Indian statute citations, zero hallucination quotes, and multilingual action packs.",
  keywords: ["legal", "Indian law", "contract analysis", "clause", "risk", "Gemini", "AI"],
  openGraph: {
    title: "ClauseCompass · Indian Legal Document Co-Pilot",
    description: "Clause-level risk radar grounded in Indian law. Zero hallucinations.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 flex flex-col antialiased selection:bg-blue-100 selection:text-blue-900">
        {/* ─── Top Announcement Bar ─── */}
        <div className="bg-slate-900 text-slate-300 text-xs px-4 py-1.5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-medium text-slate-200">PromptWars 2026</span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400 hidden sm:inline">Repo: &lt; 10 MB</span>
            <span className="text-slate-600 hidden sm:inline">|</span>
            <span className="text-emerald-400 font-mono text-[11px] hidden md:inline">
              Gemini 2.0 Flash · Native JSON
            </span>
          </div>
          <div className="flex items-center space-x-3 text-[11px]">
            <span className="flex items-center space-x-1 text-blue-300">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Legal Boundary Active</span>
            </span>
            <span className="text-slate-600 hidden sm:inline">|</span>
            <span className="text-amber-300 flex items-center space-x-1">
              <Scale className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Statutes Grounded</span>
            </span>
          </div>
        </div>

        {/* ─── Main Navbar ─── */}
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-lg border-b border-slate-200/80 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-700 to-indigo-900 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
                <Compass className="w-5 h-5 text-blue-200" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xl font-bold tracking-tight text-slate-900">
                    ClauseCompass
                  </span>
                  <span className="px-2 py-0.5 text-[10px] font-semibold bg-blue-50 text-blue-700 rounded-full border border-blue-200">
                    India v2.0
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium -mt-0.5">
                  Grounded Legal Document Co-Pilot
                </p>
              </div>
            </Link>

            <nav className="flex items-center space-x-1 sm:space-x-2 text-sm font-medium">
              <Link
                href="/"
                className="px-3 py-2 text-slate-700 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all flex items-center space-x-1.5"
              >
                <span className="hidden sm:inline">Risk Radar</span>
              </Link>
              <Link
                href="/compare"
                className="px-3 py-2 text-slate-700 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all flex items-center space-x-1.5"
              >
                <GitCompare className="w-4 h-4 text-slate-500" />
                <span className="hidden sm:inline">Compare</span>
              </Link>
              <Link
                href="/trust"
                className="px-3 py-2 text-slate-700 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all flex items-center space-x-1.5"
              >
                <BarChart3 className="w-4 h-4 text-emerald-600" />
                <span className="hidden sm:inline">Trust & Evals</span>
              </Link>
              <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block" />
              <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 rounded-lg text-xs font-mono text-slate-600 border border-slate-200">
                <Cpu className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden sm:inline">Temp 0.2</span>
              </div>
            </nav>
          </div>
        </header>

        {/* ─── Main Body ─── */}
        <main className="flex-1">{children}</main>

        {/* ─── Footer ─── */}
        <footer className="bg-white border-t border-slate-200 py-8 px-4 text-xs text-slate-600 no-print">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-center md:text-left space-y-1">
              <p className="font-semibold text-slate-800 flex items-center justify-center md:justify-start space-x-2">
                <Compass className="w-4 h-4 text-blue-700" />
                <span>ClauseCompass · PromptWars 2026 Submission (26 Sept)</span>
              </p>
              <p className="text-slate-500">
                Grounding Indian Contract Act 1872 · Model Tenancy Act 2021 · Consumer Protection Act 2019 · DPDP Act 2023
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg border border-blue-200 font-medium flex items-center space-x-1">
                <Cpu className="w-3 h-3" />
                <span>Gemini 2.0 Flash</span>
              </span>
              <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200 font-medium">
                WCAG 2.1 AA
              </span>
              <span className="px-2.5 py-1 bg-slate-50 text-slate-700 rounded-lg border border-slate-200 font-medium">
                Zero Cloud Storage (60m TTL)
              </span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
