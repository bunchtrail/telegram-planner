import { forwardRef } from 'react';
import { Plus } from 'lucide-react';
import { motion } from 'framer-motion';

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
			whileTap={{ scale: 0.9 }}
			whileHover={{ scale: 1.05 }}
			initial={{ scale: 0, rotate: -45, opacity: 0 }}
			animate={{ scale: 1, rotate: 0, opacity: 1 }}
			exit={{
				scale: 0,
				rotate: 45,
				opacity: 0,
				transition: { duration: 0.15 },
			}}
			transition={{ type: 'spring', stiffness: 400, damping: 25 }}
			aria-label="Добавить задачу"
			className="fixed z-20 flex h-14 w-14 touch-manipulation items-center justify-center rounded-[24px] bg-[var(--ink)] text-[var(--bg)] shadow-[var(--shadow-pop)] focus-visible:outline-none bottom-[calc(5.5rem+var(--keyboard-height,0px)+max(env(safe-area-inset-bottom),var(--tg-content-safe-bottom,0px)))] right-[calc(1.5rem+max(env(safe-area-inset-right),var(--tg-content-safe-right,0px)))] active:shadow-none"
		>
			<div className="absolute inset-0 rounded-[24px] bg-gradient-to-tr from-white/10 to-transparent pointer-events-none" />
			<Plus size={28} strokeWidth={2.5} />
		</motion.button>
	);
});

FloatingActionButton.displayName = 'FloatingActionButton';

export default FloatingActionButton;

