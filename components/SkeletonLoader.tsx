"use client";

import React from "react";

export interface SkeletonLineProps {
  width?: string;
  height?: string;
  className?: string;
}

export function SkeletonLine({ width = "100%", height = "12px", className = "" }: SkeletonLineProps) {
  return (
    <div 
      className={`skeleton rounded-md ${className}`} 
      style={{ width, height }} 
    />
  );
}

export interface SkeletonCircleProps {
  size?: number;
  className?: string;
}

export function SkeletonCircle({ size = 40, className = "" }: SkeletonCircleProps) {
  return (
    <div 
      className={`skeleton rounded-full ${className}`} 
      style={{ width: size, height: size }} 
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 w-full">
      <SkeletonLine width="60%" height="20px" className="mb-4" />
      <div className="space-y-3">
        <SkeletonLine width="100%" />
        <SkeletonLine width="90%" />
        <SkeletonLine width="75%" />
      </div>
    </div>
  );
}

export function SkeletonMetricCard() {
  return (
    <div className="p-5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 w-full flex items-center space-x-4">
      <SkeletonCircle size={48} />
      <div className="space-y-2 flex-1">
        <SkeletonLine width="40%" height="16px" />
        <SkeletonLine width="25%" height="24px" />
      </div>
    </div>
  );
}

export default {
  Card: SkeletonCard,
  Line: SkeletonLine,
  Circle: SkeletonCircle,
  MetricCard: SkeletonMetricCard,
};
