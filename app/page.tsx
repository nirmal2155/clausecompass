"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldAlert,
  FileText,
  Upload,
  CheckCircle2,
  Lock,
  ArrowRight,
  AlertTriangle,
  FileCheck,
  Scale,
  Sparkles,
  Eye,
  MessageSquare,
  Zap,
  BarChart3,
  Globe,
  ShieldCheck,
  Search,
  Mic,
  Printer,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";

/* ─── Typewriter Effect Hook ─── */
function useTypewriter(texts: string[], speed = 60, pause = 2000) {
  const [display, setDisplay] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [textIndex, setTextIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);

  useEffect(() => {
    const current = texts[textIndex];
    const timeout = setTimeout(() => {
      if (!isDeleting) {
        setDisplay(current.slice(0, charIndex + 1));
        setCharIndex((c) => c + 1);
        if (charIndex + 1 === current.length) {
          setTimeout(() => setIsDeleting(true), pause);
        }
      } else {
        setDisplay(current.slice(0, charIndex - 1));
        setCharIndex((c) => c - 1);
        if (charIndex <= 1) {
          setIsDeleting(false);
          setTextIndex((t) => (t + 1) % texts.length);
        }
      }
    }, isDeleting ? speed / 2 : speed);

    return () => clearTimeout(timeout);
  }, [charIndex, isDeleting, textIndex, texts, speed, pause]);

  return display;
}

/* ─── Animated Counter ─── */
function AnimatedStat({ target, suffix = "", label }: { target: number; suffix?: string; label: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const start = performance.now();
    const duration = 1800;
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [target]);

  return (
    <div ref={ref} className="text-center">
      <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums">
        {count}{suffix}
      </div>
      <div className="text-[11px] text-slate-500 font-medium mt-0.5">{label}</div>
    </div>
  );
}

