"use client";

import { useRef, type KeyboardEvent } from "react";
import { motion } from "framer-motion";
import type { DirectionFilter } from "@/lib/types";

const OPTIONS: Array<{
  key: DirectionFilter;
  label: string;
  icon: React.ReactNode;
}> = [
  {
    key: "both",
    label: "Both directions",
    icon: (
      <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M5 10h10" />
        <path d="M7 7l-2 3 2 3" />
        <path d="M13 7l2 3-2 3" />
      </svg>
    ),
  },
  {
    key: "forward",
    label: "Forward only",
    icon: (
      <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M4 10h12" />
        <path d="M13 7l3 3-3 3" />
      </svg>
    ),
  },
  {
    key: "backward",
    label: "Backward only",
    icon: (
      <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M16 10H4" />
        <path d="M7 7l-3 3 3 3" />
      </svg>
    ),
  },
];

export default function DirectionToggle({
  value,
  onChange,
}: {
  value: DirectionFilter;
  onChange: (v: DirectionFilter) => void;
}) {
  const buttonsRef = useRef<Array<HTMLButtonElement | null>>([]);

  const onKey = (e: KeyboardEvent<HTMLButtonElement>, idx: number) => {
    let next = idx;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (idx + 1) % OPTIONS.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (idx - 1 + OPTIONS.length) % OPTIONS.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = OPTIONS.length - 1;
    else return;
    e.preventDefault();
    const target = OPTIONS[next].key;
    onChange(target);
    buttonsRef.current[next]?.focus();
  };

  return (
    <div
      className="glass absolute left-3 top-3 z-10 flex items-center gap-0.5 rounded-lg p-0.5"
      role="radiogroup"
      aria-label="Route direction filter"
    >
      {OPTIONS.map((opt, idx) => {
        const active = value === opt.key;
        return (
          <button
            key={opt.key}
            ref={(el) => {
              buttonsRef.current[idx] = el;
            }}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={opt.label}
            title={opt.label}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(opt.key)}
            onKeyDown={(e) => onKey(e, idx)}
            className="ring-focus relative grid place-items-center rounded-md text-fg-dim transition-colors hover:text-fg active:scale-[0.96]"
            style={{ width: 44, height: 44 }}
          >
            {active && (
              <motion.span
                layoutId="direction-toggle-pill"
                className="absolute inset-0 rounded-md bg-bg-elevated"
                style={{ boxShadow: "0 0 0 1px rgba(96,165,250,0.35)" }}
                transition={{ type: "spring", stiffness: 480, damping: 32 }}
                aria-hidden
              />
            )}
            <span
              className="relative z-10"
              style={{ color: active ? "#60a5fa" : undefined }}
            >
              {opt.icon}
            </span>
          </button>
        );
      })}
    </div>
  );
}
