"use client";

import { useState, useEffect, useCallback } from "react";

function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) setValue(JSON.parse(raw));
    } catch {}
  }, [key]);
  const set = useCallback((v: T | ((prev: T) => T)) => {
    setValue((prev) => {
      const next = typeof v === "function" ? (v as (p: T) => T)(prev) : v;
      localStorage.setItem(key, JSON.stringify(next));
      return next;
    });
  }, [key]);
  return [value, set] as const;
}

export const DEFAULT_EVENT_NAMES = ["清水が丘", "日吉南", "大田区民"];
export const DEFAULT_TIME_SLOTS = [
  "18:00~21:00",
  "18:00~22:00",
  "17:00~19:00",
  "19:00~21:00",
];

// Google Calendar API の colors.get エンドポイントが返す background 色に合わせた値
export const GOOGLE_CALENDAR_COLORS: { id: string; name: string; hex: string }[] = [
  { id: "1",  name: "ラベンダー",   hex: "#a4bdfc" },
  { id: "2",  name: "セージ",      hex: "#51b749" },
  { id: "3",  name: "グレープ",    hex: "#dbadff" },
  { id: "4",  name: "フラミンゴ",   hex: "#ff887c" },
  { id: "5",  name: "バナナ",      hex: "#fbd75b" },
  { id: "6",  name: "タンジェリン", hex: "#ffb878" },
  { id: "7",  name: "ピーコック",   hex: "#46d6db" },
  { id: "8",  name: "ブルーベリー", hex: "#5484ed" },
  { id: "9",  name: "バジル",      hex: "#61bd86" },
  { id: "10", name: "トマト",      hex: "#dc2127" },
  { id: "11", name: "グラファイト", hex: "#e1e1e1" },
];

export interface CalendarEntry {
  id: string;
  date: string; // YYYY-MM-DD
  eventName: string;
  timeSlot: string;
  colorId: string;
  gcalEventId?: string; // Google Calendar イベントID（削除連携用）
}

export function useCalendarStore() {
  const [eventNames, setEventNames] = useLocalStorage<string[]>(
    "calendar_event_names",
    DEFAULT_EVENT_NAMES
  );
  const [timeSlots, setTimeSlots] = useLocalStorage<string[]>(
    "calendar_time_slots",
    DEFAULT_TIME_SLOTS
  );
  const [entries, setEntries] = useLocalStorage<CalendarEntry[]>(
    "calendar_entries",
    []
  );

  const addEventName = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return false;
    if (eventNames.includes(trimmed)) return false;
    setEventNames((prev) => [...prev, trimmed]);
    return true;
  };
  const deleteEventName = (name: string) => {
    setEventNames((prev) => prev.filter((n) => n !== name));
  };

  const addTimeSlot = (slot: string) => {
    const trimmed = slot.trim();
    if (!trimmed) return false;
    if (timeSlots.includes(trimmed)) return false;
    setTimeSlots((prev) => [...prev, trimmed]);
    return true;
  };
  const deleteTimeSlot = (slot: string) => {
    setTimeSlots((prev) => prev.filter((s) => s !== slot));
  };

  const addEntry = (entry: Omit<CalendarEntry, "id">): string => {
    const id = crypto.randomUUID();
    setEntries((prev) => [...prev, { ...entry, id }]);
    return id;
  };
  const deleteEntry = (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };
  const entriesForDate = (date: string) => entries.filter((e) => e.date === date);

  return {
    eventNames, addEventName, deleteEventName,
    timeSlots, addTimeSlot, deleteTimeSlot,
    entries, addEntry, deleteEntry, entriesForDate,
  };
}
