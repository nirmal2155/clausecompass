"use client";

import React, { useEffect, useState } from "react";

export interface HealthScoreRingProps {
  score: number;
  size?: number;
  label?: string;
}

export function HealthScoreRing({ score, size = 120, label }: HealthScoreRingProps) {
  const [offset, setOffset] = useState(283);
  const radius = 45;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    const clampedScore = Math.max(0, Math.min(100, score));
    const targetOffset = circumference - (clampedScore / 100) * circumference;
    
    const timeout = setTimeout(() => {
      setOffset(targetOffset);
    }, 50);
    
    return () => clearTimeout(timeout);
  }, [score, circumference]);

  let strokeColor = "text-red-600";
  if (score >= 80) strokeColor = "text-green-600";
  else if (score >= 50) strokeColor = "text-amber-500";

  return (
    <div className="relative flex flex-col items-center justify-center" style={{ width: size, height: size }}>
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100" role="img" aria-label={`Health score ring showing ${Math.round(score)} out of 100`}>
        <circle
          className="text-gray-200 dark:text-gray-800 stroke-current"
          strokeWidth="8"
          cx="50"
          cy="50"
          r={radius}
          fill="transparent"
        />
        <circle
          className={`${strokeColor} stroke-current transition-all duration-1000 ease-out`}
          strokeWidth="8"
          strokeLinecap="round"
          cx="50"
          cy="50"
          r={radius}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center text-center">
        <span className="text-3xl font-bold">{Math.round(score)}</span>
        {label && <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">{label}</span>}
      </div>
    </div>
  );
}

export default HealthScoreRing;