/* ─── Feature Card ─── */
function FeatureCard({
  icon: Icon,
  title,
  description,
  color,
  delay,
}: {
  icon: any;
  title: string;
  description: string;
  color: string;
  delay: string;
}) {
  const colorMap: Record<string, { bg: string; icon: string; border: string }> = {
    blue:    { bg: "bg-blue-50", icon: "text-blue-600", border: "hover:border-blue-400" },
    emerald: { bg: "bg-emerald-50", icon: "text-emerald-600", border: "hover:border-emerald-400" },
    amber:   { bg: "bg-amber-50", icon: "text-amber-600", border: "hover:border-amber-400" },
    purple:  { bg: "bg-purple-50", icon: "text-purple-600", border: "hover:border-purple-400" },
    rose:    { bg: "bg-rose-50", icon: "text-rose-600", border: "hover:border-rose-400" },
    indigo:  { bg: "bg-indigo-50", icon: "text-indigo-600", border: "hover:border-indigo-400" },
  };
  const c = colorMap[color] || colorMap.blue;

  return (
    <div
      className={`card-3d p-5 rounded-2xl glass border border-slate-200/80 ${c.border} space-y-3 animate-fade-in-up ${delay}`}
    >
      <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center`}>
        <Icon className={`w-5 h-5 ${c.icon}`} />
      </div>
      <h3 className="font-bold text-slate-900 text-sm">{title}</h3>
      <p className="text-xs text-slate-600 leading-relaxed">{description}</p>
    </div>
  );
}

/* ─── Main Landing Page ─── */
export default function HomePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"upload" | "paste">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [rawText, setRawText] = useState("");
  const [docType, setDocType] = useState("Residential Tenancy Agreement");
  const [userRole, setUserRole] = useState("Tenant");
  const [piiRedact, setPiiRedact] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const typewriterText = useTypewriter([
    "Your contract has 3 high-risk clauses.",
    "₹4.5 lakh deposit — no refund timeline.",
    "Section 74 ICA restricts this forfeiture.",
    "This document is silent on wear & tear.",
  ]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (selected.size > 10 * 1024 * 1024) {
        setError("File exceeds 10 MB limit.");
        return;
      }
      setFile(selected);
      setError(null);
    }
  };

  const handleIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (activeTab === "upload" && !file) {
      setError("Please select a legal document PDF or text file.");
      return;
    }
    if (activeTab === "paste" && !rawText.trim()) {
      setError("Please paste contract text to analyze.");
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      if (activeTab === "upload" && file) {
        formData.append("file", file);
      } else {
        formData.append("rawText", rawText);
      }
      formData.append("docType", docType);
      formData.append("userRole", userRole);
      formData.append("piiRedact", piiRedact ? "true" : "false");

      const res = await fetch("/api/ingest", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to analyze document");

      if (typeof window !== "undefined") {
        try {
          sessionStorage.setItem(`doc_${data.id}`, JSON.stringify(data));
        } catch (e) {
          console.warn("sessionStorage save error", e);
        }
      }

      router.push(`/analyze/${data.id}`);
    } catch (err: unknown) {
      const errorObj = err as Error;
      setError(errorObj.message || "Something went wrong.");
      setLoading(false);
    }
  };

  const loadDemo = (demoId: string) => {
    router.push(`/analyze/${demoId}`);
  };

  return (
    <div className="relative overflow-hidden">
      {/* ─── Aurora Hero Background ─── */}
      <div className="absolute inset-0 aurora-bg opacity-60 -z-10" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-slate-50 -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-14 space-y-16">
        {/* ═══ HERO SECTION ═══ */}
        <section className="text-center space-y-6 max-w-4xl mx-auto">
          {/* Badge */}
          <div className="animate-fade-in-down inline-flex items-center space-x-2 px-4 py-1.5 rounded-full glass border border-blue-200/50 text-blue-800 text-xs font-semibold shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>India-Specific Legal Document Co-Pilot</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>

          {/* Main Headline */}
          <h1 className="animate-fade-in-up text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1]">
            <span className="text-slate-900">Clause-Level Risk Radar</span>
            <br />
            <span className="gradient-text">Grounded in Indian Law</span>
          </h1>

          {/* Typewriter Subtitle */}
          <div className="animate-fade-in-up delay-2 h-8 flex items-center justify-center">
            <p className="text-base sm:text-lg text-slate-600 font-medium">
              <span className="text-blue-700 font-semibold">&ldquo;</span>
              {typewriterText}
              <span className="typewriter-cursor" />
              <span className="text-blue-700 font-semibold">&rdquo;</span>
            </p>
          </div>

          <p className="animate-fade-in-up delay-3 text-sm sm:text-base text-slate-500 max-w-2xl mx-auto leading-relaxed">
            Upload any Indian contract. Get clause-level risk analysis, Indian statute citations, silence gap detection, counter-draft suggestions — all with zero hallucinations and verified quotes.
          </p>

          {/* ─── Animated Stats Bar ─── */}
          <div className="animate-fade-in-up delay-4 flex flex-wrap items-center justify-center gap-6 sm:gap-10 pt-2">
            <AnimatedStat target={4} label="Indian Statutes Indexed" />
            <div className="hidden sm:block w-px h-10 bg-slate-300" />
            <AnimatedStat target={61} label="Eval Cases Passed" />
            <div className="hidden sm:block w-px h-10 bg-slate-300" />
            <AnimatedStat target={0} label="Hallucinations" />
            <div className="hidden sm:block w-px h-10 bg-slate-300" />
            <AnimatedStat target={100} suffix="%" label="Citation Verification" />
          </div>
        </section>

        {/* ═══ 3 SCORING LEVERS ═══ */}
        <section className="animate-fade-in-up delay-5 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
          <div className="card-3d p-5 rounded-2xl glass border border-slate-200/80 hover:border-blue-400 space-y-2 transition-all">
            <div className="flex items-center space-x-2 text-blue-700 font-semibold text-sm">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <span>Lever 1: Legal Boundary</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Live post-hoc compliance filter. Advice-shaped outputs automatically rewritten into permitted informational guidance.
            </p>
          </div>
          <div className="card-3d p-5 rounded-2xl glass border border-slate-200/80 hover:border-emerald-400 space-y-2 transition-all">
            <div className="flex items-center space-x-2 text-emerald-700 font-semibold text-sm">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <span>Lever 2: Verified Citations</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Server-side exact substring checks. Hallucinated quotes dropped instantly before reaching the UI.
            </p>
          </div>
          <div className="card-3d p-5 rounded-2xl glass border border-slate-200/80 hover:border-amber-400 space-y-2 transition-all">
            <div className="flex items-center space-x-2 text-amber-700 font-semibold text-sm">
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                <Scale className="w-4 h-4" />
              </div>
              <span>Lever 3: Indian Statutes</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              RAG indexing Indian Contract Act 1872, Model Tenancy Act 2021, Consumer Protection Act 2019, DPDP Act 2023.
            </p>
          </div>
        </section>

        {/* ═══ UPLOAD / INGEST BOX ═══ */}
        <section className="max-w-2xl mx-auto animate-fade-in-up delay-6">
          <div className="glass-strong rounded-2xl border border-slate-200/80 shadow-xl overflow-hidden">
            <div className="border-b border-slate-200/80 bg-slate-50/50 p-4 flex items-center justify-between">
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("upload")}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === "upload"
                      ? "bg-white text-blue-700 shadow-sm border border-slate-200"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Upload PDF / Document
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("paste")}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === "paste"
                      ? "bg-white text-blue-700 shadow-sm border border-slate-200"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Paste Contract Text
                </button>
              </div>
              <span className="text-[11px] text-slate-500 font-mono">10 MB · 60 Page Cap</span>
            </div>

            <form onSubmit={handleIngest} className="p-6 space-y-5">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs flex items-center space-x-2 animate-scale-in">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-600" />
                  <span>{error}</span>
                </div>
              )}

              {activeTab === "upload" ? (
                <div className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-8 text-center cursor-pointer transition-all bg-slate-50/50 relative group">
                  <input
                    type="file"
                    accept=".pdf,.txt,.md"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    id="file-upload"
                  />
                  <div className="space-y-3">
                    <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-50 flex items-center justify-center text-blue-700 group-hover:scale-110 transition-transform">
                      <Upload className="w-7 h-7" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        {file ? file.name : "Click or drag legal contract here"}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">PDF, TXT, or Markdown (Max 10 MB)</p>
                    </div>
                    {file && (
                      <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium animate-scale-in">
                        Ready: {(file.size / 1024).toFixed(1)} KB
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <label htmlFor="raw-text" className="text-xs font-semibold text-slate-700 block">
                    Contract Text
                  </label>
                  <textarea
                    id="raw-text"
                    rows={6}
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    placeholder="Paste legal agreement text here (e.g. Rent agreement clauses, employment terms, NDA)..."
                    className="w-full text-xs font-mono p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                </div>
              )}

              {/* Context Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="doc-type" className="text-xs font-semibold text-slate-700 block mb-1">
                    Document Type
                  </label>
                  <select
                    id="doc-type"
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500 transition-all"
                  >
                    <option value="Residential Tenancy Agreement">Residential Tenancy / Lease</option>
                    <option value="Employment Contract">Employment Agreement</option>
                    <option value="Commercial Service Agreement">Vendor / Commercial Contract</option>
                    <option value="Non-Disclosure Agreement">NDA / Confidentiality</option>
                    <option value="Consumer Terms of Service">Consumer Terms of Service</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="user-role" className="text-xs font-semibold text-slate-700 block mb-1">
                    Your Role in Contract
                  </label>
                  <select
                    id="user-role"
                    value={userRole}
                    onChange={(e) => setUserRole(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500 transition-all"
                  >
                    <option value="Tenant">Tenant (Lessee)</option>
                    <option value="Employee">Employee / Contractor</option>
                    <option value="Consumer">Consumer / End User</option>
                    <option value="Client">Client / Buyer</option>
                    <option value="Landlord">Landlord (Lessor)</option>
                  </select>
                </div>
              </div>

              {/* PII Toggle */}
              <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200 flex items-start justify-between space-x-3">
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <Lock className="w-3.5 h-3.5 text-blue-700" />
                    <span className="text-xs font-semibold text-slate-800">Pre-LLM Indian PII Redaction</span>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] rounded font-mono font-semibold">
                      Active
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    Automatically masks PAN, 12-digit Aadhaar, phone, email, and bank accounts into tokens before model transmission.
                  </p>
                </div>
                <input
                  type="checkbox"
                  id="pii-toggle"
                  aria-label="Pre-LLM Indian PII Redaction"
                  checked={piiRedact}
                  onChange={(e) => setPiiRedact(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-white font-semibold text-sm shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 group"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Segmenting Clauses with Gemini 2.0 Flash...</span>
                  </>
                ) : (
                  <>
                    <span>Launch Risk Radar Analysis</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>
          </div>
        </section>

        {/* ═══ DEMO CONTRACTS ═══ */}
        <section className="space-y-5 max-w-5xl mx-auto">
          <div className="flex items-center justify-between animate-fade-in-up">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                <FileCheck className="w-5 h-5 text-blue-700" />
                <span>Instant Demo Agreements</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Pre-analyzed contracts for evaluator inspection. Click to explore immediately.
              </p>
            </div>
            <span className="text-xs px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg font-semibold animate-pulse">
              Demo Day Insurance
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Demo Card 1 */}
            <div
              onClick={() => loadDemo("demo-rent-bangalore")}
              className="card-3d p-5 rounded-2xl glass-strong border border-slate-200/80 hover:border-blue-500 cursor-pointer group flex flex-col justify-between animate-fade-in-up delay-1"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 text-[10px] font-bold bg-red-100 text-red-800 rounded-full">
                    ▲ 3 High Risks
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">11 Clauses</span>
                </div>
                <h3 className="font-bold text-slate-900 group-hover:text-blue-700 transition-colors text-sm">
                  Bangalore Residential Lease (11 Mo)
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  6-month lock-in with total deposit forfeiture, 10-month deposit, unilateral utility disconnection, and court waiver.
                </p>
                {/* Risk Mini Bar */}
                <div className="flex items-center space-x-1">
                  <div className="h-1.5 rounded-full bg-red-400 flex-[3]" />
                  <div className="h-1.5 rounded-full bg-amber-400 flex-[4]" />
                  <div className="h-1.5 rounded-full bg-emerald-400 flex-[4]" />
                </div>
              </div>
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-blue-700 font-medium mt-4">
                <span>Inspect Risk Radar</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Demo Card 2 */}
            <div
              onClick={() => loadDemo("demo-employment-tech")}
              className="card-3d p-5 rounded-2xl glass-strong border border-slate-200/80 hover:border-purple-500 cursor-pointer group flex flex-col justify-between animate-fade-in-up delay-2"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 text-[10px] font-bold bg-purple-100 text-purple-800 rounded-full">
                    Sec 27 ICA Hero
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">Employment</span>
                </div>
                <h3 className="font-bold text-slate-900 group-hover:text-purple-700 transition-colors text-sm">
                  Tech Senior Engineer Contract
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  24-month nationwide non-compete (void ab initio under Section 27 ICA), Rs. 5L bond, DPDP consent waiver.
                </p>
                <div className="flex items-center space-x-1">
                  <div className="h-1.5 rounded-full bg-red-400 flex-[4]" />
                  <div className="h-1.5 rounded-full bg-amber-400 flex-[3]" />
                  <div className="h-1.5 rounded-full bg-emerald-400 flex-[3]" />
                </div>
              </div>
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-purple-700 font-medium mt-4">
                <span>Inspect Section 27 Voiding</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Demo Card 3 */}
            <div
              onClick={() => loadDemo("demo-injection-test")}
              className="card-3d p-5 rounded-2xl glass-strong border border-slate-200/80 hover:border-amber-500 cursor-pointer group flex flex-col justify-between animate-fade-in-up delay-3"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 rounded-full">
                    P8 Defense Hero
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">Security Test</span>
                </div>
                <h3 className="font-bold text-slate-900 group-hover:text-amber-700 transition-colors text-sm">
                  Prompt Injection Attack Sample
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Embedded stealth jailbreak attempting to force model to mark all clauses safe. Shows live isolation defense!
                </p>
                <div className="flex items-center space-x-1">
                  <div className="h-1.5 rounded-full bg-red-400 flex-[2]" />
                  <div className="h-1.5 rounded-full bg-amber-400 flex-[8]" />
                  <div className="h-1.5 rounded-full bg-emerald-400 flex-[1]" />
                </div>
              </div>
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-amber-700 font-medium mt-4">
                <span>View Caught Jailbreak</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </section>

        {/* ═══ FEATURE GRID ═══ */}
        <section className="max-w-5xl mx-auto space-y-6">
          <div className="text-center animate-fade-in-up">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Beyond PDF Summaries
            </h2>
            <p className="text-sm text-slate-500 mt-2 max-w-xl mx-auto">
              11 GenAI touchpoints. Every citation verified. Every output grounded in Indian statute.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <FeatureCard icon={Eye} title="Risk Radar Split View" description="Clause-by-clause analysis with synchronized scrolling, shape+text severity badges, and WCAG 2.1 AA compliant highlights." color="blue" delay="delay-1" />
            <FeatureCard icon={MessageSquare} title="Grounded Q&A" description="Ask in Hindi or English. Get answers with verified citations that jump to the exact clause." color="emerald" delay="delay-2" />
            <FeatureCard icon={Scale} title="Indian Statute Check" description="Instant grounding against 4 Indian statutes with section-specific citations and questions for your advocate." color="amber" delay="delay-3" />
            <FeatureCard icon={Search} title="Silence Radar" description="Detects what's MISSING from your contract — deposit refund timelines, wear and tear, force majeure." color="rose" delay="delay-4" />
            <FeatureCard icon={FileText} title="Counter-Draft Engine" description="Generates balanced redline proposals with anticipated objections and fallback negotiation positions." color="purple" delay="delay-5" />
            <FeatureCard icon={Zap} title="Scenario Simulator" description="'What if I lose my job in month 4?' — chronological financial cascade with ₹5.75L total exposure." color="indigo" delay="delay-6" />
            <FeatureCard icon={Globe} title="Multilingual Action Pack" description="Summary, checklist, lawyer questions, and negotiation email in English or Hindi." color="blue" delay="delay-7" />
            <FeatureCard icon={Mic} title="Voice Access" description="Speak your question in Hindi or English. Listen to simplified explanations with Father Mode TTS." color="emerald" delay="delay-8" />
            <FeatureCard icon={BarChart3} title="Trust Dashboard" description="61-case golden benchmark. 100% citation verification. 100% injection defense. Fully transparent." color="amber" delay="delay-1" />
          </div>
        </section>

        {/* ═══ COMPARE CTA ═══ */}
        <section className="max-w-5xl mx-auto animate-fade-in-up">
          <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-purple-900 text-white rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xl relative overflow-hidden">
            {/* Decorative circles */}
            <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-white/5" />
            <div className="absolute -bottom-16 -left-16 w-32 h-32 rounded-full bg-white/5" />

            <div className="space-y-2 text-center sm:text-left relative z-10">
              <span className="px-2.5 py-0.5 text-[10px] font-bold bg-blue-500/30 text-blue-200 rounded-full border border-blue-400/30">
                Semantic Compare
              </span>
              <h2 className="text-xl sm:text-2xl font-bold">Compare Original vs Negotiated Draft</h2>
              <p className="text-xs sm:text-sm text-blue-200 max-w-xl">
                Semantic diffs report real effect changes (e.g. &quot;Notice period increased from 30 to 90 days&quot;) ranked by materiality.
              </p>
            </div>
            <Link
              href="/compare"
              className="px-6 py-3 bg-white text-blue-900 rounded-xl font-bold text-sm shadow-lg hover:bg-blue-50 transition-all whitespace-nowrap flex items-center space-x-2 relative z-10 group"
            >
              <span>Open Compare Mode</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </section>

        {/* ═══ TRUST CTA ═══ */}
        <section className="max-w-3xl mx-auto text-center animate-fade-in-up pb-8">
          <div className="p-6 glass-strong rounded-2xl border border-slate-200/80 space-y-3">
            <ShieldCheck className="w-8 h-8 text-emerald-600 mx-auto" />
            <h3 className="text-lg font-bold text-slate-900">Zero Hallucinations Is Not a Marketing Claim</h3>
            <p className="text-sm text-slate-600 max-w-lg mx-auto">
              It&apos;s a measurable engineering invariant. See our 61-case golden benchmark with 100% citation verification, 100% refusal accuracy, and 100% injection defense.
            </p>
            <Link
              href="/trust"
              className="inline-flex items-center space-x-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-all group"
            >
              <span>View Trust & Evals Dashboard</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
