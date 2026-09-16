/**
 * Security Control: PII Redaction & Rehydration
 * Detects Indian identifiers (Aadhaar, PAN, phone, email, bank accounts)
 * and replaces with deterministic [TYPE_N] tokens.
 */

export interface RedactionResult {
  redactedText: string;
  tokenMap: Record<string, string>; // token -> original value
  redactionCount: number;
  detectedTypes: string[];
}

export function redactPII(text: string): RedactionResult {
  let redacted = text;
  const tokenMap: Record<string, string> = {};
  const detectedTypes = new Set<string>();
  let tokenCounter = 1;

  // 1. Aadhaar numbers (12 digits, optional spaces or hyphens)
  // E.g.: 1234 5678 9012 or 1234-5678-9012 or 123456789012
  const aadhaarRegex = /\b[2-9]\d{3}[\s-]?\d{4}[\s-]?\d{4}\b/g;
  redacted = redacted.replace(aadhaarRegex, (match) => {
    const token = `[AADHAAR_${tokenCounter++}]`;
    tokenMap[token] = match;
    detectedTypes.add("Aadhaar");
    return token;
  });

  // 2. PAN numbers (5 letters, 4 numbers, 1 letter)
  // E.g.: ABCDE1234F
  const panRegex = /\b[A-Z]{5}[0-9]{4}[A-Z]\b/g;
  redacted = redacted.replace(panRegex, (match) => {
    const token = `[PAN_${tokenCounter++}]`;
    tokenMap[token] = match;
    detectedTypes.add("PAN");
    return token;
  });

  // 3. Indian Phone / Mobile Numbers
  // E.g.: +91 98765 43210, +91-9876543210, 9876543210
  const phoneRegex = /(?:\+91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}\b/g;
  redacted = redacted.replace(phoneRegex, (match) => {
    const token = `[PHONE_${tokenCounter++}]`;
    tokenMap[token] = match;
    detectedTypes.add("Phone");
    return token;
  });

  // 4. Email addresses
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
  redacted = redacted.replace(emailRegex, (match) => {
    const token = `[EMAIL_${tokenCounter++}]`;
    tokenMap[token] = match;
    detectedTypes.add("Email");
    return token;
  });

  // 5. Indian Bank Account Numbers (9 to 18 digits with keyword indicator nearby or standalone account patterns)
  const bankAccRegex = /(?:A\/C|Account(?:\s+No\.?)?|Acc\.?)\s*:?\s*(\b\d{9,18}\b)/gi;
  redacted = redacted.replace(bankAccRegex, (match, p1) => {
    const token = `[BANK_ACC_${tokenCounter++}]`;
    tokenMap[token] = p1;
    detectedTypes.add("Bank Account");
    return match.replace(p1, token);
  });

  return {
    redactedText: redacted,
    tokenMap,
    redactionCount: Object.keys(tokenMap).length,
    detectedTypes: Array.from(detectedTypes),
  };
}

/**
 * Re-hydrates redacted tokens for client-side display only.
 * Model prompts always use the redacted tokens!
 */
export function rehydratePII(text: string, tokenMap: Record<string, string>): string {
  if (!text || !tokenMap || Object.keys(tokenMap).length === 0) return text;
  let result = text;
  for (const [token, original] of Object.entries(tokenMap)) {
    result = result.split(token).join(original);
  }
  return result;
}
