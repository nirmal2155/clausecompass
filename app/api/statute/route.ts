import { NextRequest, NextResponse } from "next/server";
import { retrieveStatutes } from "@/lib/retrieval";
import { buildStatuteGroundingPrompt } from "@/lib/prompts/statute";
import { callLLM } from "@/lib/llm";
import { StatuteCheckResult, StatuteCheckResultSchema } from "@/lib/schema";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { clauseText, heading } = body;

    if (!clauseText) {
      return NextResponse.json({ error: "clauseText is required" }, { status: 400 });
    }

    // Retrieve top 3 matching statutes
    const retrieved = retrieveStatutes(`${heading || ""} ${clauseText}`, 3);

    if (retrieved.length === 0) {
      return NextResponse.json({
        verdict: "outside_scope",
        explanation: "No specific statutory provision in the Indian Contract Act, Model Tenancy Act, CPA 2019, or DPDP Act was retrieved for this clause. Statutes change and apply differently to different facts. A lawyer can confirm how this applies to you.",
        citations: [],
        whatToAsk: "Ask a lawyer whether local municipal or state-specific laws govern this matter.",
      });
    }

    const statutePassages = retrieved
      .map((s) => `[Act: ${s.act}, Section: ${s.section} - ${s.title}]\n"${s.gist}"`)
      .join("\n\n");

    const prompt = buildStatuteGroundingPrompt({
      clauseText,
      statutePassages,
    });

    const fallbackStatuteCheck = (): StatuteCheckResult => {
      const lower = clauseText.toLowerCase();

      // 1. Check non-compete / restraint of trade (ICA Sec 27)
      if (lower.includes("non-compete") || lower.includes("restrain") || lower.includes("competing commercial")) {
        return {
          verdict: "review_recommended",
          explanation:
            "This clause restrains you from practicing your trade, business, or profession after leaving employment. Under Section 27 of the Indian Contract Act 1872, agreements in restraint of trade are void ab initio. Indian Supreme Court precedent (e.g. Niranjan Shankar Golikari, Percept D'Mark) consistently treats post-termination restrictions as unenforceable.",
          citations: [
            {
              act: "Indian Contract Act, 1872",
              section: "Section 27",
              gist: "Every agreement by which any one is restrained from exercising a lawful profession, trade or business of any kind, is to that extent void.",
            },
          ],
          whatToAsk:
            "Ask your lawyer: 'Is this post-employment non-compete void under Section 27 of the Indian Contract Act, and can the employer seek an injunction against my new employer?'",
        };
      }

      // 2. Check Employment Bond / Training Recovery (ICA Sec 74 & 27)
      if (
        (lower.includes("bond") || lower.includes("training fee") || lower.includes("training cost") || lower.includes("liquidated damages")) &&
        (lower.includes("employ") || lower.includes("company") || lower.includes("salary") || lower.includes("resignation") || lower.includes("minimum period"))
      ) {
        return {
          verdict: "review_recommended",
          explanation:
            "This clause mandates an employment bond or penal liquidated damages for leaving before a stipulated tenure. Under Section 74 of the Indian Contract Act 1872, Indian courts do not enforce penal bonds; recovery is strictly restricted to demonstrable, actual expenses incurred on specialized training.",
          citations: [
            {
              act: "Indian Contract Act, 1872",
              section: "Section 74",
              gist: "Party complaining is entitled to receive reasonable compensation not exceeding amount so named as penalty.",
            },
            {
              act: "Indian Contract Act, 1872",
              section: "Section 27",
              gist: "Restraint of lawful trade or profession is void.",
            },
          ],
          whatToAsk:
            "Ask your lawyer: 'Can the employer legally demand this bond amount without proving actual, specialized training invoices under Section 74 of the Indian Contract Act?'",
        };
      }

      // 3. Check Consumer / Coaching Non-Refundable Fee (CPA Sec 2(46))
      if (
        lower.includes("coaching") || lower.includes("tuition") || lower.includes("student") ||
        lower.includes("non-refundable") || (lower.includes("fee") && lower.includes("forfeit"))
      ) {
        return {
          verdict: "review_recommended",
          explanation:
            "This clause imposes an absolute non-refundable forfeiture of course fees. Under Section 2(46) of the Consumer Protection Act 2019, unreasonable forfeiture clauses constitute unfair contract terms. The National Consumer Disputes Redressal Commission (NCDRC) has repeatedly held that educational and coaching institutions cannot retain full fees for unattended lectures.",
          citations: [
            {
              act: "Consumer Protection Act, 2019",
              section: "Section 2(46)",
              gist: "Defines unfair contract terms including imposition of unreasonable charge, penalty or detriment on consumer.",
            },
          ],
          whatToAsk:
            "Ask your lawyer: 'Can the coaching institute legally forfeit 100% of my fees under Section 2(46) of the Consumer Protection Act 2019, or am I entitled to a pro-rata refund?'",
        };
      }

      // 4. Check Unilateral Sole Arbitrator / Court Bar (ICA Sec 28 / Arbitration Act Sec 12(5))
      if (lower.includes("sole arbitrator") || lower.includes("no court") || lower.includes("exclusive jurisdiction of the company") || lower.includes("waives any right to approach")) {
        return {
          verdict: "review_recommended",
          explanation:
            "This clause restricts dispute resolution to an arbitrator appointed unilaterally by one party or attempts to bar court access. Under Section 12(5) of the Arbitration and Conciliation Act 1996 and the Supreme Court's Perkins Eastman ruling, unilateral arbitrator appointments are ineligible. Furthermore, agreements restraining legal proceedings are void under Section 28 ICA.",
          citations: [
            {
              act: "Indian Contract Act, 1872",
              section: "Section 28",
              gist: "Every agreement by which any party is restricted absolutely from enforcing their rights by usual legal proceedings is void.",
            },
            {
              act: "Arbitration and Conciliation Act, 1996",
              section: "Section 12(5)",
              gist: "Persons having relationship with parties specified in Seventh Schedule ineligible to be appointed arbitrator.",
            },
          ],
          whatToAsk:
            "Ask your lawyer: 'Is this unilateral sole arbitrator appointment invalid under Section 12(5) of the Arbitration Act and Perkins Eastman precedent?'",
        };
      }

      // 5. Check Lease Lock-in / Rent Deposit Forfeiture
      if (lower.includes("lock-in") || (lower.includes("forfeit") && (lower.includes("deposit") || lower.includes("lessor") || lower.includes("rent")))) {
        return {
          verdict: "review_recommended",
          explanation:
            "This clause imposes an automatic lock-in with total deposit forfeiture. Section 74 of the Indian Contract Act limits damages to reasonable compensation rather than punitive forfeitures, and Model Tenancy Act principles favor standard 30-to-60 day notice exits.",
          citations: [
            {
              act: "Indian Contract Act, 1872",
              section: "Section 74",
              gist: "Party complaining is entitled to receive reasonable compensation not exceeding amount so named.",
            },
            {
              act: "Model Tenancy Act, 2021",
              section: "Section 22",
              gist: "Notice to terminate tenancy must be served in accordance with tenancy agreement.",
            },
          ],
          whatToAsk:
            "Ask your lawyer: 'Can the landlord legally forfeit the entire security deposit upon early exit, or does Section 74 of the Indian Contract Act restrict recovery strictly to actual rental loss?'",
        };
      }

      // 6. Check High Security Deposit in Tenancy
      if (lower.includes("security deposit") && (lower.includes("10 months") || lower.includes("months rent"))) {
        return {
          verdict: "unusual",
          explanation:
            "This clause demands a high security deposit. Section 10 of the Model Tenancy Act 2021 prescribes that residential security deposits shall not exceed two months' rent.",
          citations: [
            {
              act: "Model Tenancy Act, 2021",
              section: "Section 10",
              gist: "Security deposit shall not exceed two months rent in case of residential premises.",
            },
          ],
          whatToAsk:
            "Ask your lawyer: 'Can we negotiate this security deposit down to 2-3 months citing Section 10 of the Model Tenancy Act guidelines?'",
        };
      }

      // Default
      const topStatute = retrieved[0];
      return {
        verdict: "typical",
        explanation: `This provision operates within standard parameters of ${topStatute.act} (${topStatute.section}). Statutes change and apply differently to different facts. A lawyer can confirm how this applies to you.`,
        citations: [
          {
            act: topStatute.act,
            section: topStatute.section,
            gist: topStatute.gist.slice(0, 80),
          },
        ],
        whatToAsk: "Ask your lawyer if there are any state-specific amendments to this provision.",
      };
    };

    const { data } = await callLLM<StatuteCheckResult>({
      prompt,
      schema: StatuteCheckResultSchema,
      temperature: 0,
      mockFallback: fallbackStatuteCheck,
    });

    return NextResponse.json(data);
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Statute check error:", err);
    return NextResponse.json(
      { error: "Failed to perform statute check: " + (err.message || "Unknown error") },
      { status: 500 }
    );
  }
}
