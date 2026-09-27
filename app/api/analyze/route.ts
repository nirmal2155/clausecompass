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

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing document id" }, { status: 400 });
    }
    const doc = getCachedDocument(id);
    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }
    return NextResponse.json({ docState: doc });
  } catch (error: unknown) {
    return NextResponse.json({ error: "Failed to retrieve document" }, { status: 500 });
  }
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
        docState: existingDoc,
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
          const activeDocType = (docType || existingDoc?.docType || "").toLowerCase();
          let severity: "high" | "negotiate" | "standard" = "standard";
          let category: RiskFinding["category"] = "other";
          let plainMeaning = "This clause defines standard operational terms.";
          let whyItMatters = "Standard term customary in Indian legal agreements.";
          let favours: RiskFinding["favours"] = "balanced";
          let matchedKeyword = "";
          let statuteHint = "";

          // Security check: adversarial prompt injection
          if (textLower.includes("system override") || textLower.includes("ignore all prior") || textLower.includes("jailbreak")) {
            severity = "high";
            category = "other";
            plainMeaning = "This document contains text that attempts to manipulate automated review tools.";
            whyItMatters = "Detected by prompt-injection security guardrails.";
            favours = "counterparty";
            matchedKeyword = textLower.includes("system override") ? "system override" : "ignore all prior";
            statuteHint = "Information Technology Act 2000, Section 43";
          }
          // Restraint of trade / Non-compete (ICA Sec 27)
          else if (textLower.includes("non-compete") || textLower.includes("restrain") || textLower.includes("competing commercial") || textLower.includes("post-termination restriction")) {
            severity = "high";
            category = "ip";
            plainMeaning = "Restrains you from working in your trade, profession, or joining competitors after exit.";
            whyItMatters = "Agreements in restraint of trade are void ab initio under Section 27 of the Indian Contract Act 1872.";
            favours = "counterparty";
            matchedKeyword = textLower.includes("non-compete") ? "non-compete" : "restrain";
            statuteHint = "Indian Contract Act 1872, Section 27";
          }
          // Dispute / Unilateral Sole Arbitrator (ICA Sec 28 / Arbitration Act Sec 12(5))
          else if (textLower.includes("sole arbitrator") || textLower.includes("no court") || textLower.includes("exclusive jurisdiction of the company") || textLower.includes("waives any right to approach")) {
            severity = "high";
            category = "dispute";
            plainMeaning = "Restricts dispute resolution to an arbitrator appointed unilaterally by the counterparty, waiving court access.";
            whyItMatters = "Unilateral appointment of sole arbitrator is invalid under Arbitration & Conciliation Act Sec 12(5), and agreements restraining legal proceedings are void under Section 28 ICA.";
            favours = "counterparty";
            matchedKeyword = textLower.includes("sole arbitrator") ? "sole arbitrator" : "waive";
            statuteHint = "Indian Contract Act 1872, Section 28 & Arbitration Act Section 12(5)";
          }
          // Employment Bond / Liquidated damages / Training recovery
          else if (
            (activeDocType.includes("employ") || textLower.includes("employee") || textLower.includes("salary")) &&
            (textLower.includes("bond") || textLower.includes("training fee") || textLower.includes("liquidated damages") || textLower.includes("lock-in") || textLower.includes("forfeit"))
          ) {
            severity = "high";
            category = "termination";
            plainMeaning = "Imposes heavy financial bond or salary forfeiture if you resign prior to a mandatory period.";
            whyItMatters = "Under Section 74 Indian Contract Act, employers cannot recover penal bond sums; recovery is strictly restricted to actual, proven training expenses incurred.";
            favours = "counterparty";
            matchedKeyword = textLower.includes("bond") ? "bond" : (textLower.includes("training") ? "training" : "forfeit");
            statuteHint = "Indian Contract Act 1872, Section 74 & Section 27";
          }
          // Coaching / Consumer 100% Non-Refundable Fee (CPA Sec 2(46))
          else if (
            (activeDocType.includes("consumer") || textLower.includes("coaching") || textLower.includes("student") || textLower.includes("tuition")) &&
            (textLower.includes("non-refundable") || textLower.includes("no refund") || textLower.includes("forfeited in full"))
          ) {
            severity = "high";
            category = "financial";
            plainMeaning = "Declares all course/admission fees strictly non-refundable even before commencement or upon early exit.";
            whyItMatters = "Section 2(46) of the Consumer Protection Act 2019 defines arbitrary non-refundable fee retention as an unfair contract term, repeatedly invalidated by NCDRC.";
            favours = "counterparty";
            matchedKeyword = textLower.includes("non-refundable") ? "non-refundable" : "no refund";
            statuteHint = "Consumer Protection Act 2019, Section 2(46)";
          }
          // Freelance / Commercial IP grab or Moral Rights waiver
          else if (
            (activeDocType.includes("service") || activeDocType.includes("freelance") || textLower.includes("contractor") || textLower.includes("developer")) &&
            (textLower.includes("moral rights") || textLower.includes("irrevocable assignment") || textLower.includes("in perpetuity") || textLower.includes("prior to payment"))
          ) {
            severity = "high";
            category = "ip";
            plainMeaning = "Assigns intellectual property irrevocably without conditioning transfer on receipt of full invoice payment.";
            whyItMatters = "Under Section 19 of the Copyright Act 1957, assignment takes effect only upon consideration. Waiving moral rights impairs author attribution.";
            favours = "counterparty";
            matchedKeyword = textLower.includes("moral rights") ? "moral rights" : "assignment";
            statuteHint = "Copyright Act 1957, Section 19 & Section 57";
          }
          // Unlimited revisions in freelance
          else if (textLower.includes("unlimited revisions") || textLower.includes("sole subjective satisfaction") || textLower.includes("no additional fees shall be billable")) {
            severity = "negotiate";
            category = "other";
            plainMeaning = "Mandates unlimited revisions and redesigns to sole subjective client satisfaction without additional fees.";
            whyItMatters = "Exposes service providers to severe uncompensated scope creep and delayed final acceptance.";
            favours = "counterparty";
            matchedKeyword = "revisions";
            statuteHint = "Standard Commercial Services Best Practice";
          }
          // Extended payment terms (Net-90) & invoice withholding
          else if (textLower.includes("net-90") || textLower.includes("withhold any invoice") || textLower.includes("without interest")) {
            severity = "negotiate";
            category = "financial";
            plainMeaning = "Imposes an extended Net-90 payment cycle and allows client to withhold invoices without interest.";
            whyItMatters = "Severely strains cash flow. MSMED Act 2006 mandates payment within 45 days with statutory compound interest for registered enterprises.";
            favours = "counterparty";
            matchedKeyword = textLower.includes("net-90") ? "net-90" : "invoice";
            statuteHint = "MSMED Act 2006, Section 15 & Section 16";
          }
          // Unilateral termination without kill-fee
          else if (textLower.includes("kill fee") || textLower.includes("kill-fee") || (textLower.includes("without cause") && textLower.includes("terminate"))) {
            severity = "high";
            category = "termination";
            plainMeaning = "Permits client to terminate at any time without cause and with zero kill-fee or compensation for work in progress.";
            whyItMatters = "Leaves contractor unpaid for committed resources. Under Section 73 Indian Contract Act, compensation is due for performed milestones.";
            favours = "counterparty";
            matchedKeyword = textLower.includes("kill") ? "kill" : "terminate";
            statuteHint = "Indian Contract Act 1872, Section 73";
          }
          // NDA Residuals carveout
          else if (textLower.includes("residuals") || textLower.includes("unaided memory")) {
            severity = "high";
            category = "confidentiality";
            plainMeaning = "Permits counterparty personnel to utilize retained confidential concepts and know-how to invest in or assist competitors.";
            whyItMatters = "Creates a dangerous loophole that effectively nullifies confidentiality protections for core algorithms and business concepts.";
            favours = "counterparty";
            matchedKeyword = "residuals";
            statuteHint = "Indian Contract Act 1872, Section 27";
          }
          // Unilateral Indemnity / Unlimited Liability
          else if (textLower.includes("indemnify and hold harmless") || textLower.includes("unlimited liability") || textLower.includes("indemnify the company")) {
            severity = "negotiate";
            category = "liability";
            plainMeaning = "Imposes one-sided indemnification obligation with uncapped financial liability on you.";
            whyItMatters = "Exposes you to unlimited third-party damages without reciprocal protection or fault limitation under Section 124 Indian Contract Act.";
            favours = "counterparty";
            matchedKeyword = "indemnify";
            statuteHint = "Indian Contract Act 1872, Section 124";
          }
          // Residential Tenancy lock-in / deposit forfeiture
          else if (textLower.includes("lock-in") || textLower.includes("forfeit") || textLower.includes("liquidated damages")) {
            severity = "high";
            category = "termination";
            plainMeaning = "Imposes heavy forfeiture of deposit or damages upon early termination.";
            whyItMatters = "Section 74 of the Indian Contract Act limits damages to reasonable compensation rather than punitive penalties.";
            favours = "counterparty";
            matchedKeyword = textLower.includes("lock-in") ? "lock-in" : "forfeit";
            statuteHint = "Indian Contract Act 1872, Section 74";
          }
          // High Security Deposit in Lease
          else if (textLower.includes("10 months") || textLower.includes("security deposit") || textLower.includes("months rent as deposit")) {
            severity = "negotiate";
            category = "financial";
            plainMeaning = "Demands an upfront deposit exceeding statutory benchmark recommendations.";
            whyItMatters = "Model Tenancy Act Section 10 contemplates a 2-month cap for residential leases.";
            favours = "counterparty";
            matchedKeyword = "security deposit";
            statuteHint = "Model Tenancy Act 2021, Section 10";
          }
          // Utility cut-off
          else if (textLower.includes("water and electricity") || textLower.includes("cut off") || textLower.includes("disconnect utility")) {
            severity = "high";
            category = "other";
            plainMeaning = "Permits counterparty to cut off essential services like power or water upon dispute.";
            whyItMatters = "Withholding essential services is prohibited under Section 23 of the Model Tenancy Act 2021.";
            favours = "counterparty";
            matchedKeyword = textLower.includes("water") ? "water" : "disconnect";
            statuteHint = "Model Tenancy Act 2021, Section 23";
          }
          // Unannounced entry / Inspection
          else if (textLower.includes("any time without") || textLower.includes("unannounced") || textLower.includes("enter the premises")) {
            severity = "negotiate";
            category = "other";
            plainMeaning = "Allows owner unannounced entry to the premises without advance written notice.";
            whyItMatters = "Model Tenancy Act Section 17 requires at least 24 hours prior written notice before entry.";
            favours = "counterparty";
            matchedKeyword = "premises";
            statuteHint = "Model Tenancy Act 2021, Section 17";
          }

          // Extract verified quotedSpan from clause text
          let quotedSpan = "";
          if (matchedKeyword) {
            const kIdx = clause.text.toLowerCase().indexOf(matchedKeyword);
            if (kIdx !== -1) {
              const start = Math.max(0, kIdx - 10);
              const end = Math.min(clause.text.length, kIdx + matchedKeyword.length + 50);
              quotedSpan = clause.text.slice(start, end).trim();
            }
          }
          if (!quotedSpan) {
            quotedSpan = clause.text.slice(0, Math.min(60, clause.text.length)).trim();
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
      docState: existingDoc,
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
