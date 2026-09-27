import fs from "fs";
import path from "path";
import { Clause, SilenceGap, SilenceGapSchema } from "@/lib/schema";
import { buildGapCheckPrompt } from "@/lib/prompts/gapcheck";
import { callLLM, verifyQuotedSpan } from "@/lib/llm";
import { z } from "zod";

export interface ExpectedTopic {
  docType: string;
  key: string;
  label: string;
  whyItMatters: string;
  commonIn: string;
  statuteHint?: string;
}

let cachedExpectedTopics: ExpectedTopic[] | null = null;

export function loadExpectedTopics(): ExpectedTopic[] {
  if (cachedExpectedTopics) return cachedExpectedTopics;
  try {
    const filePath = path.join(process.cwd(), "corpus", "expected-clauses.jsonl");
    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.split("\n").filter((l) => l.trim().length > 0);
    cachedExpectedTopics = lines.map((l) => JSON.parse(l) as ExpectedTopic);
    return cachedExpectedTopics;
  } catch (err) {
    console.warn("Could not read expected-clauses.jsonl", err);
    return [];
  }
}

/**
 * Maps incoming document type to canonical docType key in expected-clauses corpus
 */
export function normalizeDocType(docType: string): string {
  const dt = docType.toLowerCase();
  if (dt.includes("lease") || dt.includes("rent") || dt.includes("tenan")) return "residential_lease";
  if (dt.includes("employ") || dt.includes("job") || dt.includes("offer")) return "employment";
  if (dt.includes("freelance") || dt.includes("service") || dt.includes("consult")) return "freelance";
  if (dt.includes("nda") || dt.includes("confidential")) return "nda";
  if (dt.includes("loan") || dt.includes("borrow") || dt.includes("mortgage")) return "loan";
  return "residential_lease";
}

const GapResponseSchema = z.object({
  gaps: z.array(SilenceGapSchema),
});

/**
 * Silence Radar engine: evaluates which expected clauses are covered, partial, or absent
 */
