// Utility functions extracted from game-state.tsx and ChancellorGame.tsx.

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function getMonthName(month: number): string {
  return MONTH_NAMES[month - 1];
}

export function calculateTurnMetadata(turn: number): {
  month: number;
  year: number;
  monthName: string;
} {
  // Turn 0 = July 2024
  const totalMonths = turn + 6;
  const year = 2024 + Math.floor(totalMonths / 12);
  const month = (totalMonths % 12) + 1;
  return {
    month,
    year,
    monthName: getMonthName(month),
  };
}
