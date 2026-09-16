"use client";

import { useEffect, useState, useRef, use } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Scale,
  MessageSquare,
  Sparkles,
  BookOpen,
  Send,
  Download,
  Copy,
  Check,
  Filter,
  Eye,
  ShieldCheck,
  ShieldAlert,
  ArrowLeft,
  Search,
  ExternalLink,
  ChevronRight,
  Languages,
  BookMarked,
  Info,
  FileText,
} from "lucide-react";
import Link from "next/link";
import {
  Clause,
  RiskFinding,
  GroundedAnswer,
  StatuteCheckResult,
  ActionPackResult,
  DocumentAnalysisState,
} from "@/lib/schema";
import {
  DEMO_DOC_RENT_AGREEMENT,
  DEMO_DOC_EMPLOYMENT,
  DEMO_DOC_INJECTION_TEST,
} from "@/lib/cache";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function AnalyzePage({ params }: PageProps) {
  const resolvedParams = use(params);
  const docId = resolvedParams.id;

  const [docState, setDocState] = useState<DocumentAnalysisState | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedClauseId, setSelectedClauseId] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [readingLevel, setReadingLevel] = useState<"standard" | "simple">("standard");

  // Q&A State
  const [qaOpen, setQaOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [chatHistory, setChatHistory] = useState<
    Array<{ role: "user" | "assistant"; text: string; citations?: any[]; statuteRefs?: any[]; guardrailTriggered?: boolean; originalDraft?: string; answerFound?: boolean }>
  >([]);
  const [qaLoading, setQaLoading] = useState(false);

  // Statute Check Modal State
  const [statuteModalOpen, setStatuteModalOpen] = useState(false);
  const [selectedClauseForStatute, setSelectedClauseForStatute] = useState<Clause | null>(null);
  const [statuteResult, setStatuteResult] = useState<StatuteCheckResult | null>(null);
  const [statuteLoading, setStatuteLoading] = useState(false);

  // Action Pack Modal State
  const [actionPackOpen, setActionPackOpen] = useState(false);
  const [actionPackLanguage, setActionPackLanguage] = useState<"en" | "hi" | "gu">("en");
  const [actionPackResult, setActionPackResult] = useState<ActionPackResult | null>(null);
  const [actionPackLoading, setActionPackLoading] = useState(false);
  const [actionPackTab, setActionPackTab] = useState<"summary" | "checklist" | "lawyer" | "email">("summary");
  const [copiedEmail, setCopiedEmail] = useState(false);

  // Guardrail Inspector State
  const [guardrailBannerOpen, setGuardrailBannerOpen] = useState(false);

  const leftPaneRef = useRef<HTMLDivElement>(null);
  const rightPaneRef = useRef<HTMLDivElement>(null);

  // Load document and trigger analysis
  useEffect(() => {
    async function loadDoc() {
      setLoading(true);

      // Check pre-cached demo agreements first
      if (docId === "demo-rent-bangalore") {
        setDocState(DEMO_DOC_RENT_AGREEMENT);
        setSelectedClauseId(DEMO_DOC_RENT_AGREEMENT.clauses[0]?.id || null);
        setLoading(false);
        return;
      }
      if (docId === "demo-employment-tech") {
        setDocState(DEMO_DOC_EMPLOYMENT);
        setSelectedClauseId(DEMO_DOC_EMPLOYMENT.clauses[0]?.id || null);
        setLoading(false);
        return;
      }
      if (docId === "demo-injection-test") {
        setDocState(DEMO_DOC_INJECTION_TEST);
        setSelectedClauseId(DEMO_DOC_INJECTION_TEST.clauses[0]?.id || null);
        setLoading(false);
        return;
      }

      // Otherwise fetch from server cache or initiate analysis
      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ documentId: docId }),
        });
        const data = await res.json();
        if (data.findings) {
          // Document was already loaded in memory
          setDocState((prev) => (prev ? { ...prev, findings: data.findings } : null));
        }
      } catch (err) {
        console.warn("Could not fetch document", err);
      } finally {
        setLoading(false);
      }
    }

    loadDoc();
  }, [docId]);

  // Synchronized scrolling to clause
  const scrollToClause = (clauseId: string) => {
    setSelectedClauseId(clauseId);
    const leftEl = document.getElementById(`doc-clause-${clauseId}`);
    if (leftEl) {
      leftEl.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    const rightEl = document.getElementById(`finding-card-${clauseId}`);
    if (rightEl) {
      rightEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  };

  // Perform Statute Check on a clause
  const handleStatuteCheck = async (clause: Clause) => {
    setSelectedClauseForStatute(clause);
    setStatuteModalOpen(true);
    setStatuteLoading(true);
    setStatuteResult(null);

    try {
      const res = await fetch("/api/statute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clauseText: clause.text,
          heading: clause.heading,
        }),
      });
      const data = await res.json();
      setStatuteResult(data);
    } catch (err) {
      console.error("Statute check failed", err);
    } finally {
      setStatuteLoading(false);
    }
  };

  // Handle Grounded Q&A submit
  const handleAskQuestion = async (customQuestion?: string) => {
    const q = customQuestion || question;
    if (!q.trim()) return;

    const userMessage = q;
    setQuestion("");
    setChatHistory((prev) => [...prev, { role: "user", text: userMessage }]);
    setQaLoading(true);

    try {
      const historyStr = chatHistory
        .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.text}`)
        .join("\n");

      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: docId,
          clauses: docState?.clauses || [],
          question: userMessage,
          history: historyStr,
        }),
      });

      const data: GroundedAnswer = await res.json();
      setChatHistory((prev) => [
        ...prev,
        {
          role: "assistant",
          text: data.answer,
          citations: data.citations,
          statuteRefs: data.statuteRefs,
          guardrailTriggered: data.guardrailTriggered,
          originalDraft: data.originalDraft,
          answerFound: data.answerFound,
        },
      ]);
    } catch (err) {
      setChatHistory((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "An error occurred while answering your question. Please try again.",
        },
      ]);
    } finally {
      setQaLoading(false);
    }
  };

  // Generate Action Pack
  const handleGenerateActionPack = async (lang: "en" | "hi" | "gu" = actionPackLanguage) => {
    setActionPackLanguage(lang);
    setActionPackOpen(true);
    setActionPackLoading(true);

    try {
      const res = await fetch("/api/actionpack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          findings: docState?.findings || [],
          userRole: docState?.userRole || "Tenant",
          language: lang,
        }),
      });
      const data = await res.json();
      setActionPackResult(data);
    } catch (err) {
      console.error("Action pack generation failed", err);
    } finally {
      setActionPackLoading(false);
    }
  };

  const copyEmailToClipboard = () => {
    if (actionPackResult?.email?.body) {
      navigator.clipboard.writeText(
        `Subject: ${actionPackResult.email.subject}\n\n${actionPackResult.email.body}`
      );
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-semibold text-slate-700">Loading document analysis state...</p>
      </div>
    );
  }

  if (!docState) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center space-y-4">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <h2 className="text-lg font-bold text-slate-800">Document Not Found</h2>
        <p className="text-sm text-slate-600">The requested document session has expired or does not exist.</p>
        <Link href="/" className="px-4 py-2 bg-blue-700 text-white rounded-lg text-sm font-semibold">
          Back to Home
        </Link>
      </div>
    );
  }

  const findingsMap = new Map<string, RiskFinding>();
  (docState.findings || []).forEach((f) => findingsMap.set(f.clauseId, f));

  // Filter clauses based on severity and search query
  const filteredClauses = docState.clauses.filter((clause) => {
    const finding = findingsMap.get(clause.id);
    const severity = finding ? finding.severity : "standard";

    if (severityFilter !== "all" && severity !== severityFilter) {
      return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchText = clause.text.toLowerCase().includes(q);
      const matchHeading = clause.heading.toLowerCase().includes(q);
      const matchMeaning = finding ? finding.plainMeaning.toLowerCase().includes(q) : false;
      return matchText || matchHeading || matchMeaning;
    }

    return true;
  });

  const highRiskCount = (docState.findings || []).filter((f) => f.severity === "high").length;
  const negotiateCount = (docState.findings || []).filter((f) => f.severity === "negotiate").length;
  const standardCount = (docState.findings || []).filter((f) => f.severity === "standard").length;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-slate-100">
      {/* Top Action & Metadata Toolbar */}
      <div className="bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between shadow-sm z-20">
        <div className="flex items-center space-x-3">
          <Link
            href="/"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            title="Back to Home"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-slate-900 text-sm">{docState.filename}</span>
              <span className="px-2 py-0.5 text-[10px] font-mono bg-slate-100 text-slate-700 rounded border border-slate-200">
                {docState.docType}
              </span>
              {docState.piiRedacted && (
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 rounded border border-emerald-200">
                  PII Redacted
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500">
              Role: <span className="font-semibold text-slate-700">{docState.userRole}</span> · {docState.clauses.length} discrete clauses indexed
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Reading Level Toggle (A11y Class 8 simple translation) */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
            <button
              onClick={() => setReadingLevel("standard")}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                readingLevel === "standard"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Standard
            </button>
            <button
              onClick={() => setReadingLevel("simple")}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                readingLevel === "simple"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              title="Class 8 Simple Language mode for public access"
            >
              Simple (Class 8)
            </button>
          </div>

          {/* Action Pack Button */}
          <button
            onClick={() => handleGenerateActionPack("en")}
            className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center space-x-1.5 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Action Pack</span>
          </button>

          {/* Q&A Drawer Toggle */}
          <button
            onClick={() => setQaOpen(!qaOpen)}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center space-x-1.5 transition-colors relative"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Grounded Q&A</span>
            {chatHistory.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 absolute -top-1 -right-1"></span>
            )}
          </button>
        </div>
      </div>

      {/* Hero Split View: Left Document Pane & Right Risk Radar Pane */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT PANE: Synchronized Document View with Colored Highlight Overlay */}
        <div
          ref={leftPaneRef}
          className="w-1/2 border-r border-slate-200 bg-white overflow-y-auto p-6 space-y-6 relative"
        >
          <div className="sticky top-0 bg-white/95 backdrop-blur pb-3 border-b border-slate-200 flex items-center justify-between z-10">
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Original Legal Document
              </span>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">
              Click clause to focus risk finding
            </span>
          </div>

          {/* Document Content with Highlight Overlays */}
          <div className="font-serif text-slate-800 space-y-4 text-sm leading-relaxed">
            {docState.clauses.map((clause, idx) => {
              const finding = findingsMap.get(clause.id);
              const severity = finding ? finding.severity : "standard";
              const isSelected = selectedClauseId === clause.id;

              let highlightClass = "border-l-4 border-slate-200 hover:bg-slate-50";
              if (severity === "high") highlightClass = "highlight-high";
              if (severity === "negotiate") highlightClass = "highlight-negotiate";
              if (severity === "standard") highlightClass = "highlight-standard";

              return (
                <div
                  key={clause.id}
                  id={`doc-clause-${clause.id}`}
                  onClick={() => scrollToClause(clause.id)}
                  className={`p-4 rounded-r-xl transition-all cursor-pointer ${highlightClass} ${
                    isSelected ? "highlight-selected bg-blue-50/70" : ""
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5 font-sans">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-slate-800">
                        {clause.number ? `Clause ${clause.number}.` : ""} {clause.heading}
                      </span>
                      {/* WCAG Shape + Text Badges */}
                      {severity === "high" && (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 text-[10px] font-bold bg-red-100 text-red-800 rounded">
                          <span>▲</span>
                          <span>High Risk</span>
                        </span>
                      )}
                      {severity === "negotiate" && (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 rounded">
                          <span>◆</span>
                          <span>Negotiate</span>
                        </span>
                      )}
                      {severity === "standard" && (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded">
                          <span>●</span>
                          <span>Standard</span>
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Line {clause.startLine || idx * 3 + 1}
                    </span>
                  </div>

                  {/* Render Standard Legal vs Simple Class 8 translation */}
                  <p className="text-slate-800 text-xs sm:text-sm">
                    {readingLevel === "simple" && clause.simpleText
                      ? clause.simpleText
                      : clause.text}
                  </p>

                  {/* Substring Quoted Span indicator */}
                  {finding?.quotedSpan && (
                    <div className="mt-2 text-[11px] font-sans font-medium text-slate-600 bg-white/80 p-1.5 rounded border border-slate-200/80 flex items-center space-x-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                      <span className="truncate">
                        Flagged Quote: &ldquo;{finding.quotedSpan}&rdquo;
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT PANE: Risk Radar List */}
        <div
          ref={rightPaneRef}
          className="w-1/2 bg-slate-50 overflow-y-auto p-6 space-y-4"
        >
          {/* Risk Summary Stats & Filter Controls */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-3 sticky top-0 z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  F1 · Risk Radar Findings
                </span>
                <span className="text-xs text-slate-400">({filteredClauses.length} displayed)</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 text-[11px] font-bold bg-red-50 text-red-700 rounded border border-red-200">
                  <span>▲</span>
                  <span>{highRiskCount} High</span>
                </span>
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 text-[11px] font-bold bg-amber-50 text-amber-700 rounded border border-amber-200">
                  <span>◆</span>
                  <span>{negotiateCount} Negotiate</span>
                </span>
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 text-[11px] font-bold bg-emerald-50 text-emerald-700 rounded border border-emerald-200">
                  <span>●</span>
                  <span>{standardCount} Standard</span>
                </span>
              </div>
            </div>

            {/* Severity Filter Tabs & Search */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-1 border-t border-slate-100">
              <div className="flex space-x-1">
                {[
                  { id: "all", label: "All" },
                  { id: "high", label: "▲ High" },
                  { id: "negotiate", label: "◆ Negotiate" },
                  { id: "standard", label: "● Standard" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setSeverityFilter(tab.id)}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                      severityFilter === tab.id
                        ? "bg-slate-900 text-white"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                <input
                  type="text"
                  placeholder="Filter clauses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-blue-500 w-full sm:w-44"
                />
              </div>
            </div>
          </div>

          {/* Finding Cards */}
          <div className="space-y-3">
            {filteredClauses.map((clause) => {
              const finding = findingsMap.get(clause.id);
              const severity = finding ? finding.severity : "standard";
              const isSelected = selectedClauseId === clause.id;

              return (
                <div
                  key={clause.id}
                  id={`finding-card-${clause.id}`}
                  onClick={() => scrollToClause(clause.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer bg-white ${
                    isSelected
                      ? "border-blue-500 ring-2 ring-blue-500/20 shadow-md"
                      : "border-slate-200 hover:border-slate-300 shadow-xs"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {/* Shape Badges for WCAG Accessibility */}
                      {severity === "high" && (
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-red-100 text-red-800 rounded flex items-center space-x-1">
                          <span>▲</span>
                          <span>High Risk</span>
                        </span>
                      )}
                      {severity === "negotiate" && (
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 rounded flex items-center space-x-1">
                          <span>◆</span>
                          <span>Negotiate</span>
                        </span>
                      )}
                      {severity === "standard" && (
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded flex items-center space-x-1">
                          <span>●</span>
                          <span>Standard</span>
                        </span>
                      )}
                      <span className="text-xs font-bold text-slate-800">
                        {clause.number ? `Clause ${clause.number}:` : ""} {clause.heading}
                      </span>
                    </div>

                    {/* Favours Badge */}
                    {finding && (
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-semibold capitalize ${
                          finding.favours === "counterparty"
                            ? "bg-purple-50 text-purple-700 border border-purple-200"
                            : finding.favours === "you"
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        Favours: {finding.favours}
                      </span>
                    )}
                  </div>

                  {/* Plain Language Meaning */}
                  <div className="space-y-1.5 text-xs">
                    <p className="text-slate-900 font-medium leading-relaxed">
                      {finding?.plainMeaning || clause.simpleText || clause.text}
                    </p>

                    {finding?.whyItMatters && (
                      <p className="text-slate-500 leading-normal text-[11px]">
                        <span className="font-semibold text-slate-700">Why it matters: </span>
                        {finding.whyItMatters}
                      </p>
                    )}
                  </div>

                  {/* Verified Quoted Span */}
                  {finding?.quotedSpan && (
                    <div className="mt-2.5 p-2 bg-slate-50 rounded border border-slate-200 text-[11px] font-mono text-slate-700">
                      <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block font-sans">
                        ✓ Exact Quoted Span Verified:
                      </span>
                      &ldquo;{finding.quotedSpan}&rdquo;
                    </div>
                  )}

                  {/* Statute Hint & Check Button */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div className="text-[11px] text-slate-500 truncate max-w-xs">
                      {finding?.statuteHint ? (
                        <span className="text-amber-700 font-medium">
                          Ref: {finding.statuteHint}
                        </span>
                      ) : (
                        <span>Standard Indian contract language</span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStatuteCheck(clause);
                      }}
                      className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded font-semibold text-[11px] border border-amber-200 transition-colors flex items-center space-x-1"
                    >
                      <Scale className="w-3 h-3 text-amber-700" />
                      <span>Check Indian Law</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* STATUTE GROUNDING MODAL (F3) */}
      {statuteModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-700">
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    F3 · Indian Statute Grounding Verdict
                  </h3>
                  <p className="text-xs text-slate-500">
                    Checked against Indian Contract Act 1872, Model Tenancy Act 2021, CPA 2019 & DPDP Act 2023
                  </p>
                </div>
              </div>
              <button
                onClick={() => setStatuteModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            {selectedClauseForStatute && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-serif text-slate-800">
                <span className="font-bold text-slate-900 font-sans block mb-1">
                  Target Clause: {selectedClauseForStatute.heading}
                </span>
                &ldquo;{selectedClauseForStatute.text}&rdquo;
              </div>
            )}

            {statuteLoading ? (
              <div className="py-8 text-center space-y-2">
                <div className="w-6 h-6 border-2 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-xs font-semibold text-slate-600">Retrieving Indian statutes & analyzing statutory distance...</p>
              </div>
            ) : statuteResult ? (
              <div className="space-y-4 text-xs">
                {/* Verdict Badge */}
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-slate-700">Statutory Verdict:</span>
                  <span
                    className={`px-2.5 py-1 rounded-md font-bold uppercase text-[11px] ${
                      statuteResult.verdict === "review_recommended"
                        ? "bg-red-100 text-red-800 border border-red-200"
                        : statuteResult.verdict === "unusual"
                        ? "bg-amber-100 text-amber-800 border border-amber-200"
                        : statuteResult.verdict === "typical"
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {statuteResult.verdict.replace("_", " ")}
                  </span>
                </div>

                {/* Explanation */}
                <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-100 space-y-1">
                  <span className="font-bold text-blue-900 text-xs block">Explanation:</span>
                  <p className="text-slate-800 leading-relaxed text-xs">
                    {statuteResult.explanation}
                  </p>
                </div>

                {/* Statutory Citations */}
                {statuteResult.citations && statuteResult.citations.length > 0 && (
                  <div className="space-y-2">
                    <span className="font-bold text-slate-800 text-xs block">
                      Retrieved Statutory Passages:
                    </span>
                    {statuteResult.citations.map((c, i) => (
                      <div key={i} className="p-3 rounded-lg bg-amber-50/50 border border-amber-200/80 space-y-1">
                        <div className="flex items-center justify-between font-semibold text-amber-900">
                          <span>{c.act}</span>
                          <span className="font-mono text-[11px]">{c.section}</span>
                        </div>
                        <p className="text-slate-700 text-xs italic">&ldquo;{c.gist}&rdquo;</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* What to ask your lawyer */}
                {statuteResult.whatToAsk && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <span className="font-bold text-slate-900 text-xs block">
                      Questions to Discuss With Your Lawyer:
                    </span>
                    <p className="text-slate-700 leading-normal">{statuteResult.whatToAsk}</p>
                  </div>
                )}

                <p className="text-[11px] text-slate-500 italic pt-2 border-t border-slate-100">
                  Statutes change and apply differently to different facts. A lawyer can confirm how this applies to you.
                </p>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* GROUNDED Q&A DRAWER (F2) */}
      {qaOpen && (
        <div className="fixed bottom-0 right-0 w-full sm:w-[480px] h-[580px] max-h-[80vh] bg-white border-l border-t border-slate-300 shadow-2xl z-40 rounded-tl-2xl flex flex-col">
          {/* Drawer Header */}
          <div className="p-3.5 bg-slate-900 text-white rounded-tl-2xl flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MessageSquare className="w-4 h-4 text-emerald-400" />
              <span className="font-bold text-sm">Grounded Q&A (Verified Citations)</span>
            </div>
            <button
              onClick={() => setQaOpen(false)}
              className="text-slate-400 hover:text-white text-xs font-bold px-2 py-1"
            >
              ✕
            </button>
          </div>

          {/* Quick Questions Chips */}
          <div className="p-2.5 bg-slate-50 border-b border-slate-200 flex space-x-1.5 overflow-x-auto text-[11px]">
            <button
              onClick={() => handleAskQuestion("Agar main 4 mahine me flat chhod du to kya hoga?")}
              className="px-2.5 py-1 bg-white border border-slate-200 rounded-full hover:border-blue-500 hover:text-blue-700 whitespace-nowrap"
            >
              4 mahine me chhod du?
            </button>
            <button
              onClick={() => handleAskQuestion("Is there a pet policy in this contract?")}
              className="px-2.5 py-1 bg-white border border-slate-200 rounded-full hover:border-blue-500 hover:text-blue-700 whitespace-nowrap"
              title="Tests refusal logic on unaddressed subjects"
            >
              Pet Policy? (Out of Scope Test)
            </button>
            <button
              onClick={() => handleAskQuestion("Should I sue my landlord?")}
              className="px-2.5 py-1 bg-white border border-slate-200 rounded-full hover:border-red-500 hover:text-red-700 whitespace-nowrap"
              title="Tests Lever 1 Guardrail Rewrite"
            >
              Should I sue? (Guardrail Test)
            </button>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
            {chatHistory.length === 0 ? (
              <div className="text-center py-10 text-slate-500 space-y-2">
                <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="font-semibold">Ask any question about this document.</p>
                <p className="text-[11px] max-w-xs mx-auto">
                  Every answer requires exact clause citations. If the contract doesn&apos;t mention it, the AI refuses rather than hallucinating.
                </p>
              </div>
            ) : (
              chatHistory.map((msg, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-xl leading-relaxed ${
                    msg.role === "user"
                      ? "bg-blue-700 text-white ml-6"
                      : "bg-slate-100 text-slate-900 mr-4 border border-slate-200"
                  }`}
                >
                  <p>{msg.text}</p>

                  {/* Guardrail rewrite indicator */}
                  {msg.guardrailTriggered && (
                    <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-900 flex items-start space-x-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-700 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block">Lever 1 Legal Boundary Guardrail Triggered</span>
                        <span>
                          Direct legal advice or lawsuit recommendation was filtered and rewritten into permitted informational analysis.
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Clickable Clause Citation Chips */}
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex flex-wrap gap-1.5">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block w-full">
                        Verified Citations (Click to jump):
                      </span>
                      {msg.citations.map((c, ci) => (
                        <button
                          key={ci}
                          onClick={() => scrollToClause(c.clauseId)}
                          className="px-2 py-0.5 bg-white border border-blue-300 text-blue-700 rounded text-[10px] font-semibold hover:bg-blue-50 flex items-center space-x-1 shadow-2xs"
                        >
                          <span>Clause {c.clauseId}</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Grounded Statute References */}
                  {msg.statuteRefs && msg.statuteRefs.length > 0 && (
                    <div className="mt-1.5 text-[10px] text-amber-800 font-mono">
                      Statute ground: {msg.statuteRefs.map((s) => `${s.act} (${s.section})`).join(", ")}
                    </div>
                  )}
                </div>
              ))
            )}
            {qaLoading && (
              <div className="p-3 bg-slate-100 rounded-xl mr-4 text-slate-600 flex items-center space-x-2">
                <div className="w-3.5 h-3.5 border-2 border-blue-700 border-t-transparent rounded-full animate-spin"></div>
                <span>Grounding against clauses and Indian statutes...</span>
              </div>
            )}
          </div>

          {/* Question Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAskQuestion();
            }}
            className="p-3 border-t border-slate-200 bg-white flex space-x-2"
          >
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask a question (English, हिन्दी, or ગુજરાતી)..."
              className="flex-1 text-xs px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={qaLoading || !question.trim()}
              className="px-3 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}

      {/* ACTION PACK MODAL (F5) */}
      {actionPackOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden border border-slate-200 shadow-2xl flex flex-col">
            {/* Modal Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-blue-400" />
                <div>
                  <h3 className="font-bold text-sm">F5 · Action Pack</h3>
                  <p className="text-xs text-slate-400">1-Click 4-Output Package for Non-Lawyers</p>
                </div>
              </div>

              {/* Language Selector: EN / HI / GU */}
              <div className="flex items-center space-x-2">
                <Languages className="w-4 h-4 text-slate-400" />
                <div className="flex bg-slate-800 rounded-lg p-0.5 text-xs font-semibold">
                  <button
                    onClick={() => handleGenerateActionPack("en")}
                    className={`px-2.5 py-1 rounded-md transition-colors ${
                      actionPackLanguage === "en" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    English
                  </button>
                  <button
                    onClick={() => handleGenerateActionPack("hi")}
                    className={`px-2.5 py-1 rounded-md transition-colors ${
                      actionPackLanguage === "hi" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    हिन्दी
                  </button>
                  <button
                    onClick={() => handleGenerateActionPack("gu")}
                    className={`px-2.5 py-1 rounded-md transition-colors ${
                      actionPackLanguage === "gu" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    ગુજરાતી
                  </button>
                </div>
                <button
                  onClick={() => setActionPackOpen(false)}
                  className="text-slate-400 hover:text-white text-sm font-bold ml-2 p-1"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-slate-200 bg-slate-50 px-4 text-xs font-semibold">
              <button
                onClick={() => setActionPackTab("summary")}
                className={`py-3 px-3 border-b-2 transition-colors ${
                  actionPackTab === "summary"
                    ? "border-blue-600 text-blue-700 bg-white"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                1. 6-Sentence Summary
              </button>
              <button
                onClick={() => setActionPackTab("checklist")}
                className={`py-3 px-3 border-b-2 transition-colors ${
                  actionPackTab === "checklist"
                    ? "border-blue-600 text-blue-700 bg-white"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                2. Obligations Checklist
              </button>
              <button
                onClick={() => setActionPackTab("lawyer")}
                className={`py-3 px-3 border-b-2 transition-colors ${
                  actionPackTab === "lawyer"
                    ? "border-blue-600 text-blue-700 bg-white"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                3. Questions For Lawyer
              </button>
              <button
                onClick={() => setActionPackTab("email")}
                className={`py-3 px-3 border-b-2 transition-colors ${
                  actionPackTab === "email"
                    ? "border-blue-600 text-blue-700 bg-white"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                4. Negotiation Email Draft
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 text-xs">
              {actionPackLoading ? (
                <div className="py-12 text-center space-y-2">
                  <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="font-semibold text-slate-700">
                    Generating practical action pack in {actionPackLanguage.toUpperCase()}...
                  </p>
                </div>
              ) : actionPackResult ? (
                <div>
                  {/* TAB 1: SUMMARY */}
                  {actionPackTab === "summary" && (
                    <div className="space-y-4">
                      <h4 className="font-bold text-slate-900 text-sm">Plain-Language Summary</h4>
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 leading-relaxed text-slate-800 text-sm">
                        {actionPackResult.summary}
                      </div>
                    </div>
                  )}

                  {/* TAB 2: OBLIGATIONS CHECKLIST */}
                  {actionPackTab === "checklist" && (
                    <div className="space-y-3">
                      <h4 className="font-bold text-slate-900 text-sm">
                        Obligations Checklist (Your Role: {docState.userRole})
                      </h4>
                      <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                        {actionPackResult.checklist.map((item, i) => (
                          <div key={i} className="p-3.5 flex items-start justify-between hover:bg-slate-50">
                            <div className="space-y-1 pr-4">
                              <span className="font-semibold text-slate-900 block">{item.task}</span>
                              <span className="text-slate-500 font-mono text-[11px] block">
                                Due: {item.due}
                              </span>
                            </div>
                            <button
                              onClick={() => {
                                setActionPackOpen(false);
                                scrollToClause(item.clauseId);
                              }}
                              className="px-2 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 rounded text-[10px] font-semibold whitespace-nowrap border border-slate-200"
                            >
                              Clause {item.clauseId} →
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* TAB 3: QUESTIONS FOR LAWYER */}
                  {actionPackTab === "lawyer" && (
                    <div className="space-y-3">
                      <h4 className="font-bold text-slate-900 text-sm">
                        Questions for Your Lawyer (Ranked by Risk/Savings)
                      </h4>
                      <div className="space-y-2.5">
                        {actionPackResult.lawyerQuestions.map((q, i) => (
                          <div key={i} className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1.5 shadow-2xs">
                            <div className="flex items-start justify-between">
                              <span className="font-bold text-slate-900 text-xs">
                                #{i + 1}. {q.q}
                              </span>
                              <button
                                onClick={() => {
                                  setActionPackOpen(false);
                                  scrollToClause(q.clauseId);
                                }}
                                className="text-[10px] text-blue-700 font-semibold hover:underline ml-2"
                              >
                                Clause {q.clauseId}
                              </button>
                            </div>
                            <p className="text-slate-500 text-[11px]">
                              <span className="font-semibold text-slate-700">Rationale: </span>
                              {q.why}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* TAB 4: NEGOTIATION EMAIL */}
                  {actionPackTab === "email" && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-slate-900 text-sm">
                          Calm Negotiation Email Draft
                        </h4>
                        <button
                          onClick={copyEmailToClipboard}
                          className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-semibold text-xs flex items-center space-x-1.5 transition-colors shadow-2xs"
                        >
                          {copiedEmail ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-300" />
                              <span>Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy Email</span>
                            </>
                          )}
                        </button>
                      </div>

                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 font-mono text-xs">
                        <div className="border-b border-slate-200 pb-2">
                          <span className="text-slate-400 font-sans font-semibold">Subject: </span>
                          <span className="text-slate-800 font-bold">{actionPackResult.email.subject}</span>
                        </div>
                        <div className="whitespace-pre-wrap text-slate-800 leading-relaxed font-sans pt-1">
                          {actionPackResult.email.body}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
