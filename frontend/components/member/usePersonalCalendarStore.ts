"use client";

import { useState, useEffect, useCallback } from "react";
import type { MemberEvent } from "./useMemberCalendarStore";

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

export function usePersonalCalendarStore() {
  const [events, setEvents] = useLocalStorage<MemberEvent[]>(
    "personal_calendar_events",
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
