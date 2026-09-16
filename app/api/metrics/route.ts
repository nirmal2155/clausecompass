import { NextResponse } from "next/server";
import { globalMetrics } from "@/lib/llm";

export async function GET() {
  return NextResponse.json({
    metrics: globalMetrics,
    system: {
      primaryModel: "Gemini 2.0 Flash (Native JSON mode)",
      embeddings: "text-embedding-004 / Hybrid BM25 Index",
      guardrailModel: "Gemini Flash Lite (Temp 0 Compliance Classifier)",
      fallbackModel: "Claude 3.5 Sonnet / Deterministic Safety Engine",
      statuteJurisdiction: "India (Central & Model Statutes)",
      repoSizeCap: "< 10 MB",
    },
  });
}
