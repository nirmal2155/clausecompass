import fs from "fs";
import path from "path";
import { Clause } from "@/lib/schema";

export interface StatuteEntry {
  id: string;
  act: string;
  section: string;
  title: string;
  gist: string;
  keywords: string[];
  enforceability: string;
  score?: number;
}

let cachedStatutes: StatuteEntry[] | null = null;

export function loadStatutes(): StatuteEntry[] {
  if (cachedStatutes) return cachedStatutes;
  try {
    const filePath = path.join(process.cwd(), "corpus", "statutes.jsonl");
    const fileContent = fs.readFileSync(filePath, "utf-8");
    const lines = fileContent.split("\n").filter((l) => l.trim().length > 0);
    cachedStatutes = lines.map((line) => JSON.parse(line) as StatuteEntry);
    return cachedStatutes;
  } catch (err) {
    console.warn("Could not read corpus/statutes.jsonl, using fallback", err);
    return [];
  }
}

/**
 * Tokenize text for BM25/keyword scoring
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

/**
 * Calculates keyword relevance score between a query and a statute
 */
function scoreStatute(statute: StatuteEntry, queryTokens: string[]): number {
  let score = 0;
  const docText = `${statute.act} ${statute.section} ${statute.title} ${statute.gist} ${statute.keywords.join(" ")}`.toLowerCase();

  for (const token of queryTokens) {
    if (docText.includes(token)) {
      score += 2;
    }
    // Boost keyword matches
    for (const kw of statute.keywords) {
      if (kw.toLowerCase().includes(token)) {
        score += 3;
      }
    }
    // Boost section/act matches
    if (statute.section.toLowerCase().includes(token) || statute.act.toLowerCase().includes(token)) {
      score += 4;
    }
  }

  // Boost for semantic topics
  const queryStr = queryTokens.join(" ");
  if (/deposit|security\s*deposit|advance/i.test(queryStr) && statute.id === "MTA-2021-S10") score += 10;
  if (/lock[\s-]?in|early\s*exit|vacat/i.test(queryStr) && (statute.id === "MTA-2021-S22" || statute.id === "ICA-1872-S74")) score += 10;
  if (/notice\s*period|revision\s*of\s*rent|rent\s*increase/i.test(queryStr) && statute.id === "MTA-2021-S13") score += 10;
  if (/non[\s-]?compete|restraint\s*of\s*trade|competitor/i.test(queryStr) && statute.id === "ICA-1872-S27") score += 15;
  if (/penalty|forfeit|liquidated\s*damages/i.test(queryStr) && statute.id === "ICA-1872-S74") score += 10;
  if (/repair|maintenance|whitewash/i.test(queryStr) && statute.id === "MTA-2021-S15") score += 10;
  if (/privacy|personal\s*data|consent|dpdp/i.test(queryStr) && (statute.id === "DPDP-2023-S06" || statute.id === "DPDP-2023-S05")) score += 10;
  if (/arbitration|court|jurisdiction|sue/i.test(queryStr) && statute.id === "ICA-1872-S28") score += 10;
  if (/unfair|one[\s-]sided|unilateral/i.test(queryStr) && statute.id === "CPA-2019-S02-46") score += 10;

  return score;
}

/**
 * Retrieve top matching Indian statutes for a clause or question
 */
export function retrieveStatutes(query: string, topK: number = 3): StatuteEntry[] {
  const statutes = loadStatutes();
  const tokens = tokenize(query);
  if (tokens.length === 0) return statutes.slice(0, topK);

  const scored = statutes.map((s) => ({
    ...s,
    score: scoreStatute(s, tokens),
  }));

  scored.sort((a, b) => (b.score || 0) - (a.score || 0));

  // Only return statutes with a meaningful relevance score
  return scored.filter((s) => (s.score || 0) > 0).slice(0, topK);
}

/**
 * Retrieve top matching clauses from document
 */
export function retrieveClauses(clauses: Clause[], query: string, topK: number = 4): Clause[] {
  const tokens = tokenize(query);
  if (tokens.length === 0) return clauses.slice(0, topK);

  const scored = clauses.map((clause) => {
    let score = 0;
    const clauseText = `${clause.heading} ${clause.text}`.toLowerCase();
    for (const token of tokens) {
      if (clauseText.includes(token)) score += 2;
    }
    // Bonus for phrase match
    if (query.length > 5 && clauseText.includes(query.toLowerCase().trim())) {
      score += 10;
    }
    return { clause, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.filter((s) => s.score > 0).slice(0, topK).map((s) => s.clause);
}
