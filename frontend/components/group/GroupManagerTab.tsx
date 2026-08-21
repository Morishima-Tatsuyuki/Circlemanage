"use client";

import { useState } from "react";
import { useGroupActions, type Group } from "@/lib/useGroups";

export default function GroupManagerTab({
  groupId,
  groups,
  switchGroup,
  onGroupsChanged,
}: {
  groupId: string;
  groups: Group[];
  switchGroup: (id: string) => void;
  onGroupsChanged: () => Promise<void>;
}) {
  const { createGroup, joinGroup } = useGroupActions();
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const [createName, setCreateName] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");

  const [joinCode, setJoinCode] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState("");

  const handleCopy = async (group: Group) => {
    try {
      await navigator.clipboard.writeText(group.invite_code);
      setCopiedId(group.id);
      setTimeout(() => setCopiedId((cur) => (cur === group.id ? null : cur)), 1500);
    } catch {
      // クリップボードAPIが使えない環境では黙って無視する
    }
  };

  const handleCreate = async () => {
    if (!createName.trim()) return;
    setCreateLoading(true);
    setCreateError("");
    try {
      const group = await createGroup(createName.trim());
      setCreateName("");
      await onGroupsChanged();
      switchGroup(String(group.id));
    } catch {
      setCreateError("グループの作成に失敗しました");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) return;
    setJoinLoading(true);
    setJoinError("");
    try {
      const group = await joinGroup(joinCode.trim());
      setJoinCode("");
      await onGroupsChanged();
      switchGroup(String(group.id));
    } catch {
      setJoinError("招待コードが見つかりません");
    } finally {
      setJoinLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">所属グループ</h3>
        {groups.map((g) => {
          const isActive = String(g.id) === groupId;
          return (
            <div
              key={g.id}
              className={`bg-white dark:bg-gray-800 rounded-2xl p-5 border transition-colors ${
                isActive
                  ? "border-blue-200 dark:border-blue-800 ring-1 ring-blue-100 dark:ring-blue-900/40"
                  : "border-gray-100 dark:border-gray-700"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-base font-semibold text-gray-800 dark:text-gray-100">{g.name}</p>
                {isActive ? (
                  <span className="flex-shrink-0 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2.5 py-1 rounded-full">
                    選択中
                  </span>
                ) : (
                  <button
                    onClick={() => switchGroup(String(g.id))}
                    className="flex-shrink-0 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    切り替え
                  </button>
                )}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">招待コード</span>
                <code className="flex-1 text-sm font-mono tracking-widest text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-700 rounded-lg px-3 py-1.5 text-center">
                  {g.invite_code}
                </code>
                <button
                  onClick={() => handleCopy(g)}
                  className="flex-shrink-0 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 px-2 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  {copiedId === g.id ? "コピーしました" : "コピー"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">新しいグループを作成</h3>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
            placeholder="グループ名（例：〇〇サークル）"
            className="flex-1 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <button
            onClick={handleCreate}
            disabled={createLoading || !createName.trim()}
            className="flex-shrink-0 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-semibold transition-colors"
          >
            {createLoading ? "作成中..." : "作成する"}
          </button>
        </div>
        {createError && <p className="text-sm text-red-500">{createError}</p>}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">招待コードで参加</h3>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="招待コード（例：AB3D9F2K）"
            className="flex-1 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 tracking-widest text-center font-mono focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <button
            onClick={handleJoin}
            disabled={joinLoading || !joinCode.trim()}
            className="flex-shrink-0 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-semibold transition-colors"
          >
            {joinLoading ? "参加中..." : "参加する"}
          </button>
        </div>
        {joinError && <p className="text-sm text-red-500">{joinError}</p>}
      </div>
    </div>
  );
}
