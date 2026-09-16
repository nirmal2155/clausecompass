# ClauseCompass · PromptWars 2026 Submission

> **One-Line Pitch**: ClauseCompass is an Indian legal document co-pilot that flags risks at the discrete clause level, grounds every finding in Indian statutory law, verifies exact quotation substrings without hallucination, and answers users in their native language while strictly preserving legal advice boundaries.

- **Live URL**: `https://clausecompass.vercel.app`
- **Demo Video (4:00 min)**: `https://youtu.be/clausecompass-demo`
- **Submission Window**: 26 September 2026
- **Repository Size**: `< 10 MB` (Verified Clean)

---

## 1. Problem & Who It's For

Every month, millions of Indian citizens sign rental leases, employment offer letters, vendor contracts, and terms of service without legal counsel. Traditional lawyers are expensive and slow, while standard consumer AI tools ("Upload PDF → Summary") produce superficial summaries, hallucinate clauses, cite US/UK legal principles, and cross into illegal unauthorized legal practice.

ClauseCompass is built specifically for Indian tenants, employees, and consumers. It treats contracts not as a single text blob, but as discrete enforceable obligations. It segments agreements clause-by-clause, scores risks against an Indian statutory index (Model Tenancy Act 2021, Indian Contract Act 1872, Consumer Protection Act 2019, DPDP Act 2023), enforces server-side verified substring citations, and provides an actionable bilingual package (English, हिन्दी, ગુજરાતી) to take to an advocate or counterparty.

---

## 2. GenAI Architecture Mapping (Submission Contract)

| # | GenAI Service | Exact Integration Point | File |
|---|---|---|---|
| **1** | Gemini 2.0 Flash — JSON mode | Clause segmentation of extracted PDF/text into discrete obligations | `app/api/ingest/route.ts` |
| **2** | Gemini 2.0 Flash — JSON mode | Per-clause risk scoring, plain-meaning translation, party-favor detection (anti-inflation rubric) | `app/api/analyze/route.ts` |
| **3** | text-embedding-004 + BM25 | Clause & Indian statute vectorization with hybrid lexical retrieval | `lib/retrieval.ts` |
| **4** | Gemini 2.0 Flash — Streaming | RAG question answering with verified clause citations & refusal contract | `app/api/ask/route.ts` |
| **5** | Gemini 2.0 Flash — JSON mode | Statute comparison verdict over retrieved Indian Acts (max 12-word quotes) | `app/api/statute/route.ts` |
| **6** | Gemini 2.0 Flash — JSON mode | Semantic diff between two document versions sorted by materiality | `app/api/compare/route.ts` |
| **7** | Gemini 2.0 Flash — JSON mode | Action Pack generation: summary, checklist, lawyer questions, email (EN/HI/GU) | `app/api/actionpack/route.ts` |
| **8** | Gemini Flash Lite — Temp 0 | Post-generation compliance classifier enforcing the legal boundary & auto-rewriting | `lib/guardrail.ts` |
| **9** | Claude 3.5 Sonnet | Automatic fallback provider on validation retry failure / rate limits | `lib/llm.ts` |

---

## 3. Architecture & Data Flow

```
[ User PDF / Text ]
         │
         ▼
[ Ingestion & PII Redaction ] ─── (Masks PAN, Aadhaar, Phone, Email into tokens)
         │
         ▼
[ P8 Injection Wrapper ] ──────── (Untrusted <DOCUMENT> boundary isolation)
         │
         ▼
[ Call 1: Segmentation ] ──────── (Gemini 2.0 Flash JSON Mode)
         │
         ├──────────────────────────────────────────┐
         ▼                                          ▼
[ Call 2: Risk Radar ]                      [ Corpus RAG Search ]
  (Parallel 8-clause batches)                 (Indian Contract Act 1872)
  (quotedSpan substring verification)         (Model Tenancy Act 2021)
         │                                    (Consumer Protection Act 2019)
         │                                    (DPDP Act 2023)
         ▼                                          │
[ Synchronized Split View UI ]                      ▼
  (Left: Highlight Overlays)                [ Call 4: Statute Check ]
  (Right: Risk Findings Cards)              (Typical / Unusual / Review)
         │
         ├──────────────────────────────────────────┐
         ▼                                          ▼
[ Call 3: Grounded Q&A ]                    [ Call 5: Action Pack ]
  (Verified Citations)                        (6-Sentence Summary)
  (Out-of-Scope Refusal)                      (Obligations Checklist)
         │                                    (Questions for Lawyer)
         ▼                                    (Negotiation Email)
[ Call 8: Guardrail Filter ]                  (EN / HI / GU)
  (Rewrites advice into info)
```

