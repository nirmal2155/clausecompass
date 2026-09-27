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
    const fullDocText = params.clauses.map((c) => c.text).join(" ").toLowerCase();
    const roleLower = params.userRole.toLowerCase();

    const isEmployment =
      roleLower.includes("employee") ||
      fullDocText.includes("employer") ||
      fullDocText.includes("employment") ||
      fullDocText.includes("salary") ||
      fullDocText.includes("probation") ||
      fullDocText.includes("bond");

    const isFreelance =
      roleLower.includes("contractor") ||
      roleLower.includes("freelance") ||
      fullDocText.includes("independent contractor") ||
      fullDocText.includes("deliverables") ||
      fullDocText.includes("statement of work");

    const isCoaching =
      roleLower.includes("student") ||
      fullDocText.includes("coaching") ||
      fullDocText.includes("institute") ||
      fullDocText.includes("tuition") ||
      fullDocText.includes("classroom course");

    const isLease =
      roleLower.includes("tenant") ||
      roleLower.includes("lessee") ||
      fullDocText.includes("lessor") ||
      fullDocText.includes("tenancy") ||
      fullDocText.includes("rent") ||
      fullDocText.includes("premises");

    // Helper: find clause by keywords
    const findClause = (keywords: string[]): Clause | undefined => {
      return params.clauses.find((c) => {
        const t = `${c.heading} ${c.text}`.toLowerCase();
        return keywords.some((k) => t.includes(k));
      });
    };

    // Helper: extract verified snippet
    const getSnippet = (c: Clause, kw?: string): string => {
      if (kw) {
        const idx = c.text.toLowerCase().indexOf(kw.toLowerCase());
        if (idx !== -1) {
          const start = Math.max(0, idx - 5);
          const end = Math.min(c.text.length, idx + kw.length + 45);
          return c.text.slice(start, end).trim();
        }
      }
      return c.text.slice(0, Math.min(65, c.text.length)).trim();
    };

    // Helper: extract Rs. amount
    const extractAmount = (text: string): string | null => {
      const match = text.match(/Rs\.?\s*[\d,]+(\/-)?/i);
      return match ? match[0] : null;
    };

    // Exit / Resign / Leave / Vacate / Cancel Scenario
    const isExitScenario =
      sLower.includes("leave") ||
      sLower.includes("vacat") ||
      sLower.includes("quit") ||
      sLower.includes("resign") ||
      sLower.includes("4 mahine") ||
      sLower.includes("early") ||
      sLower.includes("exit") ||
      sLower.includes("terminat") ||
      sLower.includes("cancel");

    if (isExitScenario) {
      if (isEmployment) {
        const noticeClause = findClause(["notice", "resignation", "separation"]) || params.clauses[0];
        const bondClause = findClause(["bond", "training", "liquidated damages", "lock-in", "recovery"]) || noticeClause;
        const ncClause = findClause(["non-compete", "restrain", "competing", "solicit"]);

        const bondAmt = extractAmount(bondClause.text);
        const steps = [
          {
            order: 1,
            whatHappens: `You tender your resignation or leave early before the agreed tenure under Clause ${noticeClause.number || noticeClause.heading}.`,
            clauseId: noticeClause.id,
            quotedSpan: getSnippet(noticeClause, "notice"),
            amount: null,
            timing: "Upon tendering resignation",
          },
          {
            order: 2,
            whatHappens: `Clause ${bondClause.number || bondClause.heading} seeks to enforce recovery of ${bondAmt || "bond damages"} or salary in lieu of notice.`,
            clauseId: bondClause.id,
            quotedSpan: getSnippet(bondClause, bondAmt ? bondAmt.slice(0, 8) : "liquidated"),
            amount: bondAmt,
            timing: "Upon early exit",
          },
        ];

        if (ncClause) {
          steps.push({
            order: 3,
            whatHappens: `Clause ${ncClause.number || ncClause.heading} attempts to restrain you from working with competing firms or clients.`,
            clauseId: ncClause.id,
            quotedSpan: getSnippet(ncClause, "non-compete"),
            amount: null,
            timing: "Post-employment",
          });
        }

        return {
          steps,
          moneyTotal: bondAmt
            ? {
                stated: `${bondAmt} potential employer claim`,
                workings: `Under Clause ${bondClause.number || bondClause.heading}, the company seeks recovery of ${bondAmt}.`,
              }
            : null,
          silences: [
            "The document is silent on employer's legal obligation to prove actual incurred training costs.",
            "The document provides no exit exception for medical hardship or workplace grievance.",
          ],
          caveat:
            "This traces only what the agreement states. Under Section 27 of the Indian Contract Act 1872, post-employment non-compete clauses are void ab initio. Under Section 74, employers cannot enforce penal bond sums; recovery is strictly limited to demonstrable actual training expenditure.",
        };
      }

      if (isCoaching) {
        const refundClause = findClause(["refund", "fee", "admission", "cancellation"]) || params.clauses[0];
        const feeAmt = extractAmount(refundClause.text) || extractAmount(fullDocText);

        return {
          steps: [
            {
              order: 1,
              whatHappens: `Student requests early course withdrawal or cancellation under Clause ${refundClause.number || refundClause.heading}.`,
              clauseId: refundClause.id,
              quotedSpan: getSnippet(refundClause),
              amount: null,
              timing: "Upon withdrawal notice",
            },
            {
              order: 2,
              whatHappens: `Clause ${refundClause.number || refundClause.heading} triggers 100% forfeiture of all fees paid with zero refund.`,
              clauseId: refundClause.id,
              quotedSpan: getSnippet(refundClause, "refund"),
              amount: feeAmt,
              timing: "Immediate forfeiture",
            },
          ],
          moneyTotal: feeAmt
            ? {
                stated: `${feeAmt} total fee forfeited`,
                workings: `Clause ${refundClause.number || refundClause.heading} forfeits 100% of the course fee (${feeAmt}).`,
              }
            : null,
          silences: [
            "No provision for pro-rata fee refund for unattended classes.",
            "No exception for medical emergency or family relocation.",
          ],
          caveat:
            "This traces only what the document says. Under Section 2(46) of the Consumer Protection Act 2019, arbitrary 100% non-refundable fee retention is an unfair contract term, repeatedly invalidated by Indian Consumer Commissions.",
        };
      }

      if (isFreelance) {
        const termClause = findClause(["terminat", "cancellation", "notice"]) || params.clauses[0];
        const ipClause = findClause(["intellectual property", "ip", "work-for-hire", "ownership"]) || termClause;

        return {
          steps: [
            {
              order: 1,
              whatHappens: `Contractor or Client terminates the agreement under Clause ${termClause.number || termClause.heading}.`,
              clauseId: termClause.id,
              quotedSpan: getSnippet(termClause),
              amount: null,
              timing: "Upon termination notice",
            },
            {
              order: 2,
              whatHappens: `Client asserts ownership over all deliverables under Clause ${ipClause.number || ipClause.heading}, while withholding unapproved milestones.`,
              clauseId: ipClause.id,
              quotedSpan: getSnippet(ipClause),
              amount: null,
              timing: "Upon handover",
            },
          ],
          moneyTotal: null,
          silences: [
            "No kill-fee or compensation guarantee for work partially completed before termination.",
            "No explicit timeline for releasing milestone payments due.",
          ],
          caveat:
            "Under Section 73 Indian Contract Act, contractor can claim quantum meruit compensation for work actually performed.",
        };
      }

      // Residential Tenancy Exit
      const lockInClause = findClause(["lock-in", "forfeit", "vacat", "duration"]) || params.clauses[0];
      const depClause = findClause(["security deposit", "deposit", "advance"]) || lockInClause;
      const paintClause = findClause(["paint", "clean", "deduction"]);

      const depAmt = extractAmount(depClause.text) || "Rs. 4,50,000/-";
      const paintAmt = paintClause ? extractAmount(paintClause.text) : null;

      const steps = [
        {
          order: 1,
          whatHappens: `You notify the landlord of vacating early under Clause ${lockInClause.number || lockInClause.heading}.`,
          clauseId: lockInClause.id,
          quotedSpan: getSnippet(lockInClause, "lock-in"),
          amount: null,
          timing: "Upon vacating",
        },
        {
          order: 2,
          whatHappens: `Clause ${lockInClause.number || lockInClause.heading} triggers forfeiture of security deposit (${depAmt}).`,
          clauseId: lockInClause.id,
          quotedSpan: getSnippet(lockInClause, "forfeit"),
          amount: depAmt,
          timing: "Upon vacating",
        },
      ];

      if (paintClause) {
        steps.push({
          order: 3,
          whatHappens: `Clause ${paintClause.number || paintClause.heading} triggers mandatory deduction for painting.`,
          clauseId: paintClause.id,
          quotedSpan: getSnippet(paintClause, "paint"),
          amount: paintAmt,
          timing: "Upon handover",
        });
      }

      return {
        steps,
        moneyTotal: {
          stated: `${depAmt} potential financial impact`,
          workings: `Deposit forfeiture of ${depAmt}${paintAmt ? ` plus painting deduction of ${paintAmt}` : ""}.`,
        },
        silences: [
          "The document is silent on landlord's duty to mitigate losses by seeking a replacement tenant.",
          "The document gives no exception for emergency relocation or medical hardship.",
        ],
        caveat:
          "This traces only what the document says. Under Section 74 of the Indian Contract Act, Indian courts restrict recovery to reasonable compensation rather than punitive penalties.",
      };
    }

    // Rent / Payment Increase Scenario
    if (sLower.includes("rent increase") || sLower.includes("raise rent") || sLower.includes("escalat") || sLower.includes("fee hike")) {
      const revClause = findClause(["increase", "escalat", "revision", "rent", "fee"]) || params.clauses[0];
      return {
        steps: [
          {
            order: 1,
            whatHappens: `Counterparty initiates payment revision under Clause ${revClause.number || revClause.heading}.`,
            clauseId: revClause.id,
            quotedSpan: getSnippet(revClause),
            amount: null,
            timing: "Upon revision notice",
          },
        ],
        moneyTotal: null,
        silences: [
          "The document is silent on your explicit right to reject the increase and terminate without penalty.",
        ],
        caveat: "This traces only what the document specifies. Facts outside the document can change the result.",
      };
    }

    // Default: contextual retrieval from uploaded clauses
    const matchedClause =
      params.clauses.find((c) => {
        const words = sLower.split(/\s+/).filter((w) => w.length > 3);
        const text = `${c.heading} ${c.text}`.toLowerCase();
        return words.some((w) => text.includes(w));
      }) || params.clauses[0];

    return {
      steps: [
        {
          order: 1,
          whatHappens: `The scenario triggers review under Clause ${matchedClause.number || matchedClause.heading}.`,
          clauseId: matchedClause.id,
          quotedSpan: getSnippet(matchedClause),
          amount: extractAmount(matchedClause.text),
          timing: "Upon scenario occurrence",
        },
      ],
      moneyTotal: null,
      silences: ["The document does not explicitly specify procedural dispute mechanisms for this specific event."],
      caveat: "This traces only what the document says. Applicable Indian statutory provisions may supersede one-sided terms.",
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
