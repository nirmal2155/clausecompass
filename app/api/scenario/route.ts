import { NextRequest, NextResponse } from "next/server";
import { getCachedDocument } from "@/lib/cache";
import { simulateScenario } from "@/lib/scenario";
import { Clause } from "@/lib/schema";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { scenario, documentId, clauses: clientClauses, userRole } = body;

    if (!scenario || typeof scenario !== "string") {
      return NextResponse.json({ error: "scenario is required" }, { status: 400 });
    }

    const existing = documentId ? getCachedDocument(documentId) : null;
    const clauses: Clause[] = clientClauses || existing?.clauses || [];

    if (clauses.length === 0) {
      return NextResponse.json({ error: "No clauses found for scenario simulation" }, { status: 400 });
    }

    const result = await simulateScenario({
      scenario,
      userRole: userRole || existing?.userRole || "Tenant",
      clauses,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Scenario error:", err);
    return NextResponse.json(
      { error: "Failed to simulate scenario: " + (err.message || "Unknown error") },
      { status: 500 }
    );
  }
}