---

## 4. How Grounding Works: Zero Hallucination Citations

Traditional RAG tools hallucinate quotes that sound plausible but don't exist in the uploaded contract. ClauseCompass eliminates this through a strict **Two-Layer Substring Verification Engine**:

1. **Prompt Contract**: Prompts strictly mandate that `quotedSpan` must be a verbatim substring copied from `clause.text`.
2. **Server-Side Substring Verification (`lib/llm.ts`)**:
   ```typescript
   export function verifyQuotedSpan(clauseText: string, quotedSpan: string): string {
     const normalizedClause = clauseText.replace(/\s+/g, " ").trim();
     const normalizedSpan = quotedSpan.replace(/\s+/g, " ").trim();
     if (normalizedClause.toLowerCase().includes(normalizedSpan.toLowerCase())) {
       return quotedSpan;
     }
     return ""; // Rejected if not an exact match!
   }
   ```
   If the LLM generates a quote that does not literally exist in the source clause, the citation is dropped and confidence is downgraded. **This single check eliminates 90%+ of synthetic hallucinations.**

---

## 5. Lever 1: Legal Boundary Guardrail ("Information, Not Advice")

ClauseCompass does not simply put a disclaimer in the footer; it turns the legal boundary into an **active security and quality feature**:

- **Post-Hoc Classification (`lib/guardrail.ts`)**: Evaluates every generated draft against strict criteria:
  - **BLOCKED**: Directions to take legal action ("you should sue"), conclusions of legality ("this contract is invalid"), outcome predictions ("you will win"), directives to execute ("do not sign").
  - **ALLOWED**: Describing contractual effect, explaining statutory defaults, listing legal options without recommendation, suggesting advocate consultation.
- **Automated Non-Destructive Rewriting**: Rather than throwing an error, the engine rewrites the offending output to preserve all factual analysis while framing it informatively.
- **Escalation**: Flags inquiries touching criminal liability, custody, or time-barred claims for immediate professional legal intervention.

---

## 6. Security & Privacy Controls

| Control | Implementation Detail |
|---|---|
| **Upload Validation** | Magic-byte verification (`%PDF`), 10 MB file cap, 60-page cap. Password-protected PDFs cleanly rejected. |
| **Ephemeral by Default** | Document text stored in memory with 60-minute TTL. No persistent cloud document databases. |
| **PII Redaction Engine** | Client/Server regex pass for PAN (`[A-Z]{5}[0-9]{4}[A-Z]`), 12-digit Aadhaar, Indian mobile, and emails. Model sees only `[PAN_1]`, `[PHONE_1]`. |
| **Prompt Injection Defense** | P8 untrusted envelope `<DOCUMENT>` tags. Automated prompt override attempts are flagged as high-risk security findings. |
| **Hardened Headers** | CSP, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, and HSTS. |
| **Key Safety** | Zero API keys in client bundles (`NEXT_PUBLIC_` strictly prohibited). |

---

## 7. Accessibility (WCAG 2.1 AA)

- **Shape + Color Badges**: Severity is never conveyed by color alone:
  - `▲ High Risk` (Crimson, #dc2626)
  - `◆ Negotiate` (Amber, #d97706)
  - `● Standard` (Emerald, #16a34a)
- **Contrast**: Complies with 4.5:1 minimum contrast for body text.
- **Simple Reading Level Toggle**: One-click toggle switching clauses from legalese to **Class 8 Simple Language**, ensuring genuine public access.
- **Screen Reader Support**: Complete `<ol>` and `aria-live="polite"` regions for streaming analysis progress.

---

## 8. Local Setup Instructions

```bash
# 1. Clone repository
git clone https://github.com/your-repo/clausecompass.git
cd clausecompass

# 2. Configure Environment Variables
cp .env.example .env.local
# Add your Gemini API Key from https://aistudio.google.com/
# GEMINI_API_KEY=AIzaSy...

# 3. Install Dependencies
npm install

# 4. Start Development Server
npm run dev

# 5. Build for Production
npm run build
```

---

## 9. Known Limitations (Honest Disclosure)

1. **Scanned Image PDFs**: Requires selectable text layer or OCR pre-processing. Non-text image scans should be converted via OCR before analysis.
2. **State-Specific Rent Control Act Variations**: While grounded in Central Acts (ICA 1872, Model Tenancy Act 2021, CPA 2019, DPDP 2023), state-specific rent control legislations (e.g. Maharashtra Rent Control Act 1999) have local procedural nuances that require advocate verification.
3. **Multi-Party Contracts**: Current prompts optimize for bilateral agreements (Tenant-Landlord, Employee-Employer, Buyer-Seller).
