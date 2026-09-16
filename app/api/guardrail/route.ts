import { NextRequest, NextResponse } from "next/server";
import { enforceGuardrail } from "@/lib/guardrail";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { draft } = body;

    if (!draft || typeof draft !== "string") {
      return NextResponse.json({ error: "Draft string is required" }, { status: 400 });
    }

    const result = await enforceGuardrail(draft);
    return NextResponse.json(result);
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { error: "Guardrail evaluation failed: " + (err.message || "Unknown error") },
      { status: 500 }
    );
  }
}
