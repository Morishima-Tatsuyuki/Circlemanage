"use client";

import { useState } from "react";
import { useGroupActions, type Group } from "@/lib/useGroups";
import { importLegacyLocalStorage } from "@/lib/localStorageImport";

export default function GroupOnboarding({ onDone }: { onDone: (group: Group) => void }) {
  const { createGroup, joinGroup } = useGroupActions();
  const [mode, setMode] = useState<"choice" | "join" | "create">("choice");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    setError("");
    try {
      const group = await createGroup(name.trim());
      await importLegacyLocalStorage(group.id);
      onDone(group);
    } catch {
      setError("グループの作成に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError("");
    try {
      const group = await joinGroup(code.trim());
      onDone(group);
    } catch {
      setError("招待コードが見つかりません");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto pt-12 space-y-6">
      <div className="text-center">
        <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">グループに参加</p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
          サークルの招待コードを入力するか、新しく作成してください
        </p>
      </div>

      {mode === "choice" && (
        <div className="grid grid-cols-1 gap-4">
          <button
            onClick={() => setMode("join")}
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm hover:shadow-lg border border-gray-100 dark:border-gray-700 hover:border-blue-100 dark:hover:border-blue-800 active:scale-[.98] transition-all duration-200 text-left"
          >
            <p className="text-lg font-semibold text-gray-800 dark:text-gray-100">招待コードで参加</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">既存のグループの招待コードを持っている場合</p>
          </button>
          <button
            onClick={() => setMode("create")}
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm hover:shadow-lg border border-gray-100 dark:border-gray-700 hover:border-blue-100 dark:hover:border-blue-800 active:scale-[.98] transition-all duration-200 text-left"
          >
            <p className="text-lg font-semibold text-gray-800 dark:text-gray-100">新しいグループを作成</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">初めて使う場合はこちら</p>
          </button>
        </div>
      )}

      {mode === "join" && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="招待コード（例：AB3D9F2K）"
            className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 tracking-widest text-center font-mono focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            onClick={handleJoin}
            disabled={loading || !code.trim()}
            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-semibold transition-colors"
          >
            {loading ? "参加中..." : "参加する"}
          </button>
          <button
            onClick={() => { setMode("choice"); setError(""); }}
            className="w-full text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            戻る
          </button>
        </div>
      )}

      {mode === "create" && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="グループ名（例：〇〇サークル）"
            className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            onClick={handleCreate}
            disabled={loading || !name.trim()}
            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-semibold transition-colors"
          >
            {loading ? "作成中..." : "作成する"}
          </button>
          <button
            onClick={() => { setMode("choice"); setError(""); }}
            className="w-full text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            戻る
          </button>
        </div>
      )}
    </div>
  );
}
