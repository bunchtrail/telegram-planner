import type { Task } from "../types/task";

export const seedTasks: Task[] = [
  {
    id: "1",
    title: "Созвон с командой",
    duration: 30,
    date: new Date(),
    completed: false,
  },
  {
    id: "2",
    title: "Сделать дизайн макет",
    duration: 90,
    date: new Date(),
    completed: true,
  },
];