export async function detectSilenceGaps(params: {
  clauses: Clause[];
  docType: string;
  userRole: string;
}): Promise<SilenceGap[]> {
  const canonicalType = normalizeDocType(params.docType);
  const allExpected = loadExpectedTopics();
  const relevantTopics = allExpected.filter((t) => t.docType === canonicalType);

  if (relevantTopics.length === 0) {
    return [];
  }

  // For each topic, pick the 3 most relevant candidate clauses
  const topicsWithCandidates = relevantTopics.map((topic) => {
    const topicTokens = topic.label.toLowerCase().split(/\s+/).concat(topic.key.split("_"));
    const scoredClauses = params.clauses.map((clause) => {
      let score = 0;
      const text = `${clause.heading} ${clause.text}`.toLowerCase();
      for (const token of topicTokens) {
        if (text.includes(token)) score += 2;
      }
      return { clause, score };
    });

    scoredClauses.sort((a, b) => b.score - a.score);
    const top3 = scoredClauses.slice(0, 3).map((s) => ({
      clauseId: s.clause.id,
      number: s.clause.number,
      heading: s.clause.heading,
      text: s.clause.text.slice(0, 200),
    }));

    return {
      key: topic.key,
      label: topic.label,
      whyItMatters: topic.whyItMatters,
      statuteHint: topic.statuteHint,
      candidates: top3,
    };
  });

  const promptStr = JSON.stringify(topicsWithCandidates, null, 2);
  const prompt = buildGapCheckPrompt({
    docType: params.docType,
    userRole: params.userRole,
    topicsWithCandidates: promptStr,
  });

  // Deterministic fallback for offline demo insurance
  const fallbackGapDetector = (): { gaps: SilenceGap[] } => {
    const gaps: SilenceGap[] = relevantTopics.map((topic) => {
      // Check if any clause clearly addresses this topic
      const textLower = params.clauses.map((c) => c.text.toLowerCase()).join(" ");

      if (topic.key === "repair_responsibility") {
        const repairClause = params.clauses.find((c) => c.text.toLowerCase().includes("maintenance") || c.text.toLowerCase().includes("repair"));
        if (repairClause && repairClause.text.toLowerCase().includes("structural defect only if reported within 15 days")) {
          return {
            key: topic.key,
            label: topic.label,
            status: "partial" as const,
            proofClauseId: repairClause.id,
            proofSpan: "structural defects only if reported within 15 days",
            consequence: "The lease gives only 15 days for structural issues; after that, all plumbing, electrical, and maintenance bills fall entirely on the tenant with no landlord repair duty.",
            askAbout: "Ask to incorporate Section 15 Model Tenancy Act standards where the landlord remains responsible for major structural repairs and whitewashing.",
            statuteHint: topic.statuteHint,
          };
        }
      }

      if (topic.key === "deposit_refund_timeline") {
        const hasRefundTimeline = /refunded\s+within\s+\d+\s+days/i.test(textLower);
        if (!hasRefundTimeline) {
          const depMatch = textLower.match(/rs\.?\s*[\d,]+(\/-)?/i);
          const depStr = depMatch ? depMatch[0] : "security deposit";
          return {
            key: topic.key,
            label: topic.label,
            status: "absent" as const,
            proofClauseId: null,
            proofSpan: "",
            consequence: `No deadline is specified for returning the ${depStr} upon handover, allowing the landlord to delay return indefinitely after you vacate.`,
            askAbout: "Ask for an explicit timeline: 'Security deposit to be refunded on the date of vacant handover, or within a maximum of 7 banking days.'",
            statuteHint: topic.statuteHint,
          };
        }
      }

      if (topic.key === "wear_and_tear_carveout") {
        const hasWearTear = textLower.includes("wear and tear");
        if (!hasWearTear) {
          return {
            key: topic.key,
            label: topic.label,
            status: "absent" as const,
            proofClauseId: null,
            proofSpan: "",
            consequence: "The agreement has no allowance for normal wear and tear, meaning the landlord can unilaterally deduct repainting and minor scuffs from your deposit.",
            askAbout: "Request standard wording: 'Tenant shall not be liable for normal wear and tear arising from reasonable use.'",
            statuteHint: topic.statuteHint,
          };
        }
      }

      if (topic.key === "force_majeure_rent_waiver") {
        return {
          key: topic.key,
          label: topic.label,
          status: "absent" as const,
          proofClauseId: null,
          proofSpan: "",
          consequence: "Without a force majeure clause, full rent remains payable even if the building becomes uninhabitable due to flood, fire, or government order.",
          askAbout: "Ask for rent suspension if the premises become uninhabitable due to events beyond tenant control.",
          statuteHint: topic.statuteHint,
        };
      }

      // Check for covered topics
      const matchingClause = params.clauses.find((c) =>
        c.text.toLowerCase().includes(topic.key.replace(/_/g, " ")) ||
        c.heading.toLowerCase().includes(topic.key.replace(/_/g, " "))
      );

      if (matchingClause) {
        return {
          key: topic.key,
          label: topic.label,
          status: "covered" as const,
          proofClauseId: matchingClause.id,
          proofSpan: matchingClause.text.slice(0, 50),
          consequence: "This topic is addressed in the contract.",
          askAbout: "Verify specific terms with your advocate.",
          statuteHint: topic.statuteHint,
        };
      }

      return {
        key: topic.key,
        label: topic.label,
        status: "absent" as const,
        proofClauseId: null,
        proofSpan: "",
        consequence: `The contract is silent on ${topic.label.toLowerCase()}, leaving this point to verbal goodwill rather than an enforceable written term.`,
        askAbout: `Ask your advocate whether a standard ${topic.label} clause should be inserted.`,
        statuteHint: topic.statuteHint,
      };
    });

    return { gaps };
  };

  try {
    const { data } = await callLLM<{ gaps: SilenceGap[] }>({
      prompt,
      schema: GapResponseSchema,
      temperature: 0,
      mockFallback: fallbackGapDetector,
    });

    // Verify proofSpan if marked covered or partial
    const verifiedGaps = data.gaps.map((gap) => {
      const topicMeta = relevantTopics.find((t) => t.key === gap.key);
      const hint = topicMeta?.statuteHint;

      if (gap.status === "absent") {
        return { ...gap, proofClauseId: null, proofSpan: "", statuteHint: hint };
      }

      if (gap.proofClauseId && gap.proofSpan) {
        const clause = params.clauses.find((c) => c.id === gap.proofClauseId);
        if (clause) {
          const verified = verifyQuotedSpan(clause.text, gap.proofSpan);
          if (!verified) {
            // Drop proofSpan if hallucinated
            return { ...gap, proofSpan: "", statuteHint: hint };
          }
          return { ...gap, proofSpan: verified, statuteHint: hint };
        }
      }

      return { ...gap, statuteHint: hint };
    });

    return verifiedGaps;
  } catch {
    return fallbackGapDetector().gaps;
  }
}
