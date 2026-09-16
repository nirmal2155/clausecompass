import { NextRequest, NextResponse } from "next/server";
import { getCachedDocument } from "@/lib/cache";
import { detectSilenceGaps } from "@/lib/gapcheck";
import { Clause } from "@/lib/schema";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { documentId, clauses: clientClauses, docType, userRole } = body;

    const existing = documentId ? getCachedDocument(documentId) : null;
    const clauses: Clause[] = clientClauses || existing?.clauses || [];

    if (clauses.length === 0) {
      return NextResponse.json({ error: "No clauses available for gap check" }, { status: 400 });
    }

    const gaps = await detectSilenceGaps({
      clauses,
      docType: docType || existing?.docType || "Residential Tenancy Agreement",
      userRole: userRole || existing?.userRole || "Tenant",
    });

    if (existing) {
      existing.gaps = gaps;
    }

    return NextResponse.json({ gaps });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Gaps check error:", err);
    return NextResponse.json(
      { error: "Failed to detect silence gaps: " + (err.message || "Unknown error") },
      { status: 500 }
    );
  }
}
