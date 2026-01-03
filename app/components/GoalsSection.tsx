"use client";

import { Plus } from "lucide-react";
import GoalCard from "./GoalCard";
import { useHaptic } from "../hooks/useHaptic";

export default function GoalsSection() {
  const { impact } = useHaptic();

  const goals = [
    {
      id: 1,
      title: "Прочитать книги",
      current: 3,
      target: 12,
      unit: "кн",
      color: "#FF9F0A",
      icon: <span aria-hidden>📚</span>,
    },
    {
      id: 2,
      title: "Накопить на Mac",
      current: 45,
      target: 150,
      unit: "k",
      color: "#32ADE6",
      icon: <span aria-hidden>💻</span>,
    },
  ];

  return (
    <div className="mb-2 pl-[max(1rem,env(safe-area-inset-left),var(--tg-content-safe-left,0px))]">
      <div className="flex items-center justify-between pr-[max(1rem,env(safe-area-inset-right),var(--tg-content-safe-right,0px))] mb-2 mt-1">
        <h2 className="text-[13px] font-bold text-[var(--muted)] uppercase tracking-wider ml-1">
          Цели
        </h2>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-6 pt-1 pr-4 no-scrollbar snap-x snap-mandatory -mb-4">
        {goals.map((goal) => (
          <GoalCard
            key={goal.id}
            title={goal.title}
            current={goal.current}
            target={goal.target}
            unit={goal.unit}
            color={goal.color}
            icon={goal.icon}
            onClick={() => undefined}
          />
        ))}

        <button
          type="button"
          onClick={() => impact("medium")}
          className="snap-start flex w-[60px] flex-none flex-col items-center justify-center rounded-[28px] border-2 border-dashed border-[var(--border)] bg-[var(--surface-2)]/30 text-[var(--muted)] transition-all active:scale-95 hover:border-[var(--accent)] hover:text-[var(--accent)]"
          aria-label="Добавить цель"
        >
          <Plus size={24} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
