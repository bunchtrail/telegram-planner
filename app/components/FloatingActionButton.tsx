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
      className="fixed z-20 flex h-14 w-14 touch-manipulation items-center justify-center rounded-full bg-[var(--ink)] text-[var(--bg)] shadow-[var(--shadow-pop)] transition-transform active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] bottom-[calc(2rem+max(env(safe-area-inset-bottom),var(--tg-content-safe-bottom,0px)))] right-[calc(1.5rem+max(env(safe-area-inset-right),var(--tg-content-safe-right,0px)))]"
    >
      <Plus size={28} />
    </button>
  );
});

FloatingActionButton.displayName = "FloatingActionButton";

export default FloatingActionButton;
