"use client";

import { useRouter } from "next/navigation";

type MonthPickerProps = {
  value: string;
  years: number[];
};

const MONTHS = [
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
] as const;

export function MonthPicker({ value, years }: MonthPickerProps) {
  const router = useRouter();
  const [selectedYearRaw, selectedMonthRaw] = value.split("-");
  const selectedYear = selectedYearRaw ?? String(new Date().getFullYear());
  const selectedMonth = selectedMonthRaw ?? "01";

  function pushMonth(nextYear: string, nextMonth: string) {
    router.push(`/diary?month=${nextYear}-${nextMonth}`);
  }

  return (
    <div className="flex items-center justify-center gap-2">
      <label htmlFor="monthSelect" className="text-xs text-slate-400">
        Month
      </label>
      <select
        id="monthSelect"
        value={selectedMonth}
        onChange={(e) => pushMonth(selectedYear, e.target.value)}
        className="rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-xs text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
      >
        {MONTHS.map((month) => (
          <option key={month.value} value={month.value}>
            {month.label}
          </option>
        ))}
      </select>

      <label htmlFor="yearSelect" className="text-xs text-slate-400">
        Year
      </label>
      <select
        id="yearSelect"
        value={selectedYear}
        onChange={(e) => pushMonth(e.target.value, selectedMonth)}
        className="rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-xs text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
      >
        {years.map((year) => (
          <option key={year} value={String(year)}>
            {year}
          </option>
        ))}
      </select>
    </div>
  );
}
