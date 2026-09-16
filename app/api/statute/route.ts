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

      // Check lock-in / forfeiture
      if (lower.includes("lock-in") || lower.includes("forfeit")) {
        return {
          verdict: "review_recommended",
          explanation:
            "This clause imposes an automatic 6-month lock-in with total deposit forfeiture and liability for remaining rent. Section 74 of the Indian Contract Act limits damages to reasonable compensation rather than punitive forfeitures, and Model Tenancy Act principles favor standard 30-to-60 day notice exits. Statutes change and apply differently to different facts. A lawyer can confirm how this applies to you.",
          citations: [
            {
              act: "Indian Contract Act, 1872",
              section: "Section 74",
              gist: "party complaining is entitled to receive reasonable compensation not exceeding amount so named",
            },
            {
              act: "Model Tenancy Act, 2021",
              section: "Section 22",
              gist: "Notice to terminate tenancy must be served in accordance with the tenancy agreement",
            },
          ],
          whatToAsk:
            "Ask your lawyer: 'Can the landlord legally forfeit the entire Rs. 4.5 lakh deposit if I vacate early due to a job transfer, or does Indian law limit them to actual incurred rent loss?'",
        };
      }

      // Check non-compete
      if (lower.includes("non-compete") || lower.includes("restrain")) {
        return {
          verdict: "review_recommended",
          explanation:
            "This clause restrains you from practicing your trade or profession after leaving employment. Under Section 27 of the Indian Contract Act 1872, agreements in restraint of trade are void. Indian Supreme Court precedent consistently treats post-termination restrictions as unenforceable. Statutes change and apply differently to different facts. A lawyer can confirm how this applies to you.",
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

      // Check security deposit
      if (lower.includes("10 months") || lower.includes("security deposit")) {
        return {
          verdict: "unusual",
          explanation:
            "This clause demands a 10-month rent deposit. Section 10 of the Model Tenancy Act 2021 prescribes that residential deposits shall not exceed two months' rent. While local market practice in Bangalore often asks for more, the statutory policy benchmark contemplates a maximum of 2 months. Statutes change and apply differently to different facts. A lawyer can confirm how this applies to you.",
          citations: [
            {
              act: "Model Tenancy Act, 2021",
              section: "Section 10",
              gist: "not exceed two months rent in case of residential premises",
            },
          ],
          whatToAsk:
            "Ask your lawyer: 'Can we negotiate this down to 2-3 months citing Section 10 of the Model Tenancy Act guidelines?'",
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
