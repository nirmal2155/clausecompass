"use client";

import React from "react";

export interface ProgressBarProps {
  loading: boolean;
}

export function ProgressBar({ loading }: ProgressBarProps) {
  if (!loading) return null;

  return (
    <div className="fixed top-0 left-0 right-0 h-1 z-[100] overflow-hidden bg-gray-100 dark:bg-gray-800 transition-opacity duration-300">
      <div className="h-full progress-bar origin-left" />
    </div>
  );
}

export default ProgressBar;
