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
  const set = useCallback(
    (v: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const next = typeof v === "function" ? (v as (p: T) => T)(prev) : v;
        localStorage.setItem(key, JSON.stringify(next));
        return next;
      });
    },
    [key]
  );
  return [value, set] as const;
}

export interface MemberEvent {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  time: string;  // "" or "HH:MM~HH:MM"
  note: string;
  colorHex: string;
}

export const EVENT_COLORS = [
  { hex: "#3B82F6", name: "ブルー" },
  { hex: "#22C55E", name: "グリーン" },
  { hex: "#EF4444", name: "レッド" },
  { hex: "#F97316", name: "オレンジ" },
  { hex: "#A855F7", name: "パープル" },
  { hex: "#EAB308", name: "イエロー" },
];

export function useMemberCalendarStore() {
  const [events, setEvents] = useLocalStorage<MemberEvent[]>(
    "member_calendar_events",
    []
  );

  const addEvent = (ev: Omit<MemberEvent, "id">): string => {
    const id = crypto.randomUUID();
    setEvents((prev) => [...prev, { ...ev, id }]);
    return id;
  };

  const deleteEvent = (id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
  };

  const eventsForDate = (date: string) =>
    events.filter((e) => e.date === date);

  return { events, addEvent, deleteEvent, eventsForDate };
}
