"use client";

import { type ReactNode } from "react";
import { motion } from "framer-motion";
import { Trophy } from "lucide-react";
import { useHaptic } from "../hooks/useHaptic";

type GoalCardProps = {
  title: string;
  current: number;
  target: number;
  unit: string;
  icon?: ReactNode;
  color?: string;
  onClick: () => void;
};

export default function GoalCard({
  title,
  current,
  target,
  unit,
  icon,
  color = "var(--accent)",
  onClick,
}: GoalCardProps) {
  const { impact } = useHaptic();
  const ratio = target > 0 ? current / target : 0;
  const percent = Math.min(100, Math.round(ratio * 100));

  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.96 }}
      onClick={() => {
        impact("light");
        onClick();
      }}
      className="relative flex w-[148px] flex-none flex-col justify-between overflow-hidden rounded-[28px] bg-[var(--surface)] p-4 text-left shadow-[var(--shadow-card)] transition-all snap-start hover:shadow-[var(--shadow-pop)] group border border-transparent hover:border-[var(--border)]"
    >
      <div
        className="absolute inset-0 opacity-[0.07] pointer-events-none group-hover:opacity-[0.12] transition-opacity"
        style={{ background: `linear-gradient(135deg, ${color}, transparent)` }}
      />

      <div className="relative z-10 flex items-start justify-between mb-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-[14px] bg-[var(--surface-2)] text-[var(--ink)] shadow-sm">
          {icon || <Trophy size={16} />}
        </div>

        <div className="relative flex h-9 w-9 items-center justify-center">
          <svg className="h-full w-full -rotate-90" viewBox="0 0 40 40">
            <circle
              cx="20"
              cy="20"
              r={radius}
              stroke="var(--border)"
              strokeWidth="3.5"
              fill="none"
              className="opacity-50"
            />
            <circle
              cx="20"
              cy="20"
              r={radius}
              stroke={color}
              strokeWidth="3.5"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <span className="absolute text-[9px] font-bold tabular-nums text-[var(--muted)]">
            {percent}%
          </span>
        </div>
      </div>

      <div className="relative z-10">
        <h3 className="font-[var(--font-display)] text-[15px] font-bold leading-tight text-[var(--ink)] line-clamp-2 mb-1">
          {title}
        </h3>
        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] opacity-80">
          {current} / {target} {unit}
        </p>
      </div>
    </motion.button>
  );
}
