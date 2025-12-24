import { Plus } from "lucide-react";

type FloatingActionButtonProps = {
  onClick: () => void;
};

export default function FloatingActionButton({
  onClick,
}: FloatingActionButtonProps) {
  return (
    <button
      onClick={onClick}
      type="button"
      aria-label="Добавить задачу"
      className="fixed bottom-6 right-6 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-ink)] shadow-[0_18px_30px_-16px_rgba(23,95,86,0.6)] transition-transform active:scale-90"
    >
      <Plus size={28} />
    </button>
  );
}
