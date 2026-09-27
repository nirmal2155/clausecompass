import { NextRequest, NextResponse } from "next/server";
import { getCachedDocument } from "@/lib/cache";
import { retrieveClauses, retrieveStatutes } from "@/lib/retrieval";
import { buildGroundedAskPrompt } from "@/lib/prompts/ask";
import { callLLM, verifyQuotedSpan } from "@/lib/llm";
import { enforceGuardrail } from "@/lib/guardrail";
import { GroundedAnswer, GroundedAnswerSchema } from "@/lib/schema";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { documentId, question, history, clauses: clientClauses } = body;

    if (!question || typeof question !== "string") {
      return NextResponse.json({ error: "Question is required" }, { status: 400 });
    }

    const existingDoc = documentId ? getCachedDocument(documentId) : null;
    const allClauses = clientClauses || existingDoc?.clauses || [];

    // Hybrid retrieval: retrieve top 4 closest clauses + top 3 Indian statute passages
    const matchedClauses = retrieveClauses(allClauses, question, 4);
    const matchedStatutes = retrieveStatutes(question, 3);

    const clauseContext =
      matchedClauses.length > 0
        ? matchedClauses
            .map((c) => `[Clause ID: ${c.id}] (Clause ${c.number || "unnumbered"}: ${c.heading})\n"${c.text}"`)
            .join("\n\n")
        : "No matching clauses found in document.";

    const statuteContext =
      matchedStatutes.length > 0
        ? matchedStatutes
            .map((s) => `[Statute: ${s.act} - ${s.section}: ${s.title}]\n"${s.gist}"`)
            .join("\n\n")
        : "No specific statutory passage matched.";

    const prompt = buildGroundedAskPrompt({
      clauseContext,
      statuteContext,
      history: history || "",
      question,
    });

    // Fallback deterministic grounded answer for offline demo
    const fallbackAnswer = (): GroundedAnswer => {
      const qLower = question.toLowerCase();

      // Check for out-of-scope question (e.g. "pet policy" or "parking space" not in doc)
      if (
        (qLower.includes("pet") || qLower.includes("dog") || qLower.includes("cat")) &&
        !allClauses.some((c: any) => c.text.toLowerCase().includes("pet"))
      ) {
        return {
          answer: "This document does not address pets or pet policy. There is no clause restricting or permitting pets on the premises. If pet permissions are critical for your tenancy, ask the landlord to include an explicit written clause before signing.",
          answerFound: false,
          citations: [],
          statuteRefs: [],
          groundingType: "none",
        };
      }

      // Check for exit / resignation / leave / vacate question
      const isExitQuestion =
        qLower.includes("4 mahine") ||
        qLower.includes("leave") ||
        qLower.includes("vacate") ||
        qLower.includes("resign") ||
        qLower.includes("lock-in") ||
        qLower.includes("chhod") ||
        qLower.includes("exit") ||
        qLower.includes("quit");

      if (isExitQuestion) {
        const exitClause =
          allClauses.find((c: any) => {
            const t = `${c.heading || ""} ${c.text || ""}`.toLowerCase();
            return (
              t.includes("lock-in") ||
              t.includes("bond") ||
              t.includes("training") ||
              t.includes("resignation") ||
              t.includes("notice") ||
              t.includes("terminat")
            );
          }) || matchedClauses[0];

        if (exitClause) {
          const span = exitClause.text.slice(0, Math.min(70, exitClause.text.length)).trim();
          const tLower = exitClause.text.toLowerCase();

          let answer = `According to Clause ${exitClause.number || exitClause.heading || exitClause.id}, the agreement specifies: "${span}...".`;
          const statuteRefs: { act: string; section: string; relevance: string }[] = [];

          if (tLower.includes("bond") || tLower.includes("training") || tLower.includes("liquidated damages")) {
            answer = `If you resign or leave early, Clause ${exitClause.number || exitClause.heading || exitClause.id} states: "${span}...". While the document seeks bond recovery, under Section 74 of the Indian Contract Act 1872, Indian courts (Niranjan Shankar Golikari, Kailash Nath) restrict employers strictly to actual, proven training expenses rather than penal bond sums.`;
            statuteRefs.push({ act: "Indian Contract Act, 1872", section: "Section 74", relevance: "Limits damages to reasonable compensation for actual proven loss" });
            statuteRefs.push({ act: "Indian Contract Act, 1872", section: "Section 27", relevance: "Agreements in restraint of trade are void ab initio" });
          } else if (tLower.includes("lock-in") || tLower.includes("forfeit")) {
            answer = `If you vacate early, Clause ${exitClause.number || exitClause.heading || exitClause.id} states: "${span}...". The agreement contemplates forfeiture or damages; however, under Section 74 of the Indian Contract Act 1872, damages are legally restricted to actual demonstrable losses rather than punitive forfeitures.`;
            statuteRefs.push({ act: "Indian Contract Act, 1872", section: "Section 74", relevance: "Prohibits extortionate penalties beyond reasonable compensation" });
            statuteRefs.push({ act: "Model Tenancy Act, 2021", section: "Section 22", relevance: "Notice periods and early exit guidelines" });
          } else if (tLower.includes("non-refundable") || tLower.includes("refund")) {
            answer = `Regarding cancellation or withdrawal, Clause ${exitClause.number || exitClause.heading || exitClause.id} states: "${span}...". Under Section 2(46) of the Consumer Protection Act 2019, arbitrary 100% non-refundable fee retention can be challenged as an unfair contract term before Consumer Commissions.`;
            statuteRefs.push({ act: "Consumer Protection Act, 2019", section: "Section 2(46)", relevance: "Unfair contract terms imposing unreasonable detriment" });
          }

          return {
            answer,
            answerFound: true,
            citations: [{ clauseId: exitClause.id, quotedSpan: span, verified: true }],
            statuteRefs: statuteRefs.length > 0 ? statuteRefs : matchedStatutes.map((s) => ({ act: s.act, section: s.section, relevance: s.gist.slice(0, 80) })),
            groundingType: "document",
          };
        }
      }

      // Default contextual answer based on matched clause
      if (matchedClauses.length > 0) {
        const primary = matchedClauses[0];
        const span = primary.text.slice(0, Math.min(60, primary.text.length));
        return {
          answer: `According to Clause ${primary.number || primary.id} (${primary.heading}), the agreement specifies: "${span}...". This governs the rights and duties of the parties on this point.`,
          answerFound: true,
          citations: [{ clauseId: primary.id, quotedSpan: span, verified: true }],
          statuteRefs: matchedStatutes.map((s) => ({ act: s.act, section: s.section, relevance: s.gist.slice(0, 80) })),
          groundingType: "document",
        };
      }

      return {
        answer: "This document does not contain any clause or provision addressing this subject. You may wish to consult a qualified lawyer to understand standard rights or protections under Indian law.",
        answerFound: false,
        citations: [],
        statuteRefs: [],
        groundingType: "none",
      };
    };

    const { data } = await callLLM<GroundedAnswer>({
      prompt,
      schema: GroundedAnswerSchema,
      temperature: 0.3,
      mockFallback: fallbackAnswer,
    });

    // Verify all quoted spans against actual clauses
    const verifiedCitations = (data.citations || [])
      .map((cit) => {
        const clause = allClauses.find((c: any) => c.id === cit.clauseId);
        if (!clause) return null;
        const verified = verifyQuotedSpan(clause.text, cit.quotedSpan);
        if (!verified) return null;
        return {
          clauseId: cit.clauseId,
          quotedSpan: verified,
          verified: true,
        };
      })
      .filter((c): c is { clauseId: string; quotedSpan: string; verified: boolean } => c !== null);

    // Run Post-Hoc Guardrail Check (Lever 1)
    const guardrailCheck = await enforceGuardrail(data.answer);
    let finalAnswer = data.answer;
    let guardrailTriggered = false;

    if (guardrailCheck.verdict === "rewrite" && guardrailCheck.rewritten) {
      finalAnswer = guardrailCheck.rewritten;
      guardrailTriggered = true;
    }

    const responsePayload: GroundedAnswer = {
      answer: finalAnswer,
      answerFound: data.answerFound,
      citations: verifiedCitations,
      statuteRefs: data.statuteRefs || [],
      groundingType: data.groundingType || "document",
      guardrailTriggered,
      originalDraft: guardrailTriggered ? data.answer : undefined,
      escalateWarning: guardrailCheck.needsLawyer
        ? "This inquiry involves matters that require direct legal representation (e.g. criminal or statutory bar)."
        : undefined,
    };

    return NextResponse.json(responsePayload);
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Ask error:", err);
    return NextResponse.json(
      { error: "Failed to answer question: " + (err.message || "Unknown error") },
      { status: 500 }
    );
  }
}
