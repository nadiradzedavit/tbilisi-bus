"use client";

import { useRef, type KeyboardEvent } from "react";
import { motion } from "framer-motion";
import type { StyleMode } from "@/lib/types";

const OPTIONS: Array<{
  key: StyleMode;
  label: string;
  icon: React.ReactNode;
}> = [
  {
    key: "dark",
    label: "Dark map",
    icon: (
      <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M16 11.5A6 6 0 0 1 8.5 4a6.5 6.5 0 1 0 7.5 7.5Z" />
      </svg>
    ),
  },
  {
    key: "satellite",
    label: "Satellite 3D",
    icon: (
      <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M5 9.5L13.5 4l2.5 2.5L6.5 15 3 16l1-3.5Z" />
        <path d="M11.5 5.5l3 3" />
        <path d="M5 9.5l-1 1.5L3 16l5-1 1.5-1" />
        <circle cx="14" cy="14" r="1.2" fill="currentColor" />
        <path d="M14 12.5v-1M15.5 14h1M14 15.5v1M12.5 14h-1" />
      </svg>
    ),
  },
];

export default function MapStyleToggle({
  value,
  onChange,
}: {
  value: StyleMode;
  onChange: (m: StyleMode) => void;
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
      className="glass absolute right-3 top-3 z-10 flex items-center gap-0.5 rounded-lg p-0.5"
      role="radiogroup"
      aria-label="Map style"
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
                layoutId="map-style-pill"
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
