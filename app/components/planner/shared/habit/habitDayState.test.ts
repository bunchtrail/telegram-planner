import { describe, expect, it } from 'vitest';
import { getHabitDayVisualState } from './habitDayState';

describe('getHabitDayVisualState', () => {
  const todayKey = '2026-04-18';

  it('returns future for future dates', () => {
    expect(
      getHabitDayVisualState({
        dateKey: '2026-04-19',
        isChecked: false,
        isPending: false,
        todayKey,
      }),
    ).toBe('future');
  });

  it('returns pending when a toggle is in flight', () => {
    expect(
      getHabitDayVisualState({
        dateKey: todayKey,
        isChecked: true,
        isPending: true,
        todayKey,
      }),
    ).toBe('pending');
  });

  it('returns done for completed past or current days', () => {
    expect(
      getHabitDayVisualState({
        dateKey: todayKey,
        isChecked: true,
        isPending: false,
        todayKey,
      }),
    ).toBe('done');
  });

  it('returns today for the current unchecked day', () => {
    expect(
      getHabitDayVisualState({
        dateKey: todayKey,
        isChecked: false,
        isPending: false,
        todayKey,
      }),
    ).toBe('today');
  });

  it('returns idle for unchecked past days', () => {
    expect(
      getHabitDayVisualState({
        dateKey: '2026-04-17',
        isChecked: false,
        isPending: false,
        todayKey,
      }),
    ).toBe('idle');
  });
});
