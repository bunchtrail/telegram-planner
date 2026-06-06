export type Habit = {
	id: string;
	name: string;
	icon: string;
	color: string;
	sortOrder: number;
	archived: boolean;
	remindAtMinutes: number | null;
};

export type HabitLog = {
	id: string;
	habitId: string;
	date: string; // yyyy-MM-dd
};
