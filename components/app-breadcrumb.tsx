"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

const STROKE = 1.25;

type Crumb = { label: string; href?: string };

type Props = {
  items: Crumb[];
};

export function AppBreadcrumb({ items }: Props) {
  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-[11px]">
      {items.map((item, i) => {
        const last = i === items.length - 1;
        return (
          <span key={`${item.label}-${i}`} className="flex items-center gap-1.5">
            {i > 0 ? (
              <ChevronRight className="h-3 w-3 shrink-0 text-zinc-600" strokeWidth={STROKE} aria-hidden />
            ) : null}
            {last || !item.href ? (
              <span className={last ? "font-medium text-zinc-200" : "text-zinc-500"}>{item.label}</span>
            ) : (
              <Link href={item.href} className="text-zinc-500 transition hover:text-[#2E5BFF]">
                {item.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
