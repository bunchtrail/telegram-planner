"use client";

import React, { useState } from "react";
import { format, addDays, startOfWeek, isSameDay } from "date-fns";
import { ru } from "date-fns/locale";
import {
  Plus,
  Check,
  Clock,
  Trash2,
  Calendar as CalendarIcon,
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// --- Утилиты ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Типы ---
type Task = {
  id: string;
  title: string;
  duration: number; // в минутах
  date: Date;
  completed: boolean;
};

// --- Компонент приложения ---
export default function PlannerApp() {
  // Состояние: Выбранная дата (по умолчанию сегодня)
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Состояние: Открыта ли шторка добавления
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Состояние: Тестовые данные (пока в памяти)
  const [tasks, setTasks] = useState<Task[]>([
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
  ]);

  // Данные новой задачи
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDuration, setNewTaskDuration] = useState(30);

  // --- Логика ---

  // Генерация дней недели (начиная с понедельника текущей недели)
  const startDate = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }).map((_, i) =>
    addDays(startDate, i),
  );

  // Фильтрация задач по выбранному дню
  const currentTasks = tasks.filter((task) =>
    isSameDay(task.date, selectedDate),
  );

  // Подсчет общего времени на день
  const totalMinutes = currentTasks.reduce(
    (acc, t) => acc + (t.completed ? 0 : t.duration),
    0,
  );
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  // Добавление задачи
  const handleAddTask = () => {
    if (!newTaskTitle.trim()) return;

    const newTask: Task = {
      id: Math.random().toString(36).substr(2, 9),
      title: newTaskTitle,
      duration: newTaskDuration,
      date: selectedDate,
      completed: false,
    };

    setTasks([...tasks, newTask]);
    setNewTaskTitle("");
    setNewTaskDuration(30);
    setIsAddOpen(false);
  };

  // Переключение статуса задачи
  const toggleTask = (id: string) => {
    setTasks(
      tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)),
    );
  };

  // Удаление задачи
  const deleteTask = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTasks(tasks.filter((t) => t.id !== id));
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-24 font-sans selection:bg-blue-100">
      {/* --- Хедер --- */}
      <header className="sticky top-0 z-10 bg-white px-4 pt-6 pb-4 shadow-sm">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wider text-gray-400">
              {format(selectedDate, "MMMM", { locale: ru })}
            </p>
            <h1 className="text-2xl font-bold capitalize text-gray-800">
              {format(selectedDate, "EEEE, d", { locale: ru })}
            </h1>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 rounded-lg bg-blue-50 px-2 py-1 text-sm font-medium text-blue-600">
              <Clock size={14} />
              <span>
                {hours}ч {minutes}м
              </span>
            </div>
          </div>
        </div>

        {/* Календарная лента */}
        <div className="no-scrollbar flex justify-between gap-2 overflow-x-auto pb-1">
          {weekDays.map((day) => {
            const isSelected = isSameDay(day, selectedDate);
            const isToday = isSameDay(day, new Date());

            return (
              <button
                key={day.toString()}
                onClick={() => setSelectedDate(day)}
                className={cn(
                  "flex h-[64px] min-w-[48px] flex-col items-center justify-center rounded-2xl border transition-all duration-200",
                  isSelected
                    ? "scale-105 transform border-blue-600 bg-blue-600 text-white shadow-md"
                    : "border-transparent bg-white text-gray-500 hover:bg-gray-100",
                )}
              >
                <span className="text-[10px] font-medium uppercase opacity-80">
                  {format(day, "EE", { locale: ru })}
                </span>
                <span
                  className={cn(
                    "text-lg font-bold",
                    isSelected
                      ? "text-white"
                      : isToday
                        ? "text-blue-600"
                        : "text-gray-800",
                  )}
                >
                  {format(day, "d")}
                </span>
                {/* Точка-индикатор (простая имитация) */}
                {isToday && !isSelected && (
                  <div className="mt-1 h-1 w-1 rounded-full bg-blue-500" />
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* --- Список задач --- */}
      <main className="space-y-3 px-4 py-6">
        {currentTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 opacity-60">
            <CalendarIcon size={48} className="mb-4 text-gray-300" />
            <p>Нет планов на этот день</p>
          </div>
        ) : (
          currentTasks.map((task) => (
            <div
              key={task.id}
              onClick={() => toggleTask(task.id)}
              className={cn(
                "group relative flex items-center rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-all active:scale-[0.98]",
                task.completed && "bg-gray-50 opacity-60",
              )}
            >
              {/* Чекбокс */}
              <div
                className={cn(
                  "mr-4 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                  task.completed
                    ? "border-blue-500 bg-blue-500"
                    : "border-gray-300 group-hover:border-blue-400",
                )}
              >
                {task.completed && <Check size={14} className="text-white" />}
              </div>

              {/* Контент */}
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "truncate text-base font-medium transition-all",
                    task.completed
                      ? "text-gray-400 line-through"
                      : "text-gray-800",
                  )}
                >
                  {task.title}
                </p>
              </div>

              {/* Бейдж времени */}
              <div className="flex items-center gap-3">
                <span className="whitespace-nowrap rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-600">
                  {task.duration} мин
                </span>
                <button
                  onClick={(e) => deleteTask(task.id, e)}
                  className="p-1 text-gray-300 transition-colors hover:text-red-500"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))
        )}
      </main>

      {/* --- FAB (Кнопка добавления) --- */}
      <button
        onClick={() => setIsAddOpen(true)}
        className="fixed bottom-6 right-6 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-xl shadow-blue-600/30 transition-transform active:scale-90"
      >
        <Plus size={28} />
      </button>

      {/* --- Шторка (Overlay) --- */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          {/* Фон затемнения */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={() => setIsAddOpen(false)}
          />

          {/* Контент шторки */}
          <div className="relative w-full max-w-md animate-in slide-in-from-bottom rounded-t-3xl bg-white p-6 shadow-2xl duration-300">
            <div className="mx-auto mb-6 h-1.5 w-12 rounded-full bg-gray-200" />

            <h2 className="mb-4 text-xl font-bold text-gray-800">
              Новая задача
            </h2>

            <input
              autoFocus
              type="text"
              placeholder="Что планируем?"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              className="mb-6 w-full rounded-xl border-none bg-gray-50 p-4 text-lg placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-blue-500"
            />

            <div className="mb-8">
              <p className="mb-3 text-sm font-medium text-gray-500">
                Длительность
              </p>
              <div className="flex flex-wrap gap-2">
                {[15, 30, 45, 60, 90, 120].map((mins) => (
                  <button
                    key={mins}
                    onClick={() => setNewTaskDuration(mins)}
                    className={cn(
                      "rounded-xl border px-4 py-2 text-sm font-medium transition-all",
                      newTaskDuration === mins
                        ? "border-blue-600 bg-blue-600 text-white shadow-md"
                        : "border-gray-200 bg-white text-gray-600 hover:border-blue-300",
                    )}
                  >
                    {mins}м
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleAddTask}
              disabled={!newTaskTitle}
              className="w-full rounded-xl bg-blue-600 py-4 text-lg font-bold text-white shadow-lg shadow-blue-600/20 transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300 active:scale-[0.98]"
            >
              Добавить в план
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
