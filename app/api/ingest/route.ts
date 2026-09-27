import { NextRequest, NextResponse } from "next/server";
import { calculateHash, getCachedDocument, setCachedDocument } from "@/lib/cache";
import { redactPII } from "@/lib/sanitize";
import { wrapUntrustedDocument } from "@/lib/prompts/_wrapper";
import { buildSegmentationPrompt } from "@/lib/prompts/segment";
import { callLLM } from "@/lib/llm";
import { Clause, ClauseSchema, DocumentAnalysisState } from "@/lib/schema";
import { z } from "zod";

const SegmentationResponseSchema = z.object({
  clauses: z.array(
    z.object({
      number: z.string().nullable(),
      heading: z.string(),
      text: z.string(),
      startLine: z.number().optional(),
      endLine: z.number().optional(),
      simpleText: z.string().optional(),
    })
  ),
});

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const docType = (formData.get("docType") as string) || "General Legal Contract";
    const userRole = (formData.get("userRole") as string) || "Consumer / Tenant / Signatory";
    const piiRedact = formData.get("piiRedact") === "true";
    const rawTextInput = formData.get("rawText") as string | null;

    let textContent = "";
    let filename = "uploaded_document.pdf";

    if (file) {
      filename = file.name;
      // 1. File size check (10 MB cap)
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json(
          { error: "File exceeds 10 MB limit. Please upload a smaller document." },
          { status: 400 }
        );
      }

      const buffer = Buffer.from(await file.arrayBuffer());

      // 2. Magic byte check for PDF (%PDF-)
      const isPdf = buffer.length >= 4 && buffer.toString("utf8", 0, 4) === "%PDF";
      const isPlainText = file.type.includes("text") || filename.endsWith(".txt") || filename.endsWith(".md");

      if (!isPdf && !isPlainText) {
        return NextResponse.json(
          { error: "Invalid file format. Please upload a valid PDF or text document." },
          { status: 400 }
        );
      }

      // Check for PDF encryption flag
      if (isPdf) {
        const rawString = buffer.toString("binary");
        if (rawString.includes("/Encrypt")) {
          return NextResponse.json(
            { error: "This PDF is password-protected or encrypted. Please remove the password and try again." },
            { status: 400 }
          );
        }

        // Basic clean text extraction from PDF stream or text chunks
        // Extract readable ASCII and unicode text lines
        const lines: string[] = [];
        const regex = /BT[\s\S]*?ET/g;
        let match;
        let extractedFromStreams = "";
        while ((match = regex.exec(rawString)) !== null) {
          const chunk = match[0].replace(/\((.*?)\)\s*T[jJ]/g, "$1 ").replace(/[^\x20-\x7E\n]/g, " ");
          extractedFromStreams += chunk + "\n";
        }

        if (extractedFromStreams.trim().length > 100) {
          textContent = extractedFromStreams;
        } else {
          // Fallback: extract plain ASCII text from buffer
          textContent = buffer.toString("utf-8").replace(/[\x00-\x09\x0B-\x1F\x7F-\x9F]/g, " ");
        }
      } else {
        textContent = buffer.toString("utf-8");
      }
    } else if (rawTextInput) {
      textContent = rawTextInput;
      filename = "pasted_contract.txt";
    } else {
      return NextResponse.json(
        { error: "No document file or text content provided." },
        { status: 400 }
      );
    }

    if (textContent.trim().length < 20) {
      return NextResponse.json(
        { error: "The document appears to be empty or unreadable text. Please provide selectable text." },
        { status: 400 }
      );
    }

    // 3. Auto-detect docType and userRole if default or if clear markers exist
    const textLower = textContent.toLowerCase();
    let finalDocType = docType;
    let finalUserRole = userRole;

    const isGenericOrDefault =
      docType === "General Legal Contract" ||
      (docType === "Residential Tenancy Agreement" && userRole === "Tenant");

    if (isGenericOrDefault) {
      if (textLower.includes("non-disclosure") || textLower.includes("confidential information") || textLower.includes("mutual nda") || textLower.includes("disclosing party") || textLower.includes("receiving party")) {
        finalDocType = "Non-Disclosure Agreement";
        finalUserRole = "Receiving Party";
      } else if (textLower.includes("coaching") || textLower.includes("tuition") || textLower.includes("classroom course") || textLower.includes("student enrollment") || (textLower.includes("institute") && textLower.includes("course"))) {
        finalDocType = "Consumer Terms of Service";
        finalUserRole = "Consumer";
      } else if (textLower.includes("freelance") || textLower.includes("independent contractor") || textLower.includes("statement of work") || textLower.includes("deliverables") || (textLower.includes("client") && textLower.includes("contractor"))) {
        finalDocType = "Commercial Service Agreement";
        finalUserRole = "Contractor";
      } else if (textLower.includes("employment agreement") || textLower.includes("employment contract") || (textLower.includes("employer") && textLower.includes("employee")) || (textLower.includes("salary") && textLower.includes("probation"))) {
        finalDocType = "Employment Contract";
        finalUserRole = "Employee";
      } else if (textLower.includes("lease") || textLower.includes("tenancy") || textLower.includes("lessor") || textLower.includes("lessee") || textLower.includes("rent")) {
        finalDocType = "Residential Tenancy Agreement";
        finalUserRole = "Tenant";
      }
    }

    // 4. Security: PII Redaction
    let processedText = textContent;
    let redactionMap: Record<string, string> = {};
    if (piiRedact) {
      const redaction = redactPII(textContent);
      processedText = redaction.redactedText;
      redactionMap = redaction.tokenMap;
    }

    // 5. SHA-256 Hash check for demo insurance and fast caching
    const fileHash = calculateHash(processedText);
    const existing = getCachedDocument(fileHash);
    if (existing) {
      return NextResponse.json({
        id: existing.id,
        fileHash: existing.fileHash,
        filename: existing.filename,
        docType: existing.docType,
        userRole: existing.userRole,
        clauses: existing.clauses,
        findings: existing.findings,
        fromCache: true,
        piiRedacted: piiRedact,
      });
    }

    // 6. Clause Segmentation (P1) wrapped with P8 untrusted boundary
    const docId = "doc-" + Math.random().toString(36).substring(2, 9);
    const wrappedDoc = wrapUntrustedDocument(processedText);
    const segmentationPrompt = buildSegmentationPrompt(wrappedDoc, 1);

    // Fallback heuristic segmenter in case of network/offline mode
    const fallbackSegmenter = (): { clauses: z.infer<typeof SegmentationResponseSchema>["clauses"] } => {
      const rawLines = processedText.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
      const parsedClauses: z.infer<typeof SegmentationResponseSchema>["clauses"] = [];
      let currentHeading = "Preamble / General";
      let currentNumber: string | null = null;
      let currentBuffer: string[] = [];

      for (let i = 0; i < rawLines.length; i++) {
        const line = rawLines[i];
        // Match: "1. Heading", "Clause 1: Heading", "SECTION 1 - Heading", "ARTICLE 1:", etc.
        const match = line.match(/^(?:CLAUSE|SECTION|ARTICLE)?\s*(\d+)[\.:\)\s]+([A-Za-z\s\/\-]{3,40})?[\.:\s]*(.*)/i);
        if (match) {
          if (currentBuffer.length > 0) {
            parsedClauses.push({
              number: currentNumber,
              heading: currentHeading,
              text: currentBuffer.join(" "),
              startLine: 1,
              endLine: i,
              simpleText: currentBuffer.join(" ").slice(0, 150) + "...",
            });
            currentBuffer = [];
          }
          currentNumber = match[1];
          currentHeading = match[2]?.trim() || `Clause ${currentNumber}`;
          if (match[3]) currentBuffer.push(match[3]);
        } else {
          currentBuffer.push(line);
        }
      }

      if (currentBuffer.length > 0) {
        parsedClauses.push({
          number: currentNumber,
          heading: currentHeading,
          text: currentBuffer.join(" "),
          startLine: 1,
          endLine: rawLines.length,
          simpleText: currentBuffer.join(" ").slice(0, 150) + "...",
        });
      }

      return { clauses: parsedClauses.length > 0 ? parsedClauses : [{ number: "1", heading: "General Provision", text: processedText, simpleText: processedText.slice(0, 100) }] };
    };

    const { data } = await callLLM<{ clauses: z.infer<typeof SegmentationResponseSchema>["clauses"] }>({
      prompt: segmentationPrompt,
      schema: SegmentationResponseSchema,
      temperature: 0,
      mockFallback: fallbackSegmenter,
    });

    // Structure clauses with consistent IDs and bounding boxes
    const clauses: Clause[] = data.clauses.map((c, idx) => {
      return ClauseSchema.parse({
        id: `c-${String(idx + 1).padStart(3, "0")}`,
        number: c.number,
        heading: c.heading || `Clause ${idx + 1}`,
        text: c.text,
        page: 1,
        bbox: [40, 60 + idx * 50, 520, 100 + idx * 50],
        startLine: c.startLine || idx * 3 + 1,
        endLine: c.endLine || idx * 3 + 3,
        simpleText: c.simpleText || c.text,
      });
    });

    const newState: DocumentAnalysisState = {
      id: docId,
      filename,
      fileHash,
      docType: finalDocType,
      userRole: finalUserRole,
      rawText: processedText,
      clauses,
      findings: [],
      createdAt: new Date().toISOString(),
      piiRedacted: piiRedact,
      redactionMap,
    };

    setCachedDocument(newState);

    return NextResponse.json({
      id: docId,
      fileHash,
      filename,
      docType: finalDocType,
      userRole: finalUserRole,
      rawText: processedText,
      clauses,
      findings: [],
      fromCache: false,
      piiRedacted: piiRedact,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Ingest error:", err);
    return NextResponse.json(
      { error: "Failed to process document: " + (err.message || "Unknown error") },
      { status: 500 }
    );
  }
}
