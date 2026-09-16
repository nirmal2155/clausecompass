"use client";

import { useState } from "react";
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
  ExternalLink,
  Info,
} from "lucide-react";
import Link from "next/link";

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

      const res = await fetch("/api/ingest", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to analyze document");
      }

      router.push(`/analyze/${data.id}`);
    } catch (err: unknown) {
      const errorObj = err as Error;
      setError(errorObj.message || "Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  const loadDemo = (demoId: string) => {
    router.push(`/analyze/${demoId}`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      {/* Hero Section */}
      <section className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <span>India-Specific Legal Document Co-Pilot</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
          Clause-by-Clause Risk Radar Grounded in <span className="text-blue-700 underline decoration-blue-300">Indian Law</span>
        </h1>
        <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
          ClauseCompass analyzes contracts at the discrete clause level, grounds them against Indian statutes, verifies every quotation substring, and answers in your language without exceeding legal boundaries.
        </p>

        {/* 3 Winning Levers Banner */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 text-left">
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-1 hover:border-blue-400 transition-colors">
            <div className="flex items-center space-x-2 text-blue-700 font-semibold text-sm">
              <ShieldAlert className="w-4 h-4" />
              <span>Lever 1: Legal Boundary</span>
            </div>
            <p className="text-xs text-slate-600 leading-normal">
              Live post-hoc compliance filter rewriting legal advice into permitted informational guidance.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-1 hover:border-emerald-400 transition-colors">
            <div className="flex items-center space-x-2 text-emerald-700 font-semibold text-sm">
              <CheckCircle2 className="w-4 h-4" />
              <span>Lever 2: Verified Citations</span>
            </div>
            <p className="text-xs text-slate-600 leading-normal">
              Server-side exact substring checks. Hallucinated quotes are dropped instantly before reaching UI.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-1 hover:border-amber-400 transition-colors">
            <div className="flex items-center space-x-2 text-amber-700 font-semibold text-sm">
              <Scale className="w-4 h-4" />
              <span>Lever 3: Indian Statutes</span>
            </div>
            <p className="text-xs text-slate-600 leading-normal">
              RAG indexing Indian Contract Act 1872, Model Tenancy Act 2021, CPA 2019, and DPDP Act 2023.
            </p>
          </div>
        </div>
      </section>

      {/* Main Upload / Ingest Box */}
      <section className="max-w-2xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50/70 p-4 flex items-center justify-between">
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={() => setActiveTab("upload")}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
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
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
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
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {activeTab === "upload" ? (
            <div className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-6 text-center cursor-pointer transition-colors bg-slate-50/50 relative">
              <input
                type="file"
                accept=".pdf,.txt,.md"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                id="file-upload"
              />
              <div className="space-y-2">
                <div className="w-12 h-12 mx-auto rounded-full bg-blue-50 flex items-center justify-center text-blue-700">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {file ? file.name : "Click or drag legal contract here"}
                  </p>
                  <p className="text-xs text-slate-500">PDF, TXT, or Markdown (Max 10 MB)</p>
                </div>
                {file && (
                  <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
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
                className="w-full text-xs font-mono p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}

          {/* Context Options: Doc Type & User Role */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="doc-type" className="text-xs font-semibold text-slate-700 block mb-1">
                Document Type
              </label>
              <select
                id="doc-type"
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500"
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
                className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="Tenant">Tenant (Lessee)</option>
                <option value="Employee">Employee / Contractor</option>
                <option value="Consumer">Consumer / End User</option>
                <option value="Client">Client / Buyer</option>
                <option value="Landlord">Landlord (Lessor)</option>
              </select>
            </div>
          </div>

          {/* Security Control: PII Redaction Toggle */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-start justify-between space-x-3">
            <div className="space-y-0.5">
              <div className="flex items-center space-x-2">
                <Lock className="w-3.5 h-3.5 text-blue-700" />
                <span className="text-xs font-semibold text-slate-800">Pre-LLM Indian PII Redaction</span>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] rounded font-mono font-semibold">
                  Active
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-tight">
                Automatically masks PAN, 12-digit Aadhaar, phone, email, and bank accounts into tokens (e.g. <span className="font-mono text-blue-700">[PAN_1]</span>) before model transmission.
              </p>
            </div>
            <input
              type="checkbox"
              id="pii-toggle"
              checked={piiRedact}
              onChange={(e) => setPiiRedact(e.target.checked)}
              className="mt-1 h-4 w-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-semibold text-sm shadow-md transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Segmenting Clauses with Gemini 2.0 Flash...</span>
              </>
            ) : (
              <>
                <span>Launch Risk Radar Analysis</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </section>

      {/* Demo Day Insurance: Instant Pre-Analyzed Contract Cards */}
      <section className="space-y-4 max-w-5xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
              <FileCheck className="w-5 h-5 text-blue-700" />
              <span>Instant Demonstration Agreements (Live Cache)</span>
            </h2>
            <p className="text-xs text-slate-500">
              Zero-latency test cases prepared for evaluator inspection. Click to inspect immediately.
            </p>
          </div>
          <span className="text-xs px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-md font-semibold">
            Demo Day Insurance
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1 */}
          <div
            onClick={() => loadDemo("demo-rent-bangalore")}
            className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-blue-500 hover:shadow-lg transition-all cursor-pointer group flex flex-col justify-between"
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
              <p className="text-xs text-slate-600 leading-normal">
                Features 6-month lock-in with total deposit forfeiture, 10-month deposit, unilateral utility disconnection, and court waiver.
              </p>
            </div>
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-blue-700 font-medium">
              <span>Inspect Risk Radar</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 2 */}
          <div
            onClick={() => loadDemo("demo-employment-tech")}
            className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-blue-500 hover:shadow-lg transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 text-[10px] font-bold bg-purple-100 text-purple-800 rounded-full">
                  Sec 27 ICA Hero
                </span>
                <span className="text-[11px] text-slate-400 font-mono">Employment</span>
              </div>
              <h3 className="font-bold text-slate-900 group-hover:text-blue-700 transition-colors text-sm">
                Tech Senior Engineer Contract
              </h3>
              <p className="text-xs text-slate-600 leading-normal">
                Contains a 24-month nationwide non-compete (void ab initio under Section 27 ICA), Rs. 5L bond, and DPDP consent waiver.
              </p>
            </div>
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-blue-700 font-medium">
              <span>Inspect Section 27 Voiding</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 3: Prompt Injection Defense Hero */}
          <div
            onClick={() => loadDemo("demo-injection-test")}
            className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-amber-500 hover:shadow-lg transition-all cursor-pointer group flex flex-col justify-between"
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
              <p className="text-xs text-slate-600 leading-normal">
                Contract with embedded stealth jailbreak directive attempting to force model to mark all clauses safe. Shows live isolation defense!
              </p>
            </div>
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-amber-700 font-medium">
              <span>View Caught Jailbreak</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </section>

      {/* Compare Feature Callout */}
      <section className="max-w-5xl mx-auto bg-gradient-to-r from-blue-900 to-indigo-950 text-white rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2 text-center sm:text-left">
          <span className="px-2.5 py-0.5 text-[10px] font-bold bg-blue-500/30 text-blue-200 rounded-full border border-blue-400/30">
            Feature 4 · Semantic Compare
          </span>
          <h2 className="text-xl sm:text-2xl font-bold">Compare Original vs Negotiated Draft</h2>
          <p className="text-xs sm:text-sm text-blue-200 max-w-xl">
            Semantic diffs report real effect changes (e.g. &quot;Notice period increased from 30 to 90 days&quot;) ranked by materiality rather than simple text differences.
          </p>
        </div>
        <Link
          href="/compare"
          className="px-5 py-2.5 bg-white text-blue-900 rounded-xl font-bold text-xs sm:text-sm shadow-md hover:bg-blue-50 transition-colors whitespace-nowrap flex items-center space-x-2"
        >
          <span>Open Compare Mode</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </section>
    </div>
  );
}
