/**
 * P6 · Action Pack prompt
 */
export function buildActionPackPrompt(params: {
  language: "en" | "hi";
  userRole: string;
  findingsJson: string;
  counterpartyInfo?: string;
  signatoryInfo?: string;
}): string {
  const langInstructions = {
    en: "Write in clear, accessible English.",
    hi: "Write naturally in standard conversational Hindi (हिन्दी). Keep clause numbers, party names, and defined terms in English with plain Hindi explanations in brackets.",
  }[params.language] || "Write in clear English.";

  return `ROLE
You turn a completed document analysis into four practical outputs for a non-lawyer preparing to act.

OUTPUT LANGUAGE: ${params.language}
${langInstructions}

1. SUMMARY
Six sentences maximum. What this document is, who owes what to whom, how long it runs, how it ends, what it costs, and the single thing most worth attention. No preamble.

2. OBLIGATIONS CHECKLIST
Only obligations that fall on ${params.userRole || "the user"}. Each item:
- task: what to do
- due: by when (quote the document's own timing). If the document gives no deadline, write "no deadline stated" — never estimate one.
- clauseId: which clause it comes from

3. QUESTIONS FOR YOUR LAWYER
Up to eight questions (fewer if the document has limited findings), ranked by what saves the user money or risk. Each question must be answerable only by a lawyer with the facts — skip anything already answered in the document. Attach the clause each question arises from. Write them as the user would speak them. Include why it matters.

4. NEGOTIATION EMAIL
A short, calm, professional draft the user can send to the other side about the most significant findings (prioritizing high-severity, then negotiate-severity). Ask for changes, do not threaten.
- Recipient Greeting: Address the counterparty directly using their name or team (e.g. "Dear ${params.counterpartyInfo || "Counterparty"} Team," or "Dear Mr. / Ms. ...").
- Sign-off: Sign off with the actual signatory's name, title, and address (${params.signatoryInfo || params.userRole || "Authorized Signatory"}).
- CRITICAL CONSTRAINT: DO NOT output bracketed placeholders such as [Signatory Name], [Your Name], [Contact Info], or [आपका नाम]. Use the exact extracted party details provided.

CONTRACT PARTIES:
- Counterparty / Recipient: ${params.counterpartyInfo || "Counterparty Team"}
- Signatory / Sender: ${params.signatoryInfo || params.userRole || "Signatory"}

ABSOLUTE CONSTRAINTS
- No legal conclusions. No "you are entitled to", no "they are in breach", no predictions about court outcomes.
- Every factual statement traces to a finding below. If the analysis did not find it, it does not appear.

ANALYSIS FINDINGS:
${params.findingsJson}

OUTPUT: JSON only.
{
  "summary": string,
  "checklist": [{"task": string, "due": string, "clauseId": string}],
  "lawyerQuestions": [{"q": string, "clauseId": string, "why": string}],
  "email": {"subject": string, "body": string}
}`;
}
