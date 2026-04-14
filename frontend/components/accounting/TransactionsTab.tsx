"use client";

import { useState } from "react";
import type { useAccountingStore } from "./useAccountingStore";
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES, type TransactionType } from "./types";

type Store = ReturnType<typeof useAccountingStore>;

export default function TransactionsTab({ store }: { store: Store }) {
  const { transactions, addTransaction, deleteTransaction, events, members } = store;
  const [filterType, setFilterType] = useState<"all" | TransactionType>("all");
  const [filterEvent, setFilterEvent] = useState<string>("all");
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    type: "expense" as TransactionType,
    category: EXPENSE_CATEGORIES[0],
    description: "",
    amount: "",
    eventId: "",
    memberId: "",
  });

  const handleTypeChange = (type: TransactionType) => {
    const cats = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    setForm((f) => ({ ...f, type, category: cats[0] }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseInt(form.amount);
    if (!form.description.trim() || isNaN(amount) || amount <= 0) return;
    addTransaction({
      date: form.date,
      type: form.type,
      category: form.category,
      description: form.description.trim(),
      amount,
      eventId: form.eventId || undefined,
      memberId: form.memberId || undefined,
    });
    setForm((f) => ({ ...f, description: "", amount: "", eventId: "", memberId: "" }));
  };

  const categories = form.type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const filtered = transactions.filter((t) => {
    if (filterType !== "all" && t.type !== filterType) return false;
    if (filterEvent !== "all" && t.eventId !== filterEvent) return false;
    return true;
  });

  const eventName = (id?: string) => id ? (events.find((e) => e.id === id)?.name ?? "") : "";
  const memberName = (id?: string) => id ? (members.find((m) => m.id === id)?.name ?? "") : "";

  return (
    <div className="space-y-5">
      {/* 追加フォーム */}
      <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">取引を追加</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600 w-fit">
            {(["expense", "income"] as TransactionType[]).map((t) => (
              <button key={t} type="button" onClick={() => handleTypeChange(t)}
                className={`px-5 py-1.5 text-sm font-medium transition-colors ${
                  form.type === t
                    ? t === "income" ? "bg-green-500 text-white" : "bg-red-400 text-white"
                    : "bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}>
                {t === "income" ? "収入" : "支出"}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">日付</label>
              <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} required
                className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">カテゴリ</label>
              <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400">
                {categories.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">説明</label>
              <input type="text" placeholder="例：4月活動費" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} required
                className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 placeholder-gray-300 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">金額（円）</label>
              <input type="number" min={1} placeholder="例：5000" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} required
                className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 placeholder-gray-300 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            {events.length > 0 && (
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">イベント（任意）</label>
                <select value={form.eventId} onChange={(e) => setForm((f) => ({ ...f, eventId: e.target.value }))}
                  className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400">
                  <option value="">なし</option>
                  {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
                </select>
              </div>
            )}
            {members.length > 0 && (
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">メンバー（任意）</label>
                <select value={form.memberId} onChange={(e) => setForm((f) => ({ ...f, memberId: e.target.value }))}
                  className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400">
                  <option value="">なし</option>
                  {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
            )}
          </div>

          <button type="submit" className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">追加</button>
        </form>
      </div>

      {/* フィルター + 一覧 */}
      <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100 dark:border-gray-700 flex-wrap">
          <div className="flex gap-1">
            {(["all", "income", "expense"] as const).map((f) => (
              <button key={f} onClick={() => setFilterType(f)}
                className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                  filterType === f ? "bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-medium" : "text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}>
                {f === "all" ? "すべて" : f === "income" ? "収入" : "支出"}
              </button>
            ))}
          </div>
          {events.length > 0 && (
            <select value={filterEvent} onChange={(e) => setFilterEvent(e.target.value)}
              className="ml-auto border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1 text-xs bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400">
              <option value="all">全イベント</option>
              {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
            </select>
          )}
        </div>

        {filtered.length === 0 ? (
          <p className="p-8 text-center text-gray-400 text-sm">取引がありません</p>
        ) : (
          <ul className="divide-y divide-gray-50 dark:divide-gray-700">
            {filtered.map((tx) => (
              <li key={tx.id} className="flex items-center px-5 py-3 gap-3 group">
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${
                  tx.type === "income" ? "bg-green-50 dark:bg-green-900/30" : "bg-red-50 dark:bg-red-900/30"
                }`}>
                  {tx.type === "income" ? "↑" : "↓"}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 dark:text-gray-100 truncate">{tx.description}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                    {tx.date} · {tx.category}
                    {tx.eventId && ` · ${eventName(tx.eventId)}`}
                    {tx.memberId && ` · ${memberName(tx.memberId)}`}
                  </p>
                </div>
                <span className={`text-sm font-semibold flex-shrink-0 ${tx.type === "income" ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"}`}>
                  {tx.type === "income" ? "+" : "−"}{tx.amount.toLocaleString()}円
                </span>
                <button onClick={() => deleteTransaction(tx.id)}
                  className="ml-1 text-gray-200 dark:text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all text-lg leading-none flex-shrink-0">×</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
