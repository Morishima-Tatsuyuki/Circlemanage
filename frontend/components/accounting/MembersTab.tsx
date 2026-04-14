"use client";

import { useState } from "react";
import type { useAccountingStore } from "./useAccountingStore";

type Store = ReturnType<typeof useAccountingStore>;

export default function MembersTab({ store }: { store: Store }) {
  const { members, addMember, deleteMember, dues, addDues, deleteDues, memberDuesTotal } = store;
  const [newName, setNewName] = useState("");
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [duesForm, setDuesForm] = useState({ amount: "", date: new Date().toISOString().slice(0, 10), note: "" });

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    addMember(newName);
    setNewName("");
  };

  const handleAddDues = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember || !duesForm.amount) return;
    addDues({
      memberId: selectedMember,
      amount: parseInt(duesForm.amount),
      date: duesForm.date,
      note: duesForm.note,
    });
    setDuesForm({ amount: "", date: new Date().toISOString().slice(0, 10), note: "" });
  };

  const selectedMemberObj = members.find((m) => m.id === selectedMember);
  const memberDuesList = dues.filter((d) => d.memberId === selectedMember).sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-5">
      {/* メンバー追加 */}
      <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">メンバーを追加</h2>
        <form onSubmit={handleAddMember} className="flex gap-2">
          <input
            type="text"
            placeholder="名前を入力"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="flex-1 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 placeholder-gray-300 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
            追加
          </button>
        </form>
      </div>

      {/* メンバー一覧 */}
      <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl overflow-hidden">
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 px-5 py-3 border-b border-gray-100 dark:border-gray-700">
          メンバー一覧 ({members.length}名)
        </p>
        {members.length === 0 ? (
          <p className="p-8 text-center text-gray-400 text-sm">メンバーがいません</p>
        ) : (
          <ul className="divide-y divide-gray-50 dark:divide-gray-700">
            {members.map((m) => (
              <li
                key={m.id}
                className={`flex items-center px-5 py-3 gap-3 cursor-pointer transition-colors group ${
                  selectedMember === m.id ? "bg-blue-50 dark:bg-blue-900/20" : "hover:bg-gray-50 dark:hover:bg-gray-700/50"
                }`}
                onClick={() => setSelectedMember(selectedMember === m.id ? null : m.id)}
              >
                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-sm font-medium text-blue-700 dark:text-blue-300 flex-shrink-0">
                  {m.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{m.name}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">登録: {m.createdAt}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-green-600 dark:text-green-400">{memberDuesTotal(m.id).toLocaleString()}円</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">部費累計</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteMember(m.id); }}
                  className="ml-1 text-gray-200 dark:text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all text-lg leading-none"
                >×</button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 部費入力（メンバー選択時） */}
      {selectedMember && selectedMemberObj && (
        <div className="bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
            {selectedMemberObj.name} の部費を記録
          </h2>
          <form onSubmit={handleAddDues} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">金額（円）</label>
                <input
                  type="number"
                  min={1}
                  placeholder="例：3000"
                  value={duesForm.amount}
                  onChange={(e) => setDuesForm((f) => ({ ...f, amount: e.target.value }))}
                  required
                  className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 placeholder-gray-300 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">日付</label>
                <input
                  type="date"
                  value={duesForm.date}
                  onChange={(e) => setDuesForm((f) => ({ ...f, date: e.target.value }))}
                  required
                  className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">メモ（任意）</label>
              <input
                type="text"
                placeholder="例：2024年前期分"
                value={duesForm.note}
                onChange={(e) => setDuesForm((f) => ({ ...f, note: e.target.value }))}
                className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 placeholder-gray-300 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <button type="submit" className="w-full py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors">
              部費を記録
            </button>
          </form>

          {/* 部費履歴 */}
          {memberDuesList.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">支払い履歴</p>
              {memberDuesList.map((d) => (
                <div key={d.id} className="flex items-center gap-2 group">
                  <p className="text-xs text-gray-400 dark:text-gray-500 w-20 flex-shrink-0">{d.date}</p>
                  <p className="text-sm text-gray-700 dark:text-gray-200 flex-1">{d.note || "部費"}</p>
                  <p className="text-sm font-semibold text-green-600 dark:text-green-400">{d.amount.toLocaleString()}円</p>
                  <button
                    onClick={() => deleteDues(d.id)}
                    className="text-gray-200 dark:text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all text-base leading-none"
                  >×</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
