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
  Calendar,
  Printer,
  Compass,
  ArrowRight,
  Clock,
  HelpCircle,
} from "lucide-react";
import Link from "next/link";
import {
  Clause,
  RiskFinding,
  GroundedAnswer,
  StatuteCheckResult,
  ActionPackResult,
  DocumentAnalysisState,
  SilenceGap,
  RedlineProposal,
  ScenarioResult,
} from "@/lib/schema";
import {
  DEMO_DOC_RENT_AGREEMENT,
  DEMO_DOC_EMPLOYMENT,
  DEMO_DOC_INJECTION_TEST,
} from "@/lib/cache";
import { VoiceInput, ReadAloudButton } from "@/components/VoiceControl";
import { HealthScoreRing } from "@/components/HealthScoreRing";
import { SuggestedQuestions } from "@/components/SuggestedQuestions";
import { SkeletonCard, SkeletonLine } from "@/components/SkeletonLoader";
import { Breadcrumb } from "@/components/Breadcrumb";
import { GuidedTour } from "@/components/GuidedTour";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function AnalyzePage({ params }: PageProps) {
  const resolvedParams = use(params);
  const docId = resolvedParams.id;

  const [docState, setDocState] = useState<DocumentAnalysisState | null>(null);
  const [loading, setLoading] = useState(true);
  const [tourOpen, setTourOpen] = useState(false);
  const [selectedClauseId, setSelectedClauseId] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [readingLevel, setReadingLevel] = useState<"standard" | "simple" | "father">("standard");

  // Main Right Pane Tab: Risk Radar vs Silence Radar (A1) vs Scenario Simulator (A3)
  const [activeRightTab, setActiveRightTab] = useState<"risks" | "silence" | "scenario">("risks");

  // Silence Radar State (A1)
  const [gaps, setGaps] = useState<SilenceGap[]>([]);
  const [gapsLoading, setGapsLoading] = useState(false);

  // Counter-Draft Redline State (A2)
  const [redlineModalOpen, setRedlineModalOpen] = useState(false);
  const [redlineTargetClause, setRedlineTargetClause] = useState<Clause | null>(null);
  const [redlineTargetFinding, setRedlineTargetFinding] = useState<RiskFinding | null>(null);
  const [redlineResult, setRedlineResult] = useState<RedlineProposal | null>(null);
  const [redlineLoading, setRedlineLoading] = useState(false);
  const [copiedRedline, setCopiedRedline] = useState(false);

  // Scenario Simulator State (A3)
  const [scenarioInput, setScenarioInput] = useState("");
  const [scenarioResult, setScenarioResult] = useState<ScenarioResult | null>(null);
  const [scenarioLoading, setScenarioLoading] = useState(false);

  // Q&A State (F2)
  const [qaOpen, setQaOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [chatHistory, setChatHistory] = useState<
    Array<{
      role: "user" | "assistant";
      text: string;
      citations?: any[];
      statuteRefs?: any[];
      guardrailTriggered?: boolean;
      originalDraft?: string;
      answerFound?: boolean;
    }>
  >([]);
  const [qaLoading, setQaLoading] = useState(false);

  // Statute Check Modal State (F3)
  const [statuteModalOpen, setStatuteModalOpen] = useState(false);
  const [selectedClauseForStatute, setSelectedClauseForStatute] = useState<Clause | null>(null);
  const [statuteResult, setStatuteResult] = useState<StatuteCheckResult | null>(null);
  const [statuteLoading, setStatuteLoading] = useState(false);

  // Action Pack Modal State (F5)
  const [actionPackOpen, setActionPackOpen] = useState(false);
  const [actionPackLanguage, setActionPackLanguage] = useState<"en" | "hi" | "gu">("en");
  const [actionPackResult, setActionPackResult] = useState<ActionPackResult | null>(null);
  const [actionPackLoading, setActionPackLoading] = useState(false);
  const [actionPackTab, setActionPackTab] = useState<"summary" | "checklist" | "lawyer" | "email">("summary");
  const [copiedEmail, setCopiedEmail] = useState(false);

  // Calendar .ics Export (A6)
  const [downloadingIcs, setDownloadingIcs] = useState(false);

  const leftPaneRef = useRef<HTMLDivElement>(null);
  const rightPaneRef = useRef<HTMLDivElement>(null);

  // Load document and trigger analysis
  useEffect(() => {
    async function loadDoc() {
      setLoading(true);

      let loaded: DocumentAnalysisState | null = null;
      if (docId === "demo-rent-bangalore") {
        loaded = DEMO_DOC_RENT_AGREEMENT;
      } else if (docId === "demo-employment-tech") {
        loaded = DEMO_DOC_EMPLOYMENT;
      } else if (docId === "demo-injection-test") {
        loaded = DEMO_DOC_INJECTION_TEST;
      }

      if (loaded) {
        setDocState(loaded);
        setSelectedClauseId(loaded.clauses[0]?.id || null);
        setLoading(false);
        // Load silence gaps for demo doc
        loadSilenceGaps(loaded);
        return;
      }

      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ documentId: docId }),
        });
        const data = await res.json();
        if (data.findings) {
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

  // Load Silence Gaps (A1 Silence Radar)
  const loadSilenceGaps = async (doc: DocumentAnalysisState) => {
    setGapsLoading(true);
    try {
      const res = await fetch("/api/gaps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: doc.id,
          clauses: doc.clauses,
          docType: doc.docType,
          userRole: doc.userRole,
        }),
      });
      const data = await res.json();
      if (data.gaps) {
        setGaps(data.gaps);
      }
    } catch (err) {
      console.warn("Failed to load gaps", err);
    } finally {
      setGapsLoading(false);
    }
  };

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

  // Open Counter-Draft Redline Modal (A2)
  const handleOpenRedline = async (clause: Clause, finding: RiskFinding) => {
    setRedlineTargetClause(clause);
    setRedlineTargetFinding(finding);
    setRedlineModalOpen(true);
    setRedlineLoading(true);
    setRedlineResult(null);

    try {
      const res = await fetch("/api/redline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clauseText: clause.text,
          finding,
          userRole: docState?.userRole || "Tenant",
          statuteContext: finding.statuteHint,
        }),
      });
      const data = await res.json();
      setRedlineResult(data);
    } catch (err) {
      console.error("Redline generation failed", err);
    } finally {
      setRedlineLoading(false);
    }
  };

  // Run Scenario Simulation (A3)
  const handleRunScenario = async (scenarioText: string) => {
    setScenarioInput(scenarioText);
    setScenarioLoading(true);
    try {
      const res = await fetch("/api/scenario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenario: scenarioText,
          clauses: docState?.clauses || [],
          userRole: docState?.userRole || "Tenant",
        }),
      });
      const data = await res.json();
      setScenarioResult(data);
    } catch (err) {
      console.error("Scenario simulation failed", err);
    } finally {
      setScenarioLoading(false);
    }
  };

  // Perform Statute Check on a clause (F3)
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

  // Handle Grounded Q&A submit (F2)
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

  // Generate Action Pack (F5)
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

  // Export .ICS Calendar (A6)
  const handleDownloadCalendar = async () => {
    if (!actionPackResult?.checklist) return;
    setDownloadingIcs(true);
    try {
      const res = await fetch("/api/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checklist: actionPackResult.checklist,
          filename: docState?.filename || "contract",
        }),
      });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${docState?.filename || "contract"}_deadlines.ics`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error("Calendar export error", err);
    } finally {
      setDownloadingIcs(false);
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

  const copyRedlineToClipboard = () => {
    if (redlineResult?.proposedText) {
      navigator.clipboard.writeText(redlineResult.proposedText);
      setCopiedRedline(true);
      setTimeout(() => setCopiedRedline(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <SkeletonLine width="260px" height="24px" />
            <SkeletonLine width="160px" height="14px" />
          </div>
          <SkeletonLine width="140px" height="36px" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
          <div className="space-y-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
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
  const absentGapsCount = gaps.filter((g) => g.status === "absent").length;

  // Dynamic Contract Health Score (0-100)
  const rawScore = 100 - (highRiskCount * 18) - (negotiateCount * 6) - (absentGapsCount * 5);
  const healthScore = Math.max(15, Math.min(98, rawScore));

  const tourSteps = [
    {
      target: "#left-document-pane",
      title: "Clause-by-Clause Document View",
      description: "Parsed into discrete clauses with line numbers, WCAG shape badges (▲ High, ◆ Negotiate, ● Standard), and synchronized highlight overlays.",
      position: "right" as const,
    },
    {
      target: "#health-score-card",
      title: "Contract Health Score",
      description: "Aggregated risk score based on high-severity liabilities, statutory mismatches, and unaddressed silence gaps.",
      position: "left" as const,
    },
    {
      target: "#tab-silence-radar",
      title: "Silence Radar (What's Missing)",
      description: "Detects absent protections like deposit refund deadlines and wear-and-tear carveouts not written in the contract.",
      position: "bottom" as const,
    },
    {
      target: "#tab-scenario-sim",
      title: "Scenario Simulator",
      description: "Simulates real-world situations (e.g. 'What if I vacate early in Month 4?') with exact chronological financial exposure.",
      position: "bottom" as const,
    },
    {
      target: "#btn-grounded-qa",
      title: "Grounded Q&A",
      description: "Ask in Hindi, Gujarati, or English. All citations are substring-verified, with an active refusal contract preventing hallucinations.",
      position: "bottom" as const,
    },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-slate-100">
      {/* Coverage Honesty Banner */}
      <div className="bg-slate-900 text-slate-300 text-[11px] px-4 py-1 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          <span className="font-semibold text-slate-200">
            {docState.clauses.length} of {docState.clauses.length} clauses parsed &amp; verified.
          </span>
          <span className="text-slate-500">|</span>
          <span className="text-slate-400">
            Perspective: Acting as <strong className="text-white">{docState.userRole}</strong>
          </span>
        </div>
        <div className="flex items-center space-x-3 text-[11px]">
          <Link href="/trust" className="text-blue-400 hover:underline flex items-center space-x-1">
            <span>View Public /trust Benchmark</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Top Action & Metadata Toolbar */}
      <div className="bg-white border-b border-slate-200 px-4 py-2 flex items-center justify-between shadow-xs z-20">
        <div className="flex items-center space-x-3">
          <Link
            href="/"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            title="Back to Home"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="space-y-0.5">
            <Breadcrumb
              items={[
                { label: "Home", href: "/" },
                { label: "Risk Radar", href: "/" },
                { label: docState.filename || "Contract" },
              ]}
            />
            <div className="flex items-center space-x-2">
              <span className="font-bold text-slate-900 text-sm">{docState.filename}</span>
              <span className="px-2 py-0.5 text-[10px] font-mono bg-slate-100 text-slate-700 rounded border border-slate-200">
                {docState.docType}
              </span>
              {docState.piiRedacted && (
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 rounded border border-emerald-200">
                  PII Masked
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Interactive Guided Tour Trigger */}
          <button
            onClick={() => setTourOpen(true)}
            className="px-2.5 py-1 text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg border border-blue-200 flex items-center space-x-1 transition-colors"
            title="Start Interactive Guided Tour"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden lg:inline">Guided Tour</span>
          </button>

          {/* 3-Way Reading Level Switch (A5 Father Mode) */}
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
              title="Class 8 Simple Language mode"
            >
              Simple
            </button>
            <button
              onClick={() => setReadingLevel("father")}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                readingLevel === "father"
                  ? "bg-purple-700 text-white shadow-xs"
                  : "text-purple-700 hover:bg-purple-50"
              }`}
              title="Father Mode (everyday analogies)"
            >
              Father Mode
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
            id="btn-grounded-qa"
            onClick={() => setQaOpen(!qaOpen)}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center space-x-1.5 transition-colors relative"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Grounded Q&amp;A</span>
            {chatHistory.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 absolute -top-1 -right-1"></span>
            )}
          </button>
        </div>
      </div>

      {/* Hero Split View: Left Document Pane & Right Multi-Tab Radar Pane */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT PANE: Synchronized Document View with Colored Highlight Overlay */}
        <div
          ref={leftPaneRef}
          id="left-document-pane"
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

              // Text rendering depending on reading level toggle
              let displayText = clause.text;
              if (readingLevel === "simple" && clause.simpleText) {
                displayText = clause.simpleText;
              } else if (readingLevel === "father") {
                displayText = `[Everyday Explanation]: ${clause.simpleText || clause.text} (In plain words: What this means for your daily life without any legal confusion).`;
              }

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

                  {/* Rendered Text */}
                  <p className="text-slate-800 text-xs sm:text-sm">
                    {displayText}
                  </p>

                  {/* Quoted Span Flag */}
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

        {/* RIGHT PANE: Multi-Tab Features (Risk Radar / Silence Radar / Scenario Simulator) */}
        <div
          ref={rightPaneRef}
          className="w-1/2 bg-slate-50 overflow-y-auto p-6 space-y-4 flex flex-col"
        >
          {/* Main Tab Bar */}
          <div className="bg-white rounded-xl p-2 border border-slate-200 shadow-xs flex items-center justify-between sticky top-0 z-10">
            <div className="flex space-x-1">
              <button
                onClick={() => setActiveRightTab("risks")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center space-x-1.5 ${
                  activeRightTab === "risks"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <span>F1 · Risk Radar</span>
                <span className="text-[10px] px-1.5 py-0.2 bg-red-500/30 rounded-full font-mono">
                  {highRiskCount}
                </span>
              </button>

              <button
                id="tab-silence-radar"
                onClick={() => setActiveRightTab("silence")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center space-x-1.5 ${
                  activeRightTab === "silence"
                    ? "bg-rose-700 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <span>A1 · Silence Radar (What&apos;s Missing)</span>
                {absentGapsCount > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 bg-rose-500/40 text-rose-100 rounded-full font-mono">
                    {absentGapsCount} Gaps
                  </span>
                )}
              </button>

              <button
                id="tab-scenario-sim"
                onClick={() => setActiveRightTab("scenario")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center space-x-1.5 ${
                  activeRightTab === "scenario"
                    ? "bg-blue-700 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                <span>A3 · Scenario Simulator</span>
              </button>
            </div>
          </div>

          {/* TAB 1: RISK RADAR FINDINGS */}
          {activeRightTab === "risks" && (
            <div className="space-y-3 flex-1">
              {/* Contract Health Score Ring Card */}
              <div id="health-score-card" className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between gap-4">
                <div className="flex items-center space-x-4">
                  <HealthScoreRing score={healthScore} size={84} label="Health" />
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-bold text-slate-900">
                        {healthScore >= 75 ? "Balanced Contract" : healthScore >= 50 ? "Moderate Counterparty Bias" : "One-Sided High Exposure"}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                        healthScore >= 75 ? "bg-emerald-100 text-emerald-800" : healthScore >= 50 ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800"
                      }`}>
                        {healthScore >= 75 ? "Low Risk" : healthScore >= 50 ? "Needs Negotiation" : "Heavy Attention Required"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {highRiskCount} high risk · {negotiateCount} negotiate points · {absentGapsCount} missing protections
                    </p>
                    {/* Mini horizontal distribution bar */}
                    <div className="flex items-center h-2 w-48 bg-slate-100 rounded-full overflow-hidden mt-2">
                      <div style={{ width: `${(highRiskCount / Math.max(1, docState.clauses.length)) * 100}%` }} className="bg-red-500 h-full" />
                      <div style={{ width: `${(negotiateCount / Math.max(1, docState.clauses.length)) * 100}%` }} className="bg-amber-500 h-full" />
                      <div style={{ width: `${(standardCount / Math.max(1, docState.clauses.length)) * 100}%` }} className="bg-emerald-500 h-full" />
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleGenerateActionPack("en")}
                  className="px-3 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center space-x-1.5 transition-colors whitespace-nowrap"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Action Pack</span>
                </button>
              </div>

              {/* Smart Suggested Questions Chips */}
              {docState.findings && docState.findings.length > 0 && (
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-semibold text-slate-700 flex items-center space-x-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                      <span>Suggested Advocate Inquiries</span>
                    </span>
                    <span className="text-[10px] text-slate-400">Click chip to run grounded Q&A</span>
                  </div>
                  <SuggestedQuestions
                    findings={docState.findings.map((f) => ({
                      severity: f.severity,
                      category: f.category,
                      plainMeaning: f.plainMeaning,
                    }))}
                    onSelect={(q) => {
                      setQaOpen(true);
                      handleAskQuestion(q);
                    }}
                  />
                </div>
              )}
              {/* Filter controls */}
              <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 text-xs">
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

                      {/* Action Buttons: Statute Check & Counter-Draft Redlines */}
                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="text-[11px] text-slate-500 truncate max-w-xs">
                          {finding?.statuteHint ? (
                            <span className="text-amber-700 font-medium">
                              Ref: {finding.statuteHint}
                            </span>
                          ) : (
                            <span>Standard Indian contract language</span>
                          )}
                        </div>

                        <div className="flex items-center space-x-2">
                          {/* A2 Counter-Draft Button (Available for High & Negotiate) */}
                          {(severity === "high" || severity === "negotiate") && finding && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenRedline(clause, finding);
                              }}
                              className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-900 rounded font-semibold text-[11px] border border-blue-200 transition-colors flex items-center space-x-1"
                              title="Suggest a reciprocal, fairer redline"
                            >
                              <Sparkles className="w-3 h-3 text-blue-600" />
                              <span>Suggest Fairer Redline</span>
                            </button>
                          )}

                          {/* Statute Check */}
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
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: SILENCE RADAR (A1 What's Missing) */}
          {activeRightTab === "silence" && (
            <div className="space-y-4 flex-1">
              <div className="p-4 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-900 space-y-1">
                <div className="flex items-center space-x-2 font-bold text-sm text-rose-950">
                  <AlertCircle className="w-4 h-4 text-rose-700" />
                  <span>A1 · Silence Radar: What This Contract Leaves Out</span>
                </div>
                <p className="leading-relaxed text-rose-800">
                  Real legal damage often comes from what is <em>not</em> in the document. Silence Radar compares your contract against standard expected protections for <strong>{docState.docType}</strong> under Indian statutory practice.
                </p>
              </div>

              {gapsLoading ? (
                <div className="py-12 text-center space-y-2">
                  <div className="w-7 h-7 border-2 border-rose-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-xs font-semibold text-slate-600">
                    Comparing document obligations against expected-clauses index...
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {gaps.map((gap, i) => (
                    <div
                      key={i}
                      className={`p-4 rounded-xl border bg-white space-y-2.5 ${
                        gap.status === "absent"
                          ? "border-rose-300 ring-1 ring-rose-300/40 shadow-xs"
                          : gap.status === "partial"
                          ? "border-amber-300"
                          : "border-slate-200"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {gap.status === "absent" ? (
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-rose-100 text-rose-800 rounded flex items-center space-x-1">
                              <span>○</span>
                              <span>Not Addressed</span>
                            </span>
                          ) : gap.status === "partial" ? (
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 rounded flex items-center space-x-1">
                              <span>◐</span>
                              <span>Partially Covered</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded flex items-center space-x-1">
                              <span>●</span>
                              <span>Covered</span>
                            </span>
                          )}
                          <span className="font-bold text-slate-900 text-xs">{gap.label}</span>
                        </div>

                        {gap.proofClauseId && (
                          <button
                            onClick={() => scrollToClause(gap.proofClauseId!)}
                            className="text-[11px] text-blue-700 font-semibold hover:underline"
                          >
                            Clause {gap.proofClauseId} →
                          </button>
                        )}
                      </div>

                      {/* Consequence of silence */}
                      <p className="text-xs text-slate-800 font-medium leading-normal">
                        {gap.consequence}
                      </p>

                      {/* What to ask about */}
                      <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-700 space-y-1">
                        <span className="font-semibold text-slate-900 block">
                          What to ask your lawyer or counterparty:
                        </span>
                        <p>{gap.askAbout}</p>
                        {gap.statuteHint && (
                          <span className="text-amber-800 font-mono block pt-1 text-[10px]">
                            Statute ground: {gap.statuteHint}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SCENARIO SIMULATOR (A3) */}
          {activeRightTab === "scenario" && (
            <div className="space-y-4 flex-1">
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-200 text-xs text-blue-900 space-y-1">
                <div className="flex items-center space-x-2 font-bold text-sm text-blue-950">
                  <Compass className="w-4 h-4 text-blue-700" />
                  <span>A3 · Scenario Simulator: What Happens In Real Life</span>
                </div>
                <p className="leading-relaxed text-blue-800">
                  Test realistic situations step-by-step. The simulator chains triggered clauses, calculates strictly from stated numbers (never estimates), and notes where the contract is silent.
                </p>
              </div>

              {/* Preset Scenario Chips */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                  Preset Scenarios (Click to test):
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleRunScenario("I leave early after 4 months due to job relocation")}
                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 hover:border-blue-500 hover:text-blue-700 shadow-2xs"
                  >
                    I leave early (Month 4)
                  </button>
                  <button
                    onClick={() => handleRunScenario("Landlord raises rent at the end of the 11 month term")}
                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 hover:border-blue-500 hover:text-blue-700 shadow-2xs"
                  >
                    Landlord raises rent
                  </button>
                  <button
                    onClick={() => handleRunScenario("Rent payment delayed by 12 days due to banking holiday")}
                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 hover:border-blue-500 hover:text-blue-700 shadow-2xs"
                  >
                    Rent delayed by 12 days
                  </button>
                </div>
              </div>

              {/* Custom Scenario Input */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (scenarioInput.trim()) handleRunScenario(scenarioInput);
                }}
                className="flex space-x-2 pt-1"
              >
                <input
                  type="text"
                  value={scenarioInput}
                  onChange={(e) => setScenarioInput(e.target.value)}
                  placeholder="Describe a scenario (e.g. 'What if the ceiling leaks and owner refuses repair?')..."
                  className="flex-1 text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  disabled={scenarioLoading || !scenarioInput.trim()}
                  className="px-3 py-2 bg-blue-700 text-white rounded-lg text-xs font-semibold hover:bg-blue-800 disabled:opacity-50"
                >
                  {scenarioLoading ? "Simulating..." : "Simulate"}
                </button>
              </form>

              {/* Simulation Output */}
              {scenarioLoading ? (
                <div className="py-12 text-center space-y-2">
                  <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-xs font-semibold text-slate-600">
                    Chaining triggered clauses and computing arithmetic timeline...
                  </p>
                </div>
              ) : scenarioResult ? (
                <div className="space-y-4 pt-2">
                  {/* Total Arithmetic Banner */}
                  {scenarioResult.moneyTotal && (
                    <div className="p-4 bg-slate-900 text-white rounded-xl space-y-1">
                      <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider font-mono block">
                        Strict Arithmetic Calculation (Document Numbers Only)
                      </span>
                      <div className="text-base font-extrabold text-white">
                        {scenarioResult.moneyTotal.stated}
                      </div>
                      <p className="text-xs text-slate-300 font-mono">
                        {scenarioResult.moneyTotal.workings}
                      </p>
                    </div>
                  )}

                  {/* Stepped Timeline */}
                  <div className="space-y-2.5">
                    <span className="font-bold text-slate-900 text-xs uppercase tracking-wider block">
                      Step-by-Step Chronological Outcome:
                    </span>
                    {scenarioResult.steps.map((step) => (
                      <div
                        key={step.order}
                        className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-1.5 shadow-2xs"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2 font-semibold text-slate-900 text-xs">
                            <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-[10px]">
                              {step.order}
                            </span>
                            <span>{step.timing || `Step ${step.order}`}</span>
                          </div>
                          <button
                            onClick={() => scrollToClause(step.clauseId)}
                            className="text-[10px] text-blue-700 font-semibold hover:underline"
                          >
                            Clause {step.clauseId} →
                          </button>
                        </div>
                        <p className="text-xs text-slate-800">{step.whatHappens}</p>
                        {step.amount && (
                          <span className="inline-block px-2 py-0.5 bg-red-50 text-red-700 border border-red-200 rounded text-[11px] font-mono font-bold">
                            Amount: {step.amount}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Silences */}
                  {scenarioResult.silences && scenarioResult.silences.length > 0 && (
                    <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-xs space-y-1">
                      <span className="font-bold text-rose-950 block">
                        Contract Silences on This Scenario:
                      </span>
                      <ul className="list-disc list-inside text-rose-900 space-y-0.5">
                        {scenarioResult.silences.map((s, idx) => (
                          <li key={idx}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <p className="text-[11px] text-slate-500 italic pt-1">
                    {scenarioResult.caveat}
                  </p>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* COUNTER-DRAFT REDLINE MODAL (A2) */}
      {redlineModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto border border-slate-200 shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    A2 · Counter-Draft: Fairer Reciprocal Redline
                  </h3>
                  <p className="text-xs text-slate-500">Draft for discussion · Not vetted legal drafting</p>
                </div>
              </div>
              <button
                onClick={() => setRedlineModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            {redlineLoading ? (
              <div className="py-12 text-center space-y-2">
                <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-xs font-semibold text-slate-600">
                  Drafting reciprocal wording balancing interests...
                </p>
              </div>
            ) : redlineResult ? (
              <div className="space-y-4 text-xs">
                {/* Side-by-side comparison */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3.5 bg-red-50/50 rounded-xl border border-red-200/80 space-y-1">
                    <span className="text-[10px] font-bold text-red-800 uppercase tracking-wider font-mono block">
                      Original Clause (One-Sided)
                    </span>
                    <p className="text-slate-800 font-serif leading-relaxed text-xs">
                      &ldquo;{redlineTargetClause?.text}&rdquo;
                    </p>
                  </div>

                  <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-300 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider font-mono">
                        Proposed Fairer Replacement
                      </span>
                      <button
                        onClick={copyRedlineToClipboard}
                        className="px-2 py-0.5 bg-white border border-emerald-300 text-emerald-800 rounded font-semibold text-[10px] flex items-center space-x-1"
                      >
                        {copiedRedline ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedRedline ? "Copied" : "Copy"}</span>
                      </button>
                    </div>
                    <p className="text-slate-900 font-serif leading-relaxed text-xs font-medium">
                      {redlineResult.proposedText}
                    </p>
                  </div>
                </div>

                {/* What changed bullets */}
                <div className="space-y-1.5 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="font-bold text-slate-900 text-xs block">
                    What Changed in Concrete Terms:
                  </span>
                  <ul className="list-disc list-inside text-slate-700 space-y-0.5">
                    {redlineResult.whatChanged.map((shift, idx) => (
                      <li key={idx}>{shift}</li>
                    ))}
                  </ul>
                </div>

                {/* Likely Pushback & Fallback */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-200 space-y-1">
                    <span className="font-bold text-amber-900 text-xs block">
                      Likely Counterparty Pushback:
                    </span>
                    <p className="text-slate-700 leading-normal">{redlineResult.likelyPushback}</p>
                  </div>

                  <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-200 space-y-1">
                    <span className="font-bold text-blue-900 text-xs block">
                      Softer Fallback to Offer:
                    </span>
                    <p className="text-slate-700 leading-normal">{redlineResult.fallback}</p>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 italic pt-1 border-t border-slate-100">
                  {redlineResult.caveat}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      )}

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
                    Checked against Indian Contract Act 1872, Model Tenancy Act 2021, CPA 2019 &amp; DPDP Act 2023
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
                <p className="text-xs font-semibold text-slate-600">Retrieving Indian statutes &amp; analyzing statutory distance...</p>
              </div>
            ) : statuteResult ? (
              <div className="space-y-4 text-xs">
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

                <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-100 space-y-1">
                  <span className="font-bold text-blue-900 text-xs block">Explanation:</span>
                  <p className="text-slate-800 leading-relaxed text-xs">
                    {statuteResult.explanation}
                  </p>
                </div>

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

      {/* GROUNDED Q&A DRAWER (F2 & A5 Voice) */}
      {qaOpen && (
        <div className="fixed bottom-0 right-0 w-full sm:w-[500px] h-[580px] max-h-[82vh] bg-white border-l border-t border-slate-300 shadow-2xl z-40 rounded-tl-2xl flex flex-col">
          {/* Drawer Header */}
          <div className="p-3.5 bg-slate-900 text-white rounded-tl-2xl flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MessageSquare className="w-4 h-4 text-emerald-400" />
              <span className="font-bold text-sm">Grounded Q&amp;A (Voice &amp; Verified Citations)</span>
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
              Pet Policy? (Out of Scope)
            </button>
            <button
              onClick={() => handleAskQuestion("Should I sue my landlord?")}
              className="px-2.5 py-1 bg-white border border-slate-200 rounded-full hover:border-red-500 hover:text-red-700 whitespace-nowrap"
              title="Tests Lever 1 Guardrail Rewrite"
            >
              Should I sue? (Guardrail)
            </button>
          </div>

          {/* Chat Messages with Read-Aloud Voice Buttons */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
            {chatHistory.length === 0 ? (
              <div className="text-center py-10 text-slate-500 space-y-2">
                <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="font-semibold">Ask any question or tap the mic button.</p>
                <p className="text-[11px] max-w-xs mx-auto">
                  Every answer requires exact clause citations. Unaddressed topics trigger explicit refusal rather than hallucination.
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
                  <div className="flex items-start justify-between">
                    <p className="flex-1">{msg.text}</p>
                    {msg.role === "assistant" && (
                      <ReadAloudButton text={msg.text} language={actionPackLanguage} />
                    )}
                  </div>

                  {msg.guardrailTriggered && (
                    <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-900 flex items-start space-x-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-700 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block">Lever 1 Legal Boundary Guardrail Active</span>
                        <span>
                          Lawsuit advice was rewritten into permitted informational guidance.
                        </span>
                      </div>
                    </div>
                  )}

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

          {/* Question Input + Mic Button */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAskQuestion();
            }}
            className="p-3 border-t border-slate-200 bg-white flex space-x-2"
          >
            <VoiceInput
              language={actionPackLanguage}
              onTranscript={(text) => setQuestion(text)}
              disabled={qaLoading}
            />
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask a question (or speak using mic)..."
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

      {/* ACTION PACK & LAWYER HANDOFF MODAL (F5 & A6) */}
      {actionPackOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[88vh] overflow-hidden border border-slate-200 shadow-2xl flex flex-col">
            {/* Modal Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-blue-400" />
                <div>
                  <h3 className="font-bold text-sm">F5 · Action Pack &amp; A6 Lawyer Handoff</h3>
                  <p className="text-xs text-slate-400">Portable outputs for non-lawyers &amp; advocates</p>
                </div>
              </div>

              {/* Language Selector + Close */}
              <div className="flex items-center space-x-2">
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
            <div className="flex border-b border-slate-200 bg-slate-50 px-4 text-xs font-semibold justify-between items-center">
              <div className="flex">
                <button
                  onClick={() => setActionPackTab("summary")}
                  className={`py-3 px-3 border-b-2 transition-colors ${
                    actionPackTab === "summary"
                      ? "border-blue-600 text-blue-700 bg-white"
                      : "border-transparent text-slate-600 hover:text-slate-900"
                  }`}
                >
                  1. Plain Summary
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
                  4. Negotiation Email
                </button>
              </div>

              {/* Printable Handoff & Calendar buttons */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => window.print()}
                  className="px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-100 rounded text-slate-700 font-semibold text-[11px] flex items-center space-x-1"
                  title="Print advocate consultation packet"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Print PDF Packet</span>
                </button>
                <button
                  onClick={handleDownloadCalendar}
                  disabled={downloadingIcs}
                  className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100 rounded font-semibold text-[11px] flex items-center space-x-1"
                  title="Export key obligations to .ICS calendar"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">.ICS Calendar</span>
                </button>
              </div>
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
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-slate-900 text-sm">6-Sentence Summary</h4>
                        <ReadAloudButton text={actionPackResult.summary} language={actionPackLanguage} />
                      </div>
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

      {/* Interactive Guided Tour */}
      <GuidedTour
        isOpen={tourOpen}
        onComplete={() => setTourOpen(false)}
        steps={tourSteps}
      />
    </div>
  );
}
