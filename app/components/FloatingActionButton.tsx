import { forwardRef } from "react";
import { Plus } from "lucide-react";

type FloatingActionButtonProps = {
  onClick: () => void;
};

const FloatingActionButton = forwardRef<
  HTMLButtonElement,
  FloatingActionButtonProps
>(({ onClick }, ref) => {
  return (
    <button
      ref={ref}
      onClick={onClick}
      type="button"
      aria-label="Добавить задачу"
      className="fixed z-20 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--accent-strong)] text-[var(--accent-ink)] shadow-[var(--shadow-pop)] transition-all hover:shadow-[var(--shadow-card)] active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)] bottom-[calc(1.5rem+env(safe-area-inset-bottom))] right-[calc(1.5rem+env(safe-area-inset-right))]"
    >
      <Plus size={28} />
    </button>
  );
});

FloatingActionButton.displayName = "FloatingActionButton";

export default FloatingActionButton;
