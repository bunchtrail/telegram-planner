import { forwardRef } from "react";
import { Plus } from "lucide-react";
import { motion } from "framer-motion";

type FloatingActionButtonProps = {
  onClick: () => void;
};

const FloatingActionButton = forwardRef<
  HTMLButtonElement,
  FloatingActionButtonProps
>(({ onClick }, ref) => {
  return (
    <motion.button
      ref={ref}
      onClick={onClick}
      type="button"
      whileTap={{ scale: 0.85, rotate: 90 }}
      whileHover={{ scale: 1.05 }}
      initial={{ scale: 0, rotate: -90 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      aria-label="Добавить задачу"
      className="fixed z-20 flex h-14 w-14 touch-manipulation items-center justify-center rounded-[24px] bg-[var(--ink)] text-[var(--bg)] shadow-[var(--shadow-pop)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] bottom-[calc(2rem+max(env(safe-area-inset-bottom),var(--tg-content-safe-bottom,0px)))] right-[calc(1.5rem+max(env(safe-area-inset-right),var(--tg-content-safe-right,0px)))]"
    >
      <div className="absolute inset-0 rounded-[24px] bg-gradient-to-tr from-white/10 to-transparent pointer-events-none" />
      <Plus size={28} strokeWidth={2.5} />
    </motion.button>
  );
});

FloatingActionButton.displayName = "FloatingActionButton";

export default FloatingActionButton;
