import { NextRequest, NextResponse } from "next/server";
import { buildComparePrompt } from "@/lib/prompts/compare";
import { callLLM } from "@/lib/llm";
import { CompareResult, CompareResultSchema } from "@/lib/schema";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { docA, docB } = body;

    const aClauses = docA?.clauses || [];
    const bClauses = docB?.clauses || [];

    if (aClauses.length === 0 || bClauses.length === 0) {
      return NextResponse.json({ error: "Both Document A and Document B must contain clauses" }, { status: 400 });
    }

    const aText = aClauses.map((c: any) => `[ID: ${c.id}] Clause ${c.number || ""}: ${c.heading} - ${c.text}`).join("\n\n");
    const bText = bClauses.map((c: any) => `[ID: ${c.id}] Clause ${c.number || ""}: ${c.heading} - ${c.text}`).join("\n\n");

    const prompt = buildComparePrompt({
      aClauses: aText,
      bClauses: bText,
    });

    const fallbackCompare = (): CompareResult => {
      return {
        headline: "Notice period tripled from 30 to 90 days and security deposit slashed from 10 months to 3 months.",
        deltas: [
          {
            changeType: "weakened",
            clauseA: "c-006",
            clauseB: "c-v2-008",
            plainDelta: "Lock-in period reduced from 6 months to 3 months, and exit forfeiture changed from full deposit loss to only 1 month rent in lieu of notice.",
            impactOn: "you",
            materiality: "high",
          },
          {
            changeType: "weakened",
            clauseA: "c-004",
            clauseB: "c-v2-004",
            plainDelta: "Security deposit reduced from Rs. 4,50,000 (10 months rent) down to Rs. 1,35,000 (3 months rent).",
            impactOn: "you",
            materiality: "high",
          },
          {
            changeType: "strengthened",
            clauseA: "c-007",
            clauseB: "c-v2-009",
            plainDelta: "Notice period required for termination increased from 30 days to 90 days.",
            impactOn: "counterparty",
            materiality: "high",
          },
          {
            changeType: "scope_changed",
            clauseA: "c-008",
            clauseB: "c-v2-010",
            plainDelta: "Landlord unannounced inspection replaced with requirement of 24 hours prior written notice.",
            impactOn: "you",
            materiality: "medium",
          },
          {
            changeType: "weakened",
            clauseA: "c-010",
            clauseB: "c-v2-012",
            plainDelta: "Mandatory Rs. 35,000 painting deduction capped to actual invoices up to maximum Rs. 10,000.",
            impactOn: "you",
            materiality: "medium",
          },
          {
            changeType: "scope_changed",
            clauseA: "c-012",
            clauseB: "c-v2-014",
            plainDelta: "Unilateral arbitrator clause replaced with jurisdiction of competent Courts and Rent Authorities in Bangalore.",
            impactOn: "you",
            materiality: "high",
          },
        ],
      };
    };

    const { data } = await callLLM<CompareResult>({
      prompt,
      schema: CompareResultSchema,
      temperature: 0.1,
      mockFallback: fallbackCompare,
    });

    // Sort deltas by materiality: high first, then medium, then low
    const materialityWeight = { high: 3, medium: 2, low: 1 };
    data.deltas.sort((a, b) => materialityWeight[b.materiality] - materialityWeight[a.materiality]);

    return NextResponse.json(data);
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Compare error:", err);
    return NextResponse.json(
      { error: "Failed to compare documents: " + (err.message || "Unknown error") },
      { status: 500 }
    );
  }
}
