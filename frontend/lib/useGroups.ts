"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { apiGet, apiPost } from "./apiClient";

export type Group = {
  id: number;
  name: string;
  invite_code: string;
};

// 現在選択中のグループID。GroupGate(ページ本体)とNavbar(チーム切替UI)の
// 両方から参照するため、ここで一元管理する。
export const ACTIVE_GROUP_KEY = "active_group_id";

export function useMyGroups() {
  const { data: session, status } = useSession();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!session?.backendToken) return;
    setLoading(true);
    try {
      const data = await apiGet<Group[]>("/groups/mine", session);
      setGroups(data);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (status === "authenticated" && session?.backendToken) {
      refresh();
    } else if (status === "unauthenticated") {
      setLoading(false);
    }
  }, [status, session?.backendToken, refresh]);

  return { groups, loading: status === "loading" || loading, refresh };
}

export function useGroupActions() {
  const { data: session } = useSession();

  const createGroup = useCallback(
    (name: string) => apiPost<Group>("/groups", { name }, session),
    [session]
  );

  const joinGroup = useCallback(
    (inviteCode: string) => apiPost<Group>("/groups/join", { invite_code: inviteCode }, session),
    [session]
  );

  return { createGroup, joinGroup };
}
