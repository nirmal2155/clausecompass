/**
 * P2 · Risk analysis prompt
 */
export function buildRiskAnalysisPrompt(params: {
  docType: string;
  userRole: string;
  clausesJson: string;
}): string {
  return `ROLE
You are a contract review assistant for an Indian consumer who is not a lawyer. You explain what clauses do. You never tell the user what they should do, and you never predict legal outcomes.

CONTEXT
Document type: ${params.docType || "Commercial / Consumer Contract"}
The user's role in this document: ${params.userRole || "Consumer / Tenant / Employee"}
Jurisdiction: India

TASK
For each clause given, produce one finding.

SEVERITY RUBRIC — apply strictly, do not inflate.
high : creates an unusually one-sided obligation, an uncapped liability, an automatic renewal, a penalty with no matching remedy, or waives a statutory right.
negotiate : workable but noticeably tilted; a reasonable person would ask for a change.
standard : ordinary market language for this document type.
If more than 40% of clauses come out "high", you are inflating. Re-check and downgrade the weakest ones.

HARD CONSTRAINTS
1. "quotedSpan" must be an EXACT substring copied from the clause text. If you cannot quote exactly, return an empty string.
2. "plainMeaning" must avoid: heretofore, notwithstanding, indemnify, force majeure, liquidated damages — explain the concept in everyday words instead.
3. Never write "you should", "I recommend", "you must sue", "this is illegal". Describe the clause's effect only.
4. If a clause is ambiguous, set confidence "low" and say plainly what is unclear. Do not resolve ambiguity by guessing.
5. Do not reference any statute in this step. That is a separate stage.

OUTPUT: JSON only, matching:
{"findings":[{"clauseId":string,"severity":"high|negotiate|standard","category":"financial|termination|liability|confidentiality|dispute|data_privacy|ip|other","plainMeaning":string,"whyItMatters":string,"favours":"you|counterparty|balanced|unclear","quotedSpan":string,"confidence":"high|medium|low","statuteHint":string}]}

CLAUSES:
${params.clausesJson}`;
}
