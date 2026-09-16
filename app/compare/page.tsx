"use client";

import { useState } from "react";
import Link from "next/link";
import {
  GitCompare,
  ArrowLeft,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  PlusCircle,
  MinusCircle,
  Scale,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { CompareDelta, CompareResult } from "@/lib/schema";
import { DEMO_DOC_RENT_AGREEMENT, DEMO_DOC_RENT_MODIFIED } from "@/lib/cache";

export default function ComparePage() {
  const [docA, setDocA] = useState<any>(DEMO_DOC_RENT_AGREEMENT);
  const [docB, setDocB] = useState<any>(DEMO_DOC_RENT_MODIFIED);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CompareResult | null>(null);
  const [filterMateriality, setFilterMateriality] = useState<string>("all");

  const runComparison = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ docA, docB }),
      });
      const data: CompareResult = await res.json();
      setResult(data);
    } catch (err) {
      console.error("Comparison failed", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredDeltas = (result?.deltas || []).filter((delta) => {
    if (filterMateriality === "all") return true;
    return delta.materiality === filterMateriality;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <Link
              href="/"
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center space-x-2">
              <GitCompare className="w-6 h-6 text-blue-700" />
              <span>F4 · Semantic Contract Diff</span>
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Reports substantive changes in legal effect and money/exit rights, rather than cosmetic text changes.
          </p>
        </div>

        <button
          onClick={runComparison}
          disabled={loading}
          className="px-4 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
        >
          {loading ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Computing Semantic Deltas...</span>
            </>
          ) : (
            <>
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Analyze Version Differences</span>
            </>
          )}
        </button>
      </div>

      {/* Comparison Setup Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Version A Box */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-700 rounded-full font-mono uppercase">
              Version A (Original)
            </span>
            <span className="text-xs text-slate-400 font-mono">11 Clauses</span>
          </div>
          <h2 className="font-bold text-slate-900 text-sm">{docA?.filename}</h2>
          <p className="text-xs text-slate-500 leading-normal">
            Original landlord lease with 10 months deposit, 6-month lock-in, and 30 days notice period.
          </p>
        </div>

        {/* Version B Box */}
        <div className="p-5 rounded-2xl bg-white border border-blue-200 shadow-xs space-y-2 relative bg-blue-50/20">
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-800 rounded-full font-mono uppercase">
              Version B (Negotiated Draft)
            </span>
            <span className="text-xs text-blue-600 font-mono">Counter-Proposal</span>
          </div>
          <h2 className="font-bold text-slate-900 text-sm">{docB?.filename}</h2>
          <p className="text-xs text-slate-500 leading-normal">
            Revised draft with reduced deposit (3 months), shortened lock-in, and extended notice period (90 days).
          </p>
        </div>
      </div>

      {/* Results Section */}
      {result ? (
        <div className="space-y-6">
          {/* Headline Callout */}
          <div className="p-4 rounded-2xl bg-blue-900 text-white shadow-md flex items-start space-x-3">
            <Sparkles className="w-5 h-5 text-blue-300 flex-shrink-0 mt-0.5" />
            <div>
              <span className="text-[10px] font-bold text-blue-300 uppercase tracking-wider block font-mono">
                Executive Delta Headline
              </span>
              <p className="text-sm font-semibold text-white leading-relaxed">
                {result.headline}
              </p>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Deltas Sorted by Materiality ({filteredDeltas.length})
            </span>
            <div className="flex space-x-1">
              {[
                { id: "all", label: "All Changes" },
                { id: "high", label: "▲ High Materiality" },
                { id: "medium", label: "◆ Medium" },
                { id: "low", label: "● Low" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setFilterMateriality(tab.id)}
                  className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                    filterMateriality === tab.id
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Delta Table */}
          <div className="divide-y divide-slate-200 border border-slate-200 rounded-2xl bg-white shadow-xs overflow-hidden">
            {filteredDeltas.map((delta, i) => (
              <div key={i} className="p-5 space-y-2 hover:bg-slate-50/70 transition-colors">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    {/* Materiality Badge */}
                    <span
                      className={`px-2.5 py-0.5 text-[10px] font-bold rounded flex items-center space-x-1 ${
                        delta.materiality === "high"
                          ? "bg-red-100 text-red-800"
                          : delta.materiality === "medium"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      <span>
                        {delta.materiality === "high" ? "▲" : delta.materiality === "medium" ? "◆" : "●"}
                      </span>
                      <span className="uppercase font-mono">{delta.materiality} Materiality</span>
                    </span>

                    {/* Change Type */}
                    <span className="px-2 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-700 rounded font-mono capitalize">
                      {delta.changeType.replace("_", " ")}
                    </span>
                  </div>

                  {/* Impact On */}
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded capitalize ${
                      delta.impactOn === "you"
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                        : delta.impactOn === "counterparty"
                        ? "bg-purple-100 text-purple-800 border border-purple-200"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    Favours: {delta.impactOn === "you" ? "You (Tenant)" : delta.impactOn}
                  </span>
                </div>

                {/* Concrete Quantified Plain Delta */}
                <p className="text-sm font-semibold text-slate-900 leading-normal">
                  {delta.plainDelta}
                </p>

                {/* Clauses Involved */}
                <div className="text-[11px] text-slate-500 font-mono flex items-center space-x-3 pt-1">
                  {delta.clauseA && <span>Version A Clause: {delta.clauseA}</span>}
                  {delta.clauseA && delta.clauseB && <span>→</span>}
                  {delta.clauseB && <span>Version B Clause: {delta.clauseB}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-8 space-y-3">
          <GitCompare className="w-12 h-12 text-slate-300 mx-auto" />
          <h2 className="font-bold text-slate-800 text-base">Ready to Compare Drafts</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Click &quot;Analyze Version Differences&quot; above to calculate the semantic contract diff between the original lease and the negotiated counter-draft.
          </p>
        </div>
      )}
    </div>
  );
}
