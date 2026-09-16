/**
 * P10 · Silence Radar (Missing-Clause Detection) Prompt
 */
export function buildGapCheckPrompt(params: {
  docType: string;
  userRole: string;
  topicsWithCandidates: string;
}): string {
  return `ROLE
You determine whether a document ADDRESSES a topic. You are not judging whether it addresses it well. Presence, not quality.

For each expected topic, you are given the three clauses from the document that were semantically closest to it.

DECIDE
covered : a given clause clearly deals with this topic, even if worded unusually or unfavourably.
partial : the topic is touched but a material part is left open (e.g. a deposit is mentioned but no refund timeline is stated).
absent  : none of the given clauses deals with this topic.

RULES
1. Do not mark "absent" merely because the wording differs from the topic label. Match on meaning.
2. If you mark "covered" or "partial", you must name the clause id and quote an exact substring proving it. No proof, no "covered".
3. If you mark "absent", write one sentence on the practical consequence of the silence for ${params.userRole}. Describe the consequence, never predict a legal outcome, never say the document is invalid.
4. Never invent a topic that was not in the expected list.
5. "absent" is a normal, useful result. Do not avoid it to seem helpful.

TONE for consequence: concrete and calm.
good: "No repair clause means every plumbing bill becomes a negotiation with no written rule to point to."
bad : "This is a serious legal risk and you should not sign."

DOCUMENT TYPE: ${params.docType}
USER'S ROLE: ${params.userRole}
EXPECTED TOPICS WITH NEAREST CLAUSES:
${params.topicsWithCandidates}

OUTPUT: JSON only.
{
  "gaps": [
    {
      "key": string,
      "status": "covered|partial|absent",
      "proofClauseId": string|null,
      "proofSpan": string,
      "consequence": string,
      "askAbout": string
    }
  ]
}`;
}
