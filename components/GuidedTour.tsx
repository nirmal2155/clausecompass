"use client";

import React, { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";

export interface TourStep {
  target: string;
  title: string;
  description: string;
  position?: "top" | "bottom" | "left" | "right";
}

export interface GuidedTourProps {
  steps: TourStep[];
  onComplete: () => void;
  isOpen: boolean;
}

export function GuidedTour({ steps, onComplete, isOpen }: GuidedTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const updatePosition = useCallback(() => {
    if (!isOpen || steps.length === 0) return;
    const step = steps[currentStep];
    const element = document.querySelector(step.target);
    if (element) {
      setTargetRect(element.getBoundingClientRect());
      element.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
    } else {
      setTargetRect(null);
    }
  }, [isOpen, steps, currentStep]);

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      window.addEventListener("resize", updatePosition);
      window.addEventListener("scroll", updatePosition);
    }
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition);
    };
  }, [isOpen, updatePosition]);

  if (!isOpen || steps.length === 0 || typeof document === "undefined") return null;

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;

  const handleNext = () => {
    if (isLast) {
      onComplete();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const getTooltipStyle = () => {
    if (!targetRect) return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };

    const padding = 16;
    let top = 0;
    let left = 0;
    const pos = step.position || "bottom";

    switch (pos) {
      case "top":
        top = targetRect.top - padding;
        left = targetRect.left + targetRect.width / 2;
        return { top, left, transform: "translate(-50%, -100%)" };
      case "bottom":
        top = targetRect.bottom + padding;
        left = targetRect.left + targetRect.width / 2;
        return { top, left, transform: "translate(-50%, 0)" };
      case "left":
        top = targetRect.top + targetRect.height / 2;
        left = targetRect.left - padding;
        return { top, left, transform: "translate(-100%, -50%)" };
      case "right":
        top = targetRect.top + targetRect.height / 2;
        left = targetRect.right + padding;
        return { top, left, transform: "translate(0, -50%)" };
      default:
        return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] pointer-events-none">
      {/* Background Dimming with Cutout */}
      {targetRect && (
        <div 
          className="absolute inset-0 bg-black/50 transition-all duration-300 pointer-events-auto"
          style={{
            clipPath: `polygon(
              0% 0%, 0% 100%, 100% 100%, 100% 0%, 0% 0%,
              ${targetRect.left - 8}px ${targetRect.top - 8}px,
              ${targetRect.right + 8}px ${targetRect.top - 8}px,
              ${targetRect.right + 8}px ${targetRect.bottom + 8}px,
              ${targetRect.left - 8}px ${targetRect.bottom + 8}px,
              ${targetRect.left - 8}px ${targetRect.top - 8}px
            )`
          }}
        />
      )}
      {!targetRect && <div className="absolute inset-0 bg-black/50 pointer-events-auto" />}

      {/* Tooltip */}
      <div 
        className="absolute bg-white rounded-xl shadow-xl p-5 w-80 pointer-events-auto modal-content transition-all duration-300"
        style={getTooltipStyle()}
      >
        <div className="text-xs font-semibold text-blue-600 mb-1">
          Step {currentStep + 1} of {steps.length}
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-2">{step.title}</h3>
        <p className="text-sm text-slate-600 mb-6">{step.description}</p>
        
        <div className="flex items-center justify-between">
          <button 
            onClick={handleSkip}
            className="text-sm text-slate-500 hover:text-slate-800 transition-colors"
          >
            Skip Tour
          </button>
          <button 
            onClick={handleNext}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {isLast ? "Finish Tour" : "Next"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default GuidedTour;
