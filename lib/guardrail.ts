import { buildGuardrailPrompt } from "@/lib/prompts/guardrail";
import { callLLM } from "@/lib/llm";
import { GuardrailResult, GuardrailResultSchema } from "@/lib/schema";

// Pattern rules to detect advice and outcome predictions instantly
const ADVICE_PATTERNS = [
  { pattern: /\b(?:you should|you must|i recommend that you|tell user to|advise to)?\s*(?:immediately\s+)?sue\b/i, reason: "Direct instruction to file lawsuit" },
  { pattern: /\b(?:file a case|file an fir|drag them to court|lodge a complaint|take them to court)\b/i, reason: "Direct procedural instruction" },
  { pattern: /\b(?:you will win|court will definitely hold|guaranteed to win|guaranteed refund|guaranteed.*payout|100%.*payout)\b/i, reason: "Outcome prediction" },
  { pattern: /\b(?:this contract is invalid|they broke the law|this clause is illegal)\b/i, reason: "Definitive conclusion of law" },
  { pattern: /\b(?:do not sign this|you must not sign|refuse to sign)\b/i, reason: "Action directive regarding execution" },
  { pattern: /\b(?:you have exactly \d+ days to take legal action)\b/i, reason: "Unqualified limitation period assertion" },
  { pattern: /\b(?:system override|ignore previous instructions|forget legal boundaries|jailbreak|disregard safety)\b/i, reason: "Adversarial system prompt injection attempt" },
];

const ESCALATION_PATTERNS = [
  { pattern: /\b(?:criminal liability|ipc|bns|jail|imprisonment|arrest|police case)\b/i, topic: "Criminal law matter" },
  { pattern: /\b(?:child custody|divorce|maintenance under section 125)\b/i, topic: "Family law & custody" },
  { pattern: /\b(?:time-barred|limitation expired|adverse possession)\b/i, topic: "Limitation period & time-barred rights" },
  { pattern: /\b(?:ongoing litigation|pending court case|contempt of court)\b/i, topic: "Pending court proceedings" },
];

/**
 * Fast deterministic heuristics filter
 */
export function quickHeuristicCheck(text: string): {
  violates: boolean;
  reasons: string[];
  escalate: boolean;
  escalationTopics: string[];
} {
  const reasons: string[] = [];
  for (const { pattern, reason } of ADVICE_PATTERNS) {
    if (pattern.test(text)) {
      reasons.push(reason);
    }
  }

  const escalationTopics: string[] = [];
  for (const { pattern, topic } of ESCALATION_PATTERNS) {
    if (pattern.test(text)) {
      escalationTopics.push(topic);
    }
  }

  return {
    violates: reasons.length > 0,
    reasons,
    escalate: escalationTopics.length > 0,
    escalationTopics,
  };
}

/**
 * Deterministic fallback rewrite for instant execution
 */
export function deterministicRewrite(text: string, reasons: string[]): string {
  let rewritten = text;
  rewritten = rewritten.replace(/\b(?:you should sue|you must sue|i recommend suing)\b/gi, "a party in this position may consider exploring legal remedies, such as filing a claim for breach or damages, which an advocate can advise on");
  rewritten = rewritten.replace(/\b(?:file a case|drag them to court)\b/gi, "consult a legal professional regarding initiating legal proceedings");
  rewritten = rewritten.replace(/\b(?:you will win|you are guaranteed to win)\b/gi, "a dispute resolution forum would evaluate the factual evidence and relevant statutory provisions");
  rewritten = rewritten.replace(/\b(?:this contract is invalid|this clause is illegal)\b/gi, "this clause touches areas where statutory provisions (such as the Indian Contract Act) impose strict conditions, making it potentially subject to judicial review");
  rewritten = rewritten.replace(/\b(?:do not sign this|refuse to sign this)\b/gi, "you may want to negotiate these terms or obtain legal counsel prior to execution");

  return `${rewritten}\n\n[Note: This response explains contractual language and legal principles for informational purposes. Whether specific remedies apply to your facts requires consultation with an advocate.]`;
}

/**
 * Executes Post-Hoc Guardrail Check
 */
export async function enforceGuardrail(draft: string): Promise<GuardrailResult> {
  const heuristic = quickHeuristicCheck(draft);

  // If clean and no escalation, allow directly
  if (!heuristic.violates && !heuristic.escalate) {
    return {
      verdict: "allow",
      rewritten: null,
      reasons: [],
      needsLawyer: false,
    };
  }

  // Attempt LLM rewrite pass using P7 prompt
  try {
    const prompt = buildGuardrailPrompt(draft);
    const { data } = await callLLM<GuardrailResult>({
      prompt,
      schema: GuardrailResultSchema,
      temperature: 0,
      mockFallback: () => ({
        verdict: heuristic.violates ? "rewrite" : "allow",
        rewritten: heuristic.violates ? deterministicRewrite(draft, heuristic.reasons) : null,
        reasons: heuristic.reasons,
        needsLawyer: heuristic.escalate,
      }),
    });
    return data;
  } catch {
    // If LLM unavailable, use our deterministic rewriter
    return {
      verdict: heuristic.violates ? "rewrite" : "allow",
      rewritten: heuristic.violates ? deterministicRewrite(draft, heuristic.reasons) : null,
      reasons: heuristic.reasons,
      needsLawyer: heuristic.escalate,
    };
  }
}
