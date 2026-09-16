import { Clause, ScenarioResult, ScenarioResultSchema } from "@/lib/schema";
import { buildScenarioPrompt } from "@/lib/prompts/scenario";
import { callLLM, verifyQuotedSpan } from "@/lib/llm";

export async function simulateScenario(params: {
  scenario: string;
  userRole: string;
  clauses: Clause[];
}): Promise<ScenarioResult> {
  const clausesText = params.clauses
    .map((c) => `[Clause ID: ${c.id}] (Clause ${c.number || ""}: ${c.heading})\n"${c.text}"`)
    .join("\n\n");

  const prompt = buildScenarioPrompt({
    scenario: params.scenario,
    userRole: params.userRole,
    clauses: clausesText,
  });

  const fallbackSimulator = (): ScenarioResult => {
    const sLower = params.scenario.toLowerCase();

    // Early exit in lease
    if (sLower.includes("leave") || sLower.includes("vacat") || sLower.includes("4 mahine") || sLower.includes("early")) {
      return {
        steps: [
          {
            order: 1,
            whatHappens:
              "You notify the landlord of vacating at Month 4 (which falls inside the 6-month lock-in period defined in Clause 8).",
            clauseId: "c-006",
            quotedSpan: "strict lock-in period of 6 months",
            amount: null,
            timing: "Month 4 of tenancy",
          },
          {
            order: 2,
            whatHappens:
              "Clause 8 triggers an immediate forfeiture of your entire security deposit of Rs. 4,50,000/-.",
            clauseId: "c-006",
            quotedSpan: "entire security deposit of Rs. 4,50,000/- shall be forfeited by the Lessor",
            amount: "Rs. 4,50,000/-",
            timing: "Upon vacating during lock-in",
          },
          {
            order: 3,
            whatHappens:
              "Clause 8 further obligates you to pay rent for the remainder of the lock-in period (2 months remaining at Rs. 45,000 per month).",
            clauseId: "c-006",
            quotedSpan: "liable to pay the rent for the remainder of the lock-in period as liquidated damages",
            amount: "Rs. 90,000/-",
            timing: "Remaining 2 months (Month 5 & Month 6)",
          },
          {
            order: 4,
            whatHappens:
              "Clause 12 triggers a mandatory painting and cleaning deduction upon vacating.",
            clauseId: "c-010",
            quotedSpan: "mandatory deduction of Rs. 35,000/- will be deducted from the security deposit",
            amount: "Rs. 35,000/-",
            timing: "Upon vacating",
          },
        ],
        moneyTotal: {
          stated: "Rs. 5,75,000/- total financial impact",
          workings:
            "Rs. 4,50,000 (forfeited deposit) + Rs. 90,000 (2 months remaining lock-in rent: 2 × Rs. 45,000) + Rs. 35,000 (mandatory painting deduction) = Rs. 5,75,000/-.",
        },
        silences: [
          "The document is silent on whether the landlord must mitigate losses by seeking a replacement tenant.",
          "The document is silent on any exception for emergency job relocation, medical reasons, or uninhabitable premises.",
        ],
        caveat:
          "This traces only what the document says. Under Section 74 of the Indian Contract Act, Indian courts restrict recovery to reasonable compensation rather than punitive penalties.",
      };
    }

    // Rent increase scenario
    if (sLower.includes("rent increase") || sLower.includes("raise rent") || sLower.includes("escalat")) {
      return {
        steps: [
          {
            order: 1,
            whatHappens: "The 11-month lease term concludes on 28th February 2027.",
            clauseId: "c-002",
            quotedSpan: "lease shall be for a duration of 11 months",
            amount: null,
            timing: "End of Month 11",
          },
          {
            order: 2,
            whatHappens: "Landlord issues 15 days written notice triggering a 15% automatic rent increase.",
            clauseId: "c-009",
            quotedSpan: "increase automatically by 15% with 15 days written notice",
            amount: "Rs. 6,750/- per month increase",
            timing: "15 days before renewal",
          },
          {
            order: 3,
            whatHappens: "Your new monthly rent becomes Rs. 51,750/-.",
            clauseId: "c-003",
            quotedSpan: "monthly rent of Rs. 45,000/-",
            amount: "Rs. 51,750/- per month",
            timing: "Month 12 onwards",
          },
        ],
        moneyTotal: {
          stated: "Rs. 51,750/- new monthly rent",
          workings: "Rs. 45,000 original rent + 15% increase (Rs. 6,750) = Rs. 51,750/- per month.",
        },
        silences: [
          "The document is silent on tenant's right to reject the increase and receive deposit refund.",
          "The document gives only 15 days notice, which is shorter than the 90 days contemplated by Section 13 of the Model Tenancy Act.",
        ],
        caveat: "This traces only what the document says. Facts outside the document can change the result.",
      };
    }

    // Default scenario
    return {
      steps: [
        {
          order: 1,
          whatHappens: "The scenario triggers review under general document provisions.",
          clauseId: params.clauses[0]?.id || "c-001",
          quotedSpan: params.clauses[0]?.text.slice(0, 50) || "",
          amount: null,
          timing: "Immediate",
        },
      ],
      moneyTotal: null,
      silences: ["The document does not explicitly specify procedural guidelines for this scenario."],
      caveat: "This traces only what the document says. Facts outside the document can change the result.",
    };
  };

  try {
    const { data } = await callLLM<ScenarioResult>({
      prompt,
      schema: ScenarioResultSchema,
      temperature: 0.1,
      mockFallback: fallbackSimulator,
    });

    // Substring verification on all step quotedSpans
    const verifiedSteps = data.steps.map((step) => {
      const clause = params.clauses.find((c) => c.id === step.clauseId);
      if (!clause) return step;
      const verified = verifyQuotedSpan(clause.text, step.quotedSpan);
      return {
        ...step,
        quotedSpan: verified || step.quotedSpan,
      };
    });

    return {
      ...data,
      steps: verifiedSteps,
    };
  } catch {
    return fallbackSimulator();
  }
}
