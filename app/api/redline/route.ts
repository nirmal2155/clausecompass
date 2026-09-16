import { NextRequest, NextResponse } from "next/server";
import { generateCounterDraft } from "@/lib/redline";
import { RiskFinding } from "@/lib/schema";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { clauseText, finding, userRole, statuteContext } = body;

    if (!clauseText || !finding) {
      return NextResponse.json({ error: "clauseText and finding are required" }, { status: 400 });
    }

    const proposal = await generateCounterDraft({
      clauseText,
      finding: finding as RiskFinding,
      userRole: userRole || "Tenant",
      statuteContext,
    });

    return NextResponse.json(proposal);
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Redline error:", err);
    return NextResponse.json(
      { error: "Failed to generate counter-draft: " + (err.message || "Unknown error") },
      { status: 500 }
    );
  }
}
