"use client";

import { SKILL_TAGS } from "@/lib/skill-tags";

type Mode = "form" | "profile";

type Props = {
  selected: string[];
  onToggle: (tag: string) => void;
  mode?: Mode;
  /** For HTML forms: append hidden inputs with this name (multi-value). */
  formFieldName?: string;
};

export function TagCapsulePicker({
  selected,
  onToggle,
  mode = "profile",
  formFieldName,
}: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {formFieldName
        ? selected.map((t) => (
            <input key={t} type="hidden" name={formFieldName} value={t} readOnly />
          ))
        : null}
      {SKILL_TAGS.map((tag) => {
        const active = selected.includes(tag);
        return (
          <button
            key={tag}
            type="button"
            onClick={() => onToggle(tag)}
            className={`rounded-full border px-3 py-1 text-[11px] font-medium transition ${
              active
                ? "border-[#2E5BFF]/60 bg-[#2E5BFF]/15 text-[#2E5BFF]"
                : "border-zinc-800/60 bg-white/[0.03] text-zinc-400 backdrop-blur-sm hover:border-zinc-700/50 hover:text-zinc-200"
            } ${mode === "form" ? "py-1.5" : ""}`}
            aria-pressed={active}
          >
            {tag}
          </button>
        );
      })}
    </div>
  );
}
