"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { apiGet, apiPost, apiDelete } from "@/lib/apiClient";

export interface MemberEvent {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  time: string;  // "" or "HH:MM~HH:MM"
  note: string;
  colorHex: string;
}

type ApiScheduleEvent = {
  id: number;
  date: string;
  title: string;
  time: string;
  note: string;
  color_hex: string;
};

function fromApi(e: ApiScheduleEvent): MemberEvent {
  return { id: String(e.id), date: e.date, title: e.title, time: e.time, note: e.note, colorHex: e.color_hex };
}

export const EVENT_COLORS = [
  { hex: "#3B82F6", name: "ブルー" },
  { hex: "#22C55E", name: "グリーン" },
  { hex: "#EF4444", name: "レッド" },
  { hex: "#F97316", name: "オレンジ" },
  { hex: "#A855F7", name: "パープル" },
  { hex: "#EAB308", name: "イエロー" },
];

export function useMemberCalendarStore(groupId: string) {
  const { data: session } = useSession();
  const [events, setEvents] = useState<MemberEvent[]>([]);

  useEffect(() => {
    if (!groupId || !session) return;
    let cancelled = false;
    apiGet<ApiScheduleEvent[]>(`/groups/${groupId}/schedule`, session)
      .then((data) => { if (!cancelled) setEvents(data.map(fromApi)); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [groupId, session]);

  const addEvent = useCallback(async (ev: Omit<MemberEvent, "id">): Promise<string> => {
    const created = await apiPost<ApiScheduleEvent>(`/groups/${groupId}/schedule`, {
      date: ev.date, title: ev.title, time: ev.time, note: ev.note, color_hex: ev.colorHex,
    }, session);
    const mapped = fromApi(created);
    setEvents((prev) => [...prev, mapped]);
    return mapped.id;
  }, [groupId, session]);

  const deleteEvent = useCallback((id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
    apiDelete(`/groups/${groupId}/schedule/${id}`, session).catch(() => {});
  }, [groupId, session]);

  const eventsForDate = useCallback((date: string) => events.filter((e) => e.date === date), [events]);

  return { events, addEvent, deleteEvent, eventsForDate };
}
