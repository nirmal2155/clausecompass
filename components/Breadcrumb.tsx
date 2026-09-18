"use client";

import React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  if (!items || items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="flex items-center text-xs text-slate-500 whitespace-nowrap overflow-x-auto pb-1 scrollbar-hide">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        
        return (
          <React.Fragment key={index}>
            {isLast || !item.href ? (
              <span className={`font-medium ${isLast ? 'text-slate-800' : 'text-slate-500'}`}>
                {item.label}
              </span>
            ) : (
              <Link href={item.href} className="hover:text-blue-600 hover:underline transition-colors">
                {item.label}
              </Link>
            )}
            
            {!isLast && (
              <ChevronRight size={14} className="mx-2 text-slate-400 flex-shrink-0" />
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}

export default Breadcrumb;
