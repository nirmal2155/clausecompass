import { z } from "zod";

export const ClauseSchema = z.object({
  id: z.string(), // e.g. "c-001"
  number: z.string().nullable(), // e.g. "14.2" or null
  heading: z.string(),
  text: z.string(),
  page: z.number().default(1),
  bbox: z.array(z.number()).default([0, 0, 100, 20]), // [x0, y0, x1, y1] for highlight overlay
  startLine: z.number().optional(),
  endLine: z.number().optional(),
  simpleText: z.string().optional(), // Class 8 simple reading level version
});

export type Clause = z.infer<typeof ClauseSchema>;

export const RiskFindingSchema = z.object({
  clauseId: z.string(),
  severity: z.enum(["high", "negotiate", "standard"]),
  category: z.enum([
    "financial",
    "termination",
    "liability",
    "confidentiality",
    "dispute",
    "data_privacy",
    "ip",
    "other",
  ]),
  plainMeaning: z.string(), // 1-2 sentences, no legal jargon
  whyItMatters: z.string(),
  favours: z.enum(["you", "counterparty", "balanced", "unclear"]),
  quotedSpan: z.string(), // MUST be verified as EXACT substring of clause.text
  confidence: z.enum(["high", "medium", "low"]),
  statuteHint: z.string().optional(),
});

export type RiskFinding = z.infer<typeof RiskFindingSchema>;

export const CitationSchema = z.object({
  clauseId: z.string(),
  quotedSpan: z.string(),
  verified: z.boolean().default(true),
});

export type Citation = z.infer<typeof CitationSchema>;

export const StatuteRefSchema = z.object({
  act: z.string(),
  section: z.string(),
  relevance: z.string(),
});

export type StatuteRef = z.infer<typeof StatuteRefSchema>;

export const GroundedAnswerSchema = z.object({
  answer: z.string(),
  answerFound: z.boolean(),
  citations: z.array(CitationSchema),
  statuteRefs: z.array(StatuteRefSchema),
  groundingType: z.enum(["document", "statute", "general", "none"]),
  guardrailTriggered: z.boolean().optional(),
  originalDraft: z.string().optional(),
  escalateWarning: z.string().optional(),
});

export type GroundedAnswer = z.infer<typeof GroundedAnswerSchema>;

export const StatuteCheckResultSchema = z.object({
  verdict: z.enum(["typical", "unusual", "review_recommended", "outside_scope"]),
  explanation: z.string(),
  citations: z.array(
    z.object({
      act: z.string(),
      section: z.string(),
      gist: z.string(),
    })
  ),
  whatToAsk: z.string(),
});

export type StatuteCheckResult = z.infer<typeof StatuteCheckResultSchema>;

export const CompareDeltaSchema = z.object({
  changeType: z.enum([
    "added",
    "removed",
    "strengthened",
    "weakened",
    "reworded_no_effect",
    "scope_changed",
  ]),
  clauseA: z.string().nullable(),
  clauseB: z.string().nullable(),
  plainDelta: z.string(),
  impactOn: z.enum(["you", "counterparty", "neither"]),
  materiality: z.enum(["high", "medium", "low"]),
});

export type CompareDelta = z.infer<typeof CompareDeltaSchema>;

export const CompareResultSchema = z.object({
  headline: z.string(),
  deltas: z.array(CompareDeltaSchema),
});

export type CompareResult = z.infer<typeof CompareResultSchema>;

export const ActionPackResultSchema = z.object({
  summary: z.string(),
  checklist: z.array(
    z.object({
      task: z.string(),
      due: z.string(),
      clauseId: z.string(),
    })
  ),
  lawyerQuestions: z.array(
    z.object({
      q: z.string(),
      clauseId: z.string(),
      why: z.string(),
    })
  ),
  email: z.object({
    subject: z.string(),
    body: z.string(),
  }),
});

export type ActionPackResult = z.infer<typeof ActionPackResultSchema>;

export const GuardrailResultSchema = z.object({
  verdict: z.enum(["allow", "rewrite"]),
  rewritten: z.string().nullable(),
  reasons: z.array(z.string()),
  needsLawyer: z.boolean(),
});

export type GuardrailResult = z.infer<typeof GuardrailResultSchema>;

export interface DocumentAnalysisState {
  id: string;
  filename: string;
  fileHash: string;
  docType: string;
  userRole: string;
  rawText: string;
  clauses: Clause[];
  findings: RiskFinding[];
  createdAt: string;
  piiRedacted: boolean;
  redactionMap?: Record<string, string>;
}
