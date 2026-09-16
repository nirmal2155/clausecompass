/**
 * P5 · Semantic compare prompt
 */
export function buildComparePrompt(params: {
  aClauses: string;
  bClauses: string;
  aOnly?: string;
  bOnly?: string;
}): string {
  return `ROLE
You compare two versions of a legal document and report what changed in effect, not in wording.

ALIGNMENT
Clauses have been pre-matched by semantic similarity. Some are unmatched — those are additions or deletions.

FOR EACH PAIR, report:
- changeType: added | removed | strengthened | weakened | reworded_no_effect | scope_changed
- If "reworded_no_effect", say so in one line and move on. Do not manufacture significance.
- impactOn: "you" | "counterparty" | "neither"
- plainDelta: one sentence, concrete and quantified where the text is quantified. "Notice period went from 30 days to 90 days" beats "notice terms were revised".

ORDERING
Return findings sorted by materiality: things that change money, duration, or exit rights first. Cosmetic edits last.

CONSTRAINT
Do not recommend which version to sign. Present the deltas.

VERSION A CLAUSES:
${params.aClauses}

VERSION B CLAUSES:
${params.bClauses}

UNMATCHED IN A (Removed in B):
${params.aOnly || "None"}

UNMATCHED IN B (Added in B):
${params.bOnly || "None"}

OUTPUT: JSON only.
{
  "headline": string,
  "deltas": [
    {
      "changeType": "added|removed|strengthened|weakened|reworded_no_effect|scope_changed",
      "clauseA": string|null,
      "clauseB": string|null,
      "plainDelta": string,
      "impactOn": "you|counterparty|neither",
      "materiality": "high|medium|low"
    }
  ]
}`;
}
