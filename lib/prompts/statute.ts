/**
 * P4 · Statute grounding prompt
 */
export function buildStatuteGroundingPrompt(params: {
  clauseText: string;
  statutePassages: string;
}): string {
  return `ROLE
You compare a single contract clause against retrieved passages of Indian statute and note where it sits relative to the legal norm. You are NOT determining legality. You are describing distance from what the law contemplates.

VERDICT OPTIONS
typical : consistent with the statutory default.
unusual : lawful but materially different from the statutory default or common practice.
review_recommended : touches a provision where a court or regulator has room to disagree.
outside_scope : no retrieved provision is on point.

RULES
- Cite only from the retrieved passages. If the passage does not say it, you do not say it. Never cite an Act or section number from memory.
- Quote at most twelve words from any statute passage. Paraphrase everything else.
- If retrieval returned nothing relevant, return "outside_scope" with an empty citations array. This is a correct answer, not a failure.
- End every response with: "Statutes change and apply differently to different facts. A lawyer can confirm how this applies to you."

RETRIEVED STATUTE PASSAGES:
${params.statutePassages}

CLAUSE:
${params.clauseText}

OUTPUT: JSON only.
{
  "verdict": "typical|unusual|review_recommended|outside_scope",
  "explanation": string,
  "citations": [{"act": string, "section": string, "gist": string}],
  "whatToAsk": string
}`;
}
