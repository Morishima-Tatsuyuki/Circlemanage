"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useMyGroups, ACTIVE_GROUP_KEY, type Group } from "@/lib/useGroups";
import GroupOnboarding from "./GroupOnboarding";

export default function GroupGate({
  children,
}: {
  children: (groupId: string, ctx: { groups: Group[]; switchGroup: (id: string) => void; refresh: () => Promise<void> }) => ReactNode;
}) {
  const { status } = useSession();
  const { groups, loading, refresh } = useMyGroups();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (groups.length === 0) { setActiveId(null); return; }

    const paramId = searchParams.get("groupId");
    const storedId = typeof window !== "undefined" ? localStorage.getItem(ACTIVE_GROUP_KEY) : null;
    const candidate = paramId || storedId;
    const valid = candidate && groups.some((g) => String(g.id) === candidate) ? candidate : String(groups[0].id);

    setActiveId(valid);
    try { localStorage.setItem(ACTIVE_GROUP_KEY, valid); } catch {}

    if (paramId !== valid) {
      const params = new URLSearchParams(Array.from(searchParams.entries()));
      params.set("groupId", valid);
      router.replace(`/?${params.toString()}`, { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, groups]);

  const switchGroup = (id: string) => {
    setActiveId(id);
    try { localStorage.setItem(ACTIVE_GROUP_KEY, id); } catch {}
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    params.set("groupId", id);
    router.replace(`/?${params.toString()}`, { scroll: false });
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-sm text-gray-400 dark:text-gray-500">読み込み中...</p>
      </div>
    );
  }

  if (groups.length === 0) {
    return <GroupOnboarding onDone={() => refresh()} />;
  }

  if (!activeId) return null;

  return <>{children(activeId, { groups, switchGroup, refresh })}</>;
}
