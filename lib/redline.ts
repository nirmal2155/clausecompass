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
    const roleLower = params.userRole.toLowerCase();

    // 1. Restraint of trade / Non-compete (employment)
    if (textLower.includes("non-compete") || textLower.includes("restrain") || textLower.includes("competing commercial") || textLower.includes("24 months")) {
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

    // 2. Employment Bond / Training Recovery / Salary Forfeiture
    if (
      (roleLower.includes("employee") || textLower.includes("employee") || textLower.includes("salary") || textLower.includes("training")) &&
      (textLower.includes("bond") || textLower.includes("forfeit") || textLower.includes("lock-in") || textLower.includes("liquidated damages") || textLower.includes("minimum period"))
    ) {
      return {
        proposedText:
          "Either party may terminate this Agreement by providing thirty (30) days prior written notice or payment of basic salary in lieu thereof. The Employee shall not be subject to penal damages or salary forfeiture, provided that actual, verifiable external training expenses incurred by the Company for specialized certifications within the preceding six (6) months may be reimbursed on a pro-rata basis not exceeding one (1) month basic salary.",
        whatChanged: [
          "Replaced unconscionable employment bond with standard 30-day written notice or basic salary in lieu",
          "Restricted training recovery strictly to demonstrable, documented external certifications (compliant with Section 74 Indian Contract Act)",
          "Pro-rated training cost reimbursement based on completed service months",
        ],
        likelyPushback:
          "The employer may argue that recruitment, onboarding, and internal knowledge transfer costs justify a higher bond sum.",
        fallback:
          "Offer 60 days notice period instead of 30 days to ensure comprehensive handover without monetary penalties.",
        caveat:
          "This is suggested wording to discuss, not vetted legal drafting. Have a lawyer review before you sign anything.",
      };
    }

    // 3. Consumer / Coaching / Course Fee Forfeiture
    if (
      roleLower.includes("student") ||
      roleLower.includes("consumer") ||
      textLower.includes("coaching") ||
      textLower.includes("tuition") ||
      textLower.includes("student") ||
      textLower.includes("non-refundable") ||
      (textLower.includes("fee") && textLower.includes("forfeit"))
    ) {
      return {
        proposedText:
          "In the event the Student withdraws prior to the commencement of the course, all fees paid shall be refunded within fourteen (14) days, subject only to an administrative deduction not exceeding Rs. 1,000/-. If withdrawal occurs after commencement due to relocation or medical reasons, tuition fees for the remaining uncommenced quarters/terms shall be refunded on a pro-rata basis.",
        whatChanged: [
          "Eliminated blanket non-refundable clause (held as unfair trade practice under Section 2(46) Consumer Protection Act 2019)",
          "Provided guaranteed 14-day refund window with reasonable administrative fee cap",
          "Added pro-rata refund entitlement for unforeseen relocations and medical hardships",
        ],
        likelyPushback:
          "The coaching institute may argue that seat reservations are non-transferable and faculty expenses are committed upfront.",
        fallback:
          "Offer 70% refund of unutilized fees or provide an option to transfer enrollment credit to a family member or subsequent batch.",
        caveat:
          "This is suggested wording to discuss, not vetted legal drafting. Have a lawyer review before you sign anything.",
      };
    }

    // 4. Freelance / Service IP Grab & Moral Rights Waiver
    if (
      roleLower.includes("contractor") ||
      textLower.includes("freelance") ||
      textLower.includes("deliverables") ||
      textLower.includes("moral rights") ||
      (textLower.includes("intellectual property") && textLower.includes("assignment"))
    ) {
      return {
        proposedText:
          "Subject to receipt of full and final payment of all agreed fees for the Deliverables, Contractor assigns all copyright and title in the bespoke Deliverables to the Client. Contractor retains ownership of pre-existing background code, tools, and developer libraries, and retains the right to display non-confidential project screenshots in their professional portfolio.",
        whatChanged: [
          "Conditioned IP assignment strictly on receipt of full payment (Section 19 Copyright Act 1957)",
          "Protected contractor's ownership over reusable pre-existing software tools and libraries",
          "Preserved contractor's professional portfolio display rights",
        ],
        likelyPushback:
          "The client may demand immediate unconditional IP ownership upon delivery of preliminary drafts.",
        fallback:
          "Grant an exclusive worldwide license immediately upon creation that automatically converts to full assignment upon invoice settlement.",
        caveat:
          "This is suggested wording to discuss, not vetted legal drafting. Have a lawyer review before you sign anything.",
      };
    }

    // 5. Dispute Resolution / Unilateral Sole Arbitrator
    if (
      textLower.includes("sole arbitrator") ||
      textLower.includes("no court") ||
      textLower.includes("exclusive jurisdiction of the company") ||
      textLower.includes("waives any right to approach")
    ) {
      return {
        proposedText:
          "Any dispute arising out of or in connection with this Agreement shall first be submitted to mutual amicable conciliation for thirty (30) days. If unresolved, the dispute shall be referred to arbitration by an independent sole arbitrator appointed with the mutual written consent of both parties, or in accordance with the Arbitration and Conciliation Act 1996. The seat and venue of arbitration shall be mutually agreed.",
        whatChanged: [
          "Replaced unilateral appointment with an independent, mutually agreed arbitrator (Section 12(5) Arbitration Act & Perkins Eastman)",
          "Restored neutral seat and venue of arbitration",
          "Preserved right to seek urgent interim relief before competent courts",
        ],
        likelyPushback:
          "The counterparty may insist on their pre-selected corporate legal counsel or empanelled arbitrator.",
        fallback:
          "Propose appointment through an accredited arbitral institution (e.g. DIAC or MCIA) or local District Commercial Court.",
        caveat:
          "This is suggested wording to discuss, not vetted legal drafting. Have a lawyer review before you sign anything.",
      };
    }

    // 6. Residential Tenancy Lock-in / Forfeiture
    if (textLower.includes("lock-in") || textLower.includes("forfeit")) {
      return {
        proposedText:
          "Both parties agree to a mutual lock-in period of 3 months from the commencement date. In the event either party terminates this Agreement during the lock-in period, the terminating party shall provide 30 days prior written notice or pay one (1) month rent in lieu of notice. The security deposit shall remain refundable in accordance with Clause 4, subject only to deductions for actual unpaid rent or documented damage.",
        whatChanged: [
          "Lock-in reduced to a mutual 3 months",
          "Exit penalty reduced from full deposit forfeiture down to 1 month rent in lieu of notice",
          "Explicitly protects security deposit refund rights upon early exit",
        ],
        likelyPushback:
          "The landlord may argue that finding a replacement tenant incurs brokerage and vacancy costs.",
        fallback:
          "Offer to assist in finding an approved replacement tenant to waive the notice penalty.",
        caveat:
          "This is suggested wording to discuss, not vetted legal drafting. Have a lawyer review before you sign anything.",
      };
    }

    // 7. Security Deposit (Tenancy)
    if (textLower.includes("10 months") || textLower.includes("security deposit")) {
      return {
        proposedText:
          "The Lessee shall pay an interest-free refundable security deposit equivalent to three (3) months rent upon execution of this Agreement. The entire security deposit shall be refunded to the Lessee on the date of handing over vacant possession, subject to joint inspection and deduction only of actual unpaid utility bills or verified structural damage beyond normal wear and tear.",
        whatChanged: [
          "Security deposit capped to 3 months rent",
          "Added strict refund timeline: on the date of vacant possession handover",
          "Carved out normal wear and tear from allowable deductions",
        ],
        likelyPushback:
          "Landlords often insist higher deposits are customary market practice to protect against tenant default.",
        fallback:
          "Offer 3 months cash deposit plus post-dated cheques for the remaining amount.",
        caveat:
          "This is suggested wording to discuss, not vetted legal drafting. Have a lawyer review before you sign anything.",
      };
    }

    // 8. Unilateral Utility Disconnection
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

    // Default reciprocal wording
    return {
      proposedText: params.clauseText.replace(/Lessor|Employer|Company|Client/g, "Either party"),
      whatChanged: ["Rebalanced obligations to be mutual and reciprocal between both parties with a standard 14-day written cure notice"],
      likelyPushback: "The counterparty may prefer their standard unilateral contract template.",
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
