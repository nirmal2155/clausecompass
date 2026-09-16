import { buildRedlinePrompt } from "@/lib/prompts/redline";
import { callLLM } from "@/lib/llm";
import { enforceGuardrail } from "@/lib/guardrail";
import { RedlineProposal, RedlineProposalSchema, RiskFinding } from "@/lib/schema";

export async function generateCounterDraft(params: {
  clauseText: string;
  finding: RiskFinding;
  userRole: string;
  statuteContext?: string;
}): Promise<RedlineProposal> {
  const prompt = buildRedlinePrompt({
    clauseText: params.clauseText,
    finding: `${params.finding.plainMeaning} (Why it matters: ${params.finding.whyItMatters})`,
    userRole: params.userRole,
    statuteContext: params.statuteContext || params.finding.statuteHint,
  });

  const fallbackRedline = (): RedlineProposal => {
    const textLower = params.clauseText.toLowerCase();

    // Lock-in / forfeiture clause
    if (textLower.includes("lock-in") || textLower.includes("forfeit")) {
      return {
        proposedText:
          "Both parties agree to a mutual lock-in period of 3 months from the commencement date. In the event either party terminates this Agreement during the lock-in period, the terminating party shall provide 30 days prior written notice or pay one (1) month rent in lieu of notice. The security deposit shall remain refundable in accordance with Clause 4, subject only to deductions for actual unpaid rent or documented damage.",
        whatChanged: [
          "Lock-in reduced from 6 months to a mutual 3 months",
          "Exit penalty reduced from full Rs. 4,50,000 forfeiture down to 1 month rent in lieu of notice",
          "Explicitly protects security deposit refund rights upon early exit",
        ],
        likelyPushback:
          "The landlord may argue that finding a replacement tenant within 1 month incurs brokerage and vacancy costs.",
        fallback:
          "Offer a 4-month lock-in period with 2 months rent penalty, or offer to assist in finding an approved replacement tenant to waive the penalty.",
        caveat:
          "This is suggested wording to discuss, not vetted legal drafting. Have a lawyer review before you sign anything.",
      };
    }

    // Security deposit clause
    if (textLower.includes("10 months") || textLower.includes("security deposit")) {
      return {
        proposedText:
          "The Lessee shall pay an interest-free refundable security deposit of Rs. 1,35,000/- (equivalent to three (3) months rent) upon execution of this Agreement. The entire security deposit shall be refunded to the Lessee on the date of handing over vacant possession, subject to joint inspection and deduction only of actual unpaid utility bills or verified structural damage beyond normal wear and tear.",
        whatChanged: [
          "Security deposit reduced from 10 months (Rs. 4,50,000) to 3 months (Rs. 1,35,000)",
          "Added strict refund timeline: on the date of vacant possession handover",
          "Carved out normal wear and tear from allowable deductions",
        ],
        likelyPushback:
          "In Bangalore, landlords often insist 10 months is customary market practice to protect against tenant default.",
        fallback:
          "Offer 4 months deposit (Rs. 1,80,000) or offer 3 months cash deposit plus post-dated cheques for the remaining amount.",
        caveat:
          "This is suggested wording to discuss, not vetted legal drafting. Have a lawyer review before you sign anything.",
      };
    }

    // Unilateral utility cut-off
    if (textLower.includes("cut off") || textLower.includes("water and electricity")) {
      return {
        proposedText:
          "In the event of rent delay exceeding 10 days, the Lessor shall issue a written cure notice granting the Lessee seven (7) days to remedy the default. The Lessor covenants that essential utilities, including water and electricity, shall not be interrupted or disconnected at any time during the tenancy.",
        whatChanged: [
          "Replaces summary utility shut-off with a mandatory 7-day written cure notice",
          "Explicitly guarantees uninterrupted water and electricity in compliance with Section 23 of the Model Tenancy Act",
        ],
        likelyPushback:
          "The landlord may worry that habitual defaulters will accumulate utility bills without immediate leverage.",
        fallback:
          "Agree to pay a modest late interest fee (e.g. 1% per month on overdue rent) in exchange for removing utility disconnection entirely.",
        caveat:
          "This is suggested wording to discuss, not vetted legal drafting. Have a lawyer review before you sign anything.",
      };
    }

    // Non-compete (employment)
    if (textLower.includes("non-compete") || textLower.includes("24 months")) {
      return {
        proposedText:
          "During the period of employment, the Employee shall devote their professional time to the Company and shall not engage in competing commercial employment. Following termination of employment, the Employee agrees to strictly maintain the confidentiality of Company Proprietary Information and covenants not to solicit existing Company clients for a period of six (6) months.",
        whatChanged: [
          "Removed post-employment blanket non-compete (which is void under Section 27 of the Indian Contract Act)",
          "Replaced with lawful post-employment non-solicitation and strict non-disclosure protections",
        ],
        likelyPushback:
          "The employer may claim that proprietary customer trade secrets require broader competitive restrictions.",
        fallback:
          "Offer a narrowly defined 6-month non-solicitation of direct account clients, emphasizing that trade secret confidentiality remains perpetual.",
        caveat:
          "This is suggested wording to discuss, not vetted legal drafting. Have a lawyer review before you sign anything.",
      };
    }

    // Default reciprocal wording
    return {
      proposedText: params.clauseText.replace(/Lessor|Employer|Company/g, "Either party"),
      whatChanged: ["Rebalanced obligations to be mutual and reciprocal between both parties"],
      likelyPushback: "The counterparty may prefer their standard company or landlord template.",
      fallback: "Propose a reasonable notice period before the obligation is triggered.",
      caveat:
        "This is suggested wording to discuss, not vetted legal drafting. Have a lawyer review before you sign anything.",
    };
  };

  try {
    const { data } = await callLLM<RedlineProposal>({
      prompt,
      schema: RedlineProposalSchema,
      temperature: 0.2,
      mockFallback: fallbackRedline,
    });

    // Run post-hoc guardrail check on the proposed text and explanation
    const guardrail = await enforceGuardrail(data.proposedText);
    if (guardrail.verdict === "rewrite" && guardrail.rewritten) {
      data.proposedText = guardrail.rewritten;
    }

    return data;
  } catch {
    return fallbackRedline();
  }
}
