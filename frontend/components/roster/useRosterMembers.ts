"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { apiGet, apiPut } from "@/lib/apiClient";

export type RosterMember = {
  grade: string;
  name: string;
  studentId: string;
  birthDate: string;
};

type ApiRosterMember = {
  id: number;
  grade: string;
  name: string;
  student_id: string;
  birth_date: string;
};

function fromApi(m: ApiRosterMember): RosterMember {
  return { grade: m.grade, name: m.name, studentId: m.student_id, birthDate: m.birth_date };
}

export function useRosterMembers(groupId: string) {
  const { data: session } = useSession();
  const [members, setMembersState] = useState<RosterMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!groupId || !session) return;
    let cancelled = false;
    setLoading(true);
    apiGet<ApiRosterMember[]>(`/groups/${groupId}/roster`, session)
      .then((data) => { if (!cancelled) setMembersState(data.map(fromApi)); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [groupId, session]);

  const setMembers = useCallback(async (next: RosterMember[]) => {
    setMembersState(next);
    if (!groupId) return;
    await apiPut(`/groups/${groupId}/roster`, {
      members: next.map((m) => ({
        grade: m.grade, name: m.name, student_id: m.studentId, birth_date: m.birthDate,
      })),
    }, session);
  }, [groupId, session]);

  return { members, setMembers, loading };
}
