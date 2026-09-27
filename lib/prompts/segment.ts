/**
 * P1 · Clause segmentation prompt
 */
export function buildSegmentationPrompt(pageTextWithLines: string, pageNumber: number = 1): string {
  return `You are a legal document structuring engine. You do not interpret, advise, or summarise. You only segment.

INPUT: raw extracted text of a legal document.
TASK: identify discrete clauses. A clause is a self-contained obligation, right, definition, or condition. Merge continuation lines into one clause. Do not merge two distinct obligations.

RULES
- Preserve original wording character-for-character in "text".
- If the document numbers its clauses, copy that number exactly into "number". If not, set "number" to null. Never invent one.
- Headings that carry no obligation (e.g. "SCHEDULE A") become a clause with heading set and text empty.
- If the page is a signature block, exhibit, or blank, return an empty array. Do not fabricate content to fill the output.
- Also provide a "simpleText" field which translates the clause into everyday simple language at a Class 8 reading level (no legal jargon).

OUTPUT: JSON only. No markdown fences, no commentary.
{"clauses":[{"number":string|null,"heading":string,"text":string,"startLine":number,"endLine":number,"simpleText":string}]}

DOCUMENT PAGE ${pageNumber} TEXT:
${pageTextWithLines}`;
}
