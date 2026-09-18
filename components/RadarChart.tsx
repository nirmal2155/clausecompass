"use client";

import React, { useEffect, useState } from "react";

export interface RadarChartData {
  label: string;
  value: number;
  max: number;
}

export interface RadarChartProps {
  data: RadarChartData[];
  size?: number;
}

export function RadarChart({ data, size = 240 }: RadarChartProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const center = size / 2;
  const radius = (size / 2) * 0.7; // Leave room for labels

  // 5 axes: angles = 0, 72, 144, 216, 288 degrees. Top is -90 degrees.
  const angles = [0, 1, 2, 3, 4].map((i) => (i * 2 * Math.PI) / 5 - Math.PI / 2);

  const getPoint = (value: number, max: number, angle: number) => {
    const ratio = Math.min(Math.max(value / max, 0), 1);
    const r = radius * ratio;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return { x, y };
  };

  const gridLevels = [0.33, 0.66, 1];

  return (
    <div className="relative flex justify-center items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="overflow-visible">
        {/* Grid */}
        {gridLevels.map((level, i) => (
          <polygon
            key={`grid-${i}`}
            points={angles
              .map((angle) => {
                const x = center + radius * level * Math.cos(angle);
                const y = center + radius * level * Math.sin(angle);
                return `${x},${y}`;
              })
              .join(" ")}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth={1}
          />
        ))}

        {/* Axes */}
        {angles.map((angle, i) => {
          const x = center + radius * Math.cos(angle);
          const y = center + radius * Math.sin(angle);
          return (
            <line
              key={`axis-${i}`}
              x1={center}
              y1={center}
              x2={x}
              y2={y}
              stroke="#e2e8f0"
              strokeWidth={1}
            />
          );
        })}

        {/* Data Polygon */}
        <polygon
          points={data
            .map((d, i) => {
              const { x, y } = getPoint(mounted ? d.value : 0, d.max, angles[i]);
              return `${x},${y}`;
            })
            .join(" ")}
          fill="#2563eb20"
          stroke="#2563eb"
          strokeWidth={2}
          className="transition-all duration-1000 ease-out"
        />

        {/* Data points */}
        {data.map((d, i) => {
          const { x, y } = getPoint(mounted ? d.value : 0, d.max, angles[i]);
          return (
            <circle
              key={`point-${i}`}
              cx={x}
              cy={y}
              r={4}
              fill="#2563eb"
              className="transition-all duration-1000 ease-out"
            />
          );
        })}
      </svg>

      {/* Labels */}
      {data.map((d, i) => {
        const { x, y } = getPoint(d.max, d.max, angles[i]);
        // Push labels out a bit
        const labelRadius = radius + 25;
        const lx = center + labelRadius * Math.cos(angles[i]);
        const ly = center + labelRadius * Math.sin(angles[i]);
        
        return (
          <div
            key={`label-${i}`}
            className="absolute text-xs text-slate-600 font-medium whitespace-nowrap text-center animate-fade-in-up"
            style={{
              left: lx,
              top: ly,
              transform: "translate(-50%, -50%)",
            }}
          >
            <div>{d.label}</div>
            <div className="font-bold text-slate-900 text-[10px]">{d.value}</div>
          </div>
        );
      })}
    </div>
  );
}

export default RadarChart;
