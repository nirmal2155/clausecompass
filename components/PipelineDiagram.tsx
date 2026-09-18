"use client";

import React from "react";
import { ChevronRight } from "lucide-react";

export function PipelineDiagram() {
  const stages = [
    { id: 1, title: "Document Upload", icon: "📄", gemini: false },
    { id: 2, title: "PII Redaction", icon: "🔒", gemini: false },
    { id: 3, title: "Clause Segmentation", icon: "📋", gemini: true },
    { id: 4, title: "Risk Analysis", icon: "⚠️", gemini: true },
    { id: 5, title: "Statute Grounding", icon: "⚖️", gemini: true },
    { id: 6, title: "Guardrail Filter", icon: "🛡️", gemini: true },
    { id: 7, title: "User Output", icon: "✅", gemini: false },
  ];

  return (
    <div className="flex flex-col md:flex-row flex-wrap items-center justify-center gap-4 py-8 w-full max-w-6xl mx-auto">
      {stages.map((stage, index) => (
        <React.Fragment key={stage.id}>
          <div
            className={`flex flex-col items-center justify-center p-4 bg-white border border-slate-200 rounded-xl shadow-sm min-w-[140px] text-center animate-fade-in-up delay-${Math.min(index + 1, 8)}`}
          >
            <div className="text-2xl mb-2">{stage.icon}</div>
            <div className="text-sm font-semibold text-slate-800">{stage.title}</div>
            {stage.gemini && (
              <div className="mt-2 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full border border-blue-100">
                Gemini 2.0 Flash
              </div>
            )}
          </div>
          {index < stages.length - 1 && (
            <div className={`hidden md:block text-slate-400 animate-fade-in-up delay-${Math.min(index + 1, 8)}`}>
              <ChevronRight size={24} />
            </div>
          )}
          {index < stages.length - 1 && (
            <div className={`block md:hidden text-slate-400 my-1 animate-fade-in-up delay-${Math.min(index + 1, 8)}`}>
              <div className="w-0.5 h-6 bg-slate-200 mx-auto"></div>
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

export default PipelineDiagram;
