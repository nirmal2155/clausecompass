import { NextRequest, NextResponse } from "next/server";
import { getCachedDocument, setCachedDocument } from "@/lib/cache";
import { buildRiskAnalysisPrompt } from "@/lib/prompts/risk";
import { callLLM, verifyQuotedSpan } from "@/lib/llm";
import { Clause, RiskFinding, RiskFindingSchema } from "@/lib/schema";
import { z } from "zod";

const RiskBatchResponseSchema = z.object({
  findings: z.array(RiskFindingSchema),
});

// Helper for chunking clauses into batches of 8
function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { documentId, clauses, docType, userRole } = body;

    const existingDoc = documentId ? getCachedDocument(documentId) : null;
    const clauseList: Clause[] = clauses || existingDoc?.clauses || [];

    if (clauseList.length === 0) {
      return NextResponse.json({ error: "No clauses provided for analysis" }, { status: 400 });
    }

    // Check if findings are already cached
    if (existingDoc && existingDoc.findings && existingDoc.findings.length > 0) {
      return NextResponse.json({
        findings: existingDoc.findings,
        fromCache: true,
      });
    }

    // Split clauses into parallel batches of 8
    const batches = chunkArray(clauseList, 8);

    // Process all batches in parallel
    const batchPromises = batches.map(async (batchClauses) => {
      const promptClausesJson = JSON.stringify(
        batchClauses.map((c) => ({
          clauseId: c.id,
          number: c.number,
          heading: c.heading,
          text: c.text,
        })),
        null,
        2
      );

      const prompt = buildRiskAnalysisPrompt({
        docType: docType || existingDoc?.docType || "Commercial Contract",
        userRole: userRole || existingDoc?.userRole || "Signatory",
        clausesJson: promptClausesJson,
      });

      // Fallback deterministic risk detector if offline or fallback mode
      const fallbackFindingsGenerator = (): { findings: RiskFinding[] } => {
        const findings: RiskFinding[] = batchClauses.map((clause) => {
          const textLower = clause.text.toLowerCase();
          let severity: "high" | "negotiate" | "standard" = "standard";
          let category: RiskFinding["category"] = "other";
          let plainMeaning = "This clause defines standard operational terms.";
          let whyItMatters = "Standard term customary in Indian legal agreements.";
          let favours: RiskFinding["favours"] = "balanced";
          let quotedSpan = "";
          let statuteHint = "";

          // Check for high-risk flags
          if (textLower.includes("forfeit") || textLower.includes("lock-in") || textLower.includes("liquidated damages")) {
            severity = "high";
            category = "termination";
            plainMeaning = "Imposes heavy forfeiture of deposit or damages upon early termination.";
            whyItMatters = "Section 74 of the Indian Contract Act limits damages to reasonable compensation rather than punitive penalties.";
            favours = "counterparty";
            quotedSpan = clause.text.slice(0, Math.min(80, clause.text.length));
            statuteHint = "Indian Contract Act 1872, Section 74";
          } else if (textLower.includes("waive") || textLower.includes("sole arbitrator") || textLower.includes("no court")) {
            severity = "high";
            category = "dispute";
            plainMeaning = "Disputes are restricted to an owner-appointed arbitrator, waiving court access.";
            whyItMatters = "Agreements restraining legal proceedings are void under Section 28 of the Indian Contract Act 1872.";
            favours = "counterparty";
            quotedSpan = clause.text.slice(0, Math.min(70, clause.text.length));
            statuteHint = "Indian Contract Act 1872, Section 28";
          } else if (textLower.includes("non-compete") || textLower.includes("restrain")) {
            severity = "high";
            category = "ip";
            plainMeaning = "Restrains you from working in your trade or profession after leaving.";
            whyItMatters = "Agreements in restraint of trade are void ab initio under Section 27 of the Indian Contract Act 1872.";
            favours = "counterparty";
            quotedSpan = clause.text.slice(0, Math.min(70, clause.text.length));
            statuteHint = "Indian Contract Act 1872, Section 27";
          } else if (textLower.includes("10 months") || textLower.includes("4,50,000") || textLower.includes("security deposit")) {
            severity = "negotiate";
            category = "financial";
            plainMeaning = "Requires a substantial upfront deposit.";
            whyItMatters = "Model Tenancy Act Section 10 contemplates a 2-month cap for residential leases.";
            favours = "counterparty";
            quotedSpan = clause.text.slice(0, Math.min(60, clause.text.length));
            statuteHint = "Model Tenancy Act 2021, Section 10";
          } else if (textLower.includes("system override") || textLower.includes("ignore all prior")) {
            severity = "high";
            category = "other";
            plainMeaning = "This document contains text that attempts to manipulate automated review tools.";
            whyItMatters = "Detected by prompt-injection security guardrails.";
            favours = "counterparty";
            quotedSpan = clause.text.slice(0, Math.min(60, clause.text.length));
          }

          return {
            clauseId: clause.id,
            severity,
            category,
            plainMeaning,
            whyItMatters,
            favours,
            quotedSpan,
            confidence: "high" as const,
            statuteHint,
          };
        });

        return { findings };
      };

      const { data } = await callLLM<{ findings: RiskFinding[] }>({
        prompt,
        schema: RiskBatchResponseSchema,
        temperature: 0.2,
        mockFallback: fallbackFindingsGenerator,
      });

      // Key Trust Mechanism: Verify quotedSpan literally exists in the clause text!
      const verifiedFindings = data.findings.map((finding) => {
        const matchingClause = batchClauses.find((c) => c.id === finding.clauseId);
        if (!matchingClause) return finding;

        const verifiedSpan = verifyQuotedSpan(matchingClause.text, finding.quotedSpan);
        if (!verifiedSpan) {
          // Drop hallucinated quote and downgrade confidence
          return {
            ...finding,
            quotedSpan: "",
            confidence: "low" as const,
          };
        }
        return {
          ...finding,
          quotedSpan: verifiedSpan,
        };
      });

      return verifiedFindings;
    });

    const results = await Promise.all(batchPromises);
    const allFindings = results.flat();

    // Enforce anti-inflation rule: high severity should not exceed 40% of standard contracts
    const highCount = allFindings.filter((f) => f.severity === "high").length;
    if (allFindings.length >= 5 && highCount / allFindings.length > 0.4) {
      // Downgrade weakest high to negotiate
      let excess = Math.ceil(highCount - allFindings.length * 0.4);
      for (const f of allFindings) {
        if (f.severity === "high" && excess > 0 && f.confidence !== "high") {
          f.severity = "negotiate";
          excess--;
        }
      }
    }

    if (existingDoc) {
      existingDoc.findings = allFindings;
      setCachedDocument(existingDoc);
    }

    return NextResponse.json({
      findings: allFindings,
      fromCache: false,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Analyze error:", err);
    return NextResponse.json(
      { error: "Risk analysis failed: " + (err.message || "Unknown error") },
      { status: 500 }
    );
  }
}
