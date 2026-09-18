"use client";

import React, { useMemo } from "react";
import { MessageSquare } from "lucide-react";

export interface Finding {
  severity: string;
  category: string;
  plainMeaning: string;
}

export interface SuggestedQuestionsProps {
  findings: Finding[];
  onSelect: (question: string) => void;
}

export function SuggestedQuestions({ findings, onSelect }: SuggestedQuestionsProps) {
  const questions = useMemo(() => {
    const qSet = new Set<string>();
    
    // Default questions
    qSet.add("Summarize the top 3 risks in simple language");
    qSet.add("What should I ask my lawyer about?");

    const categories = findings.map(f => f.category.toLowerCase());

    if (categories.some(c => c.includes("termination"))) {
      qSet.add("What happens if I need to leave early?");
    }
    if (categories.some(c => c.includes("financial") || c.includes("payment"))) {
      qSet.add("How much total money am I at risk for?");
    }
    if (categories.some(c => c.includes("privacy") || c.includes("data"))) {
      qSet.add("What personal data can they collect?");
    }
    if (categories.some(c => c.includes("liability") || c.includes("indemnity"))) {
      qSet.add("What am I liable for if something goes wrong?");
    }

    return Array.from(qSet).slice(0, 6); // Max 6 questions
  }, [findings]);

  return (
    <div className="w-full overflow-x-auto pb-4 scrollbar-hide">
      <div className="flex flex-row items-center gap-3 w-max px-2">
        {questions.map((q, i) => (
          <button
            key={i}
            onClick={() => onSelect(q)}
            className="flex items-center gap-2 px-4 py-2 bg-white text-blue-600 text-sm font-medium border border-blue-200 rounded-full hover:bg-blue-50 transition-colors animate-slide-in-right"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <MessageSquare size={16} />
            <span>{q}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default SuggestedQuestions;
