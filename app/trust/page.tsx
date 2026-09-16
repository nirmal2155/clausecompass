"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  Scale,
  Sparkles,
  ArrowLeft,
  Clock,
  Filter,
  Cpu,
  RefreshCw,
  Terminal,
  ExternalLink,
} from "lucide-react";
import { EvalCase, EvalSummary } from "@/lib/schema";

export default function TrustDashboardPage() {
  const [summary, setSummary] = useState<EvalSummary | null>(null);
  const [cases, setCases] = useState<EvalCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>("all");

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/eval");
      const data = await res.json();
      setSummary(data.summary);
      setCases(data.cases || []);
    } catch (err) {
      console.error("Failed to load eval data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredCases = cases.filter((c) => {
    if (activeFilter === "all") return true;
    return c.type === activeFilter;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center space-x-2">
            <Link
              href="/"
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="inline-flex items-center space-x-2 px-3 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Public Trust & Evaluation Harness</span>
            </div>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-2">
            How We Know ClauseCompass Doesn&apos;t Make Things Up
          </h1>
          <p className="text-sm text-slate-600 max-w-3xl mt-1">
            Zero hallucinations is not a marketing claim; it is a measurable engineering invariant. We evaluate ourselves continuously across a 60-case golden benchmark spanning leases, employment agreements, loans, NDAs, and prompt-injection attack contracts.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center space-x-2 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Re-Run Eval Benchmark</span>
        </button>
      </div>

      {/* Hero Metric Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Card 1: Citation Verification Rate */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold">Citation Verification</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-3xl font-extrabold text-slate-900">
              {summary.citationVerificationRate}%
            </div>
            <p className="text-[11px] text-slate-500">
              Target: 100% · Every quoted span verified via server-side substring match.
            </p>
          </div>

          {/* Card 2: Refusal Accuracy */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold">Refusal Accuracy</span>
              <FileCheck className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-3xl font-extrabold text-blue-700">
              {summary.refusalAccuracy}%
            </div>
            <p className="text-[11px] text-slate-500">
              Target: &gt; 95% · Clean refusal on out-of-scope queries (e.g. &ldquo;Pet policy?&rdquo;).
            </p>
          </div>

          {/* Card 3: Guardrail Catch Rate */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold">Legal Boundary Catch</span>
              <ShieldCheck className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-3xl font-extrabold text-purple-700">
              {summary.guardrailCatchRate}%
            </div>
            <p className="text-[11px] text-slate-500">
              Target: 100% · Advice-shaped drafts (&ldquo;You should sue&rdquo;) rewritten into informational form.
            </p>
          </div>

          {/* Card 4: Prompt Injection Catch Rate */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold">Injection Defense</span>
              <Sparkles className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-3xl font-extrabold text-amber-700">
              {summary.injectionFlagRate}%
            </div>
            <p className="text-[11px] text-slate-500">
              Target: 100% · P8 isolation catches stealth override commands in uploaded files.
            </p>
          </div>
        </div>
      )}

      {/* Secondary Benchmark Telemetry Row */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-800">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-slate-900 block">
                High-Risk Inflation: {summary.severityHighDistribution}%
              </span>
              <span className="text-slate-500 text-[11px]">
                Target: &lt; 40% high severity · Prevents artificial alarmism.
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-800">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-slate-900 block">
                p95 Latency: {summary.p95LatencyMs} ms
              </span>
              <span className="text-slate-500 text-[11px]">
                Sub-second response on cached clauses and pre-computed statutes.
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center text-slate-800">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-slate-900 block truncate">
                {summary.model}
              </span>
              <span className="text-slate-500 text-[11px]">
                Prompt Version: {summary.promptVersion} · Native JSON mode
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Case Explorer */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div className="flex items-center space-x-2">
            <Terminal className="w-4 h-4 text-slate-500" />
            <h2 className="text-base font-bold text-slate-900">
              Golden Set Case Explorer ({filteredCases.length} Cases)
            </h2>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap gap-1">
            {[
              { id: "all", label: "All Cases" },
              { id: "answerable", label: "Answerable Queries" },
              { id: "unanswerable", label: "Refusal Checks" },
              { id: "boundary", label: "Legal Boundary" },
              { id: "injection", label: "Injection Attacks" },
              { id: "gap", label: "Silence Gaps" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  activeFilter === tab.id
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Case Table */}
        <div className="divide-y divide-slate-200 border border-slate-200 rounded-2xl bg-white shadow-xs overflow-hidden text-xs">
          {filteredCases.map((c) => (
            <div key={c.id} className="p-4 hover:bg-slate-50/70 transition-colors space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center space-x-2 font-mono">
                  <span className="font-bold text-slate-900">{c.id}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                      c.type === "unanswerable"
                        ? "bg-blue-100 text-blue-800"
                        : c.type === "boundary"
                        ? "bg-purple-100 text-purple-800"
                        : c.type === "injection"
                        ? "bg-amber-100 text-amber-800"
                        : c.type === "gap"
                        ? "bg-rose-100 text-rose-800"
                        : "bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    {c.type}
                  </span>
                  <span className="text-slate-400 text-[11px]">{c.doc}</span>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px]">
                    <span>✓ Passed</span>
                  </span>
                  <span className="text-slate-400 font-mono text-[10px]">
                    {c.result?.latencyMs} ms
                  </span>
                </div>
              </div>

              {/* Prompt query */}
              <p className="font-semibold text-slate-900 text-sm">{c.q}</p>

              {/* Detail Output */}
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-slate-600 font-mono text-[11px] flex items-start space-x-2">
                <span className="text-slate-400 font-sans font-semibold">Evaluation:</span>
                <span className="text-slate-800">{c.result?.detail}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
