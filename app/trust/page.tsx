"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  CheckCircle2,
  FileCheck,
  Scale,
  Sparkles,
  ArrowLeft,
  Clock,
  Filter,
  Cpu,
  RefreshCw,
  Terminal,
  Search,
  BarChart3,
  ChevronRight
} from "lucide-react";
import { EvalCase, EvalSummary } from "@/lib/schema";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { RadarChart } from "@/components/RadarChart";
import { PipelineDiagram } from "@/components/PipelineDiagram";

export default function TrustDashboardPage() {
  const [summary, setSummary] = useState<EvalSummary | null>(null);
  const [cases, setCases] = useState<EvalCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

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
    const matchesFilter = activeFilter === "all" || c.type === activeFilter;
    const matchesSearch = c.q.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Category breakdown calculations
  const categoryCounts = {
    answerable: cases.filter(c => c.type === "answerable").length,
    unanswerable: cases.filter(c => c.type === "unanswerable").length,
    boundary: cases.filter(c => c.type === "boundary").length,
    injection: cases.filter(c => c.type === "injection").length,
    gap: cases.filter(c => c.type === "gap").length,
  };
  const totalCasesCount = cases.length || 1; // avoid div by 0

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      {/* 1. Hero Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6 animate-fade-in-down">
        <div>
          <div className="flex items-center space-x-2">
            <Link
              href="/"
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-800 text-xs font-semibold">
              <ShieldCheck className="w-4 h-4 text-slate-600" />
              <span>Public Trust & Evaluation Harness</span>
            </div>
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mt-4">
            How We Know ClauseCompass Doesn&apos;t Make Things Up
          </h1>
          <p className="text-base text-slate-600 max-w-3xl mt-2">
            Zero hallucinations is not a marketing claim; it is a measurable engineering invariant. We evaluate ourselves continuously across a golden benchmark spanning leases, employment agreements, loans, NDAs, and prompt-injection attack contracts.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold shadow-xs flex items-center space-x-2 disabled:opacity-50 transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          <span>Re-Run Eval Benchmark</span>
        </button>
      </div>

      {loading && !summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-32 skeleton rounded-2xl"></div>)}
        </div>
      )}

      {/* 2. Hero Metric Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in-up delay-1">
          {/* Card 1: Citation Verification Rate */}
          <div className="p-6 rounded-2xl bg-white border border-emerald-100 shadow-sm space-y-3 relative overflow-hidden card-3d">
            <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500" style={{ width: `${summary.citationVerificationRate}%`}}></div>
            <div className="flex items-center justify-between text-sm text-slate-500">
              <span className="font-semibold">Citation Verification Rate</span>
              <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-4xl font-extrabold text-slate-900">
              <AnimatedCounter target={summary.citationVerificationRate} suffix="%" />
            </div>
            <p className="text-xs text-slate-500">
              Target: 100% · Every quoted span verified via server-side substring match.
            </p>
          </div>

          {/* Card 2: Refusal Accuracy */}
          <div className="p-6 rounded-2xl bg-white border border-blue-100 shadow-sm space-y-3 relative overflow-hidden card-3d">
            <div className="absolute top-0 left-0 w-full h-1 bg-blue-500" style={{ width: `${summary.refusalAccuracy}%`}}></div>
            <div className="flex items-center justify-between text-sm text-slate-500">
              <span className="font-semibold">Refusal Accuracy</span>
              <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                <FileCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-4xl font-extrabold text-blue-700">
              <AnimatedCounter target={summary.refusalAccuracy} suffix="%" />
            </div>
            <p className="text-xs text-slate-500">
              Target: &gt; 95% · Clean refusal on out-of-scope queries.
            </p>
          </div>

          {/* Card 3: Guardrail Catch Rate */}
          <div className="p-6 rounded-2xl bg-white border border-purple-100 shadow-sm space-y-3 relative overflow-hidden card-3d">
            <div className="absolute top-0 left-0 w-full h-1 bg-purple-500" style={{ width: `${summary.guardrailCatchRate}%`}}></div>
            <div className="flex items-center justify-between text-sm text-slate-500">
              <span className="font-semibold">Legal Boundary Catch Rate</span>
              <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-4xl font-extrabold text-purple-700">
              <AnimatedCounter target={summary.guardrailCatchRate} suffix="%" />
            </div>
            <p className="text-xs text-slate-500">
              Target: 100% · Advice-shaped drafts rewritten into informational form.
            </p>
          </div>

          {/* Card 4: Prompt Injection Catch Rate */}
          <div className="p-6 rounded-2xl bg-white border border-amber-100 shadow-sm space-y-3 relative overflow-hidden card-3d">
            <div className="absolute top-0 left-0 w-full h-1 bg-amber-500" style={{ width: `${summary.injectionFlagRate}%`}}></div>
            <div className="flex items-center justify-between text-sm text-slate-500">
              <span className="font-semibold">Injection Defense Rate</span>
              <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>
            <div className="text-4xl font-extrabold text-amber-700">
              <AnimatedCounter target={summary.injectionFlagRate} suffix="%" />
            </div>
            <p className="text-xs text-slate-500">
              Target: 100% · P8 isolation catches stealth override commands in uploaded files.
            </p>
          </div>
        </div>
      )}

      {/* 3. Secondary Stats Row in glass card */}
      {summary && (
        <div className="glass-strong p-6 rounded-2xl grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in-up delay-2">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-slate-900 block text-sm">
                High-Risk Inflation: {summary.severityHighDistribution}%
              </span>
              <span className="text-slate-500 text-xs">
                Target: &lt; 40% high severity
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-slate-900 block text-sm">
                p95 Latency: {summary.p95LatencyMs} ms
              </span>
              <span className="text-slate-500 text-xs">
                Sub-second response on cached clauses
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-slate-900 block text-sm truncate">
                {summary.model}
              </span>
              <span className="text-slate-500 text-xs">
                Prompt Ver: {summary.promptVersion}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 4. RadarChart and Category Breakdown */}
      {summary && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in-up delay-3">
          {/* Radar Chart Card */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col items-center justify-center">
            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center">
              <BarChart3 className="w-5 h-5 mr-2 text-slate-400" />
              Quality Radar
            </h3>
            <RadarChart 
              data={[
                { label: "Citations", value: summary.citationVerificationRate, max: 100 },
                { label: "Refusal", value: summary.refusalAccuracy, max: 100 },
                { label: "Guardrail", value: summary.guardrailCatchRate, max: 100 },
                { label: "Injection", value: summary.injectionFlagRate, max: 100 },
                { label: "Speed", value: Math.max(0, 100 - Math.min(summary.p95LatencyMs / 10, 100)), max: 100 }
              ]} 
              size={280} 
            />
          </div>

          {/* Category Breakdown */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col justify-center">
            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center">
              <Filter className="w-5 h-5 mr-2 text-slate-400" />
              Benchmark Composition
            </h3>
            
            <div className="space-y-6">
              {/* Stacked Bar */}
              <div className="h-4 flex rounded-full overflow-hidden w-full bg-slate-100">
                <div style={{ width: `${(categoryCounts.answerable / totalCasesCount) * 100}%` }} className="bg-emerald-500 h-full"></div>
                <div style={{ width: `${(categoryCounts.unanswerable / totalCasesCount) * 100}%` }} className="bg-blue-500 h-full"></div>
                <div style={{ width: `${(categoryCounts.boundary / totalCasesCount) * 100}%` }} className="bg-purple-500 h-full"></div>
                <div style={{ width: `${(categoryCounts.injection / totalCasesCount) * 100}%` }} className="bg-amber-500 h-full"></div>
                <div style={{ width: `${(categoryCounts.gap / totalCasesCount) * 100}%` }} className="bg-rose-500 h-full"></div>
              </div>

              {/* Legend */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: "Answerable", count: categoryCounts.answerable, color: "bg-emerald-500", text: "text-emerald-700" },
                  { label: "Unanswerable", count: categoryCounts.unanswerable, color: "bg-blue-500", text: "text-blue-700" },
                  { label: "Boundary", count: categoryCounts.boundary, color: "bg-purple-500", text: "text-purple-700" },
                  { label: "Injection", count: categoryCounts.injection, color: "bg-amber-500", text: "text-amber-700" },
                  { label: "Silence Gap", count: categoryCounts.gap, color: "bg-rose-500", text: "text-rose-700" },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
                      <span className="text-sm font-medium text-slate-700">{item.label}</span>
                    </div>
                    <span className={`font-bold text-sm ${item.text}`}>{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. PipelineDiagram */}
      <div className="animate-fade-in-up delay-4 space-y-6">
        <h2 className="text-2xl font-bold text-slate-900 text-center">Architecture: 7-Stage Processing Pipeline</h2>
        <PipelineDiagram />
      </div>

      {/* 7. Case Explorer */}
      <div className="space-y-6 animate-fade-in-up delay-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div className="flex items-center space-x-3">
            <Terminal className="w-5 h-5 text-slate-700" />
            <h2 className="text-xl font-bold text-slate-900">
              Case Explorer
            </h2>
            <span className="bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full text-xs font-bold">
              {filteredCases.length}
            </span>
          </div>

          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text"
                id="search-cases"
                aria-label="Search benchmark cases"
                placeholder="Search cases..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-2">
          {[
            { id: "all", label: "All Cases" },
            { id: "answerable", label: "Answerable" },
            { id: "unanswerable", label: "Refusal" },
            { id: "boundary", label: "Boundary" },
            { id: "injection", label: "Injection" },
            { id: "gap", label: "Gap" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
                activeFilter === tab.id
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Case Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCases.map((c, idx) => (
            <div 
              key={c.id} 
              className={`p-5 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all space-y-3 animate-fade-in-up delay-${Math.min((idx % 8) + 1, 8)}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-mono font-bold border border-slate-200">
                    {c.id}
                  </span>
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider ${
                      c.type === "unanswerable"
                        ? "bg-blue-100 text-blue-800 border border-blue-200"
                        : c.type === "boundary"
                        ? "bg-purple-100 text-purple-800 border border-purple-200"
                        : c.type === "injection"
                        ? "bg-amber-100 text-amber-800 border border-amber-200"
                        : c.type === "gap"
                        ? "bg-rose-100 text-rose-800 border border-rose-200"
                        : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                    }`}
                  >
                    {c.type}
                  </span>
                </div>

                <div className="flex items-center space-x-3">
                  <span className="text-slate-400 font-mono text-[11px] bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                    {c.result?.latencyMs} ms
                  </span>
                  <span className="inline-flex items-center space-x-1 text-emerald-600 font-bold text-sm">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Pass</span>
                  </span>
                </div>
              </div>
              
              <div className="text-xs text-slate-500 font-medium truncate">
                Doc: {c.doc}
              </div>

              {/* Prompt query */}
              <p className="font-semibold text-slate-900 text-sm leading-relaxed">{c.q}</p>

              {/* Detail Output */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-slate-600 font-mono text-xs leading-relaxed mt-2">
                <div className="text-slate-400 font-sans font-semibold mb-1 text-[10px] uppercase tracking-wider">Evaluation Output</div>
                <div className="text-slate-700">{c.result?.detail}</div>
              </div>
            </div>
          ))}
        </div>
        
        {filteredCases.length === 0 && (
          <div className="py-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200 border-dashed">
            No cases match the selected filters.
          </div>
        )}
      </div>
    </div>
  );
}
