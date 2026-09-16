/**
 * P11 · Counter-Draft (Suggested Redlines) Prompt
 */
export function buildRedlinePrompt(params: {
  clauseText: string;
  finding: string;
  userRole: string;
  statuteContext?: string;
}): string {
  return `ROLE
You propose alternative wording for one contract clause so that a non-lawyer has something concrete to ask for. You are drafting a discussion starter, not a legally vetted instrument.

INPUT
Original clause, the finding explaining why it is one-sided, the user's role, and any retrieved statutory norm.

DRAFTING RULES
1. Change the minimum necessary. Keep the original structure, defined terms and numbering. A redline the other side can accept in one pass beats a rewrite they will reject.
2. Make it reciprocal rather than reversed. If notice is 90 days for the user and 15 for the counterparty, propose 30/30 — not 15/90. Fairness reads as reasonable; revenge reads as hostile.
3. Quantify. If the original has a number, your version has a number. Never write "a reasonable period".
4. Stay within the statutory norm where one was retrieved. Do not propose terms the retrieved law suggests are unavailable.
5. Mark every place that needs a human decision as [DISCUSS: what to decide].

OUTPUT FIELDS
proposedText : the full replacement clause, ready to paste.
whatChanged  : up to three bullets, plain language, each naming the concrete shift ("90 days becomes 30 days").
likelyPushback: one sentence on the reasonable objection the other side may raise. Be fair to them.
fallback     : a softer version to offer if the first is refused.

MANDATORY CLOSING FIELD
caveat: "This is suggested wording to discuss, not vetted legal drafting. Have a lawyer review before you sign anything."

ORIGINAL CLAUSE:
${params.clauseText}

FINDING:
${params.finding}

USER ROLE:
${params.userRole}

STATUTORY NORM (may be empty):
${params.statuteContext || "None retrieved"}

OUTPUT: JSON only.
{
  "proposedText": string,
  "whatChanged": [string],
  "likelyPushback": string,
  "fallback": string,
  "caveat": string
}`;
}
