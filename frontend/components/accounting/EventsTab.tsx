"use client";

import { useState } from "react";
import type { useAccountingStore } from "./useAccountingStore";
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES, type TransactionType } from "./types";

type Store = ReturnType<typeof useAccountingStore>;

export default function EventsTab({ store }: { store: Store }) {
  const { events, addEvent, deleteEvent, eventBalance, addTransaction, deleteTransaction } = store;
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [eventForm, setEventForm] = useState({ name: "", date: new Date().toISOString().slice(0, 10), description: "" });
  const [txForm, setTxForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    type: "expense" as TransactionType,
    category: EXPENSE_CATEGORIES[0],
    description: "",
    amount: "",
  });

  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventForm.name.trim()) return;
    addEvent({ name: eventForm.name.trim(), date: eventForm.date, description: eventForm.description });
    setEventForm({ name: "", date: new Date().toISOString().slice(0, 10), description: "" });
    setShowForm(false);
  };

  const handleAddTx = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId || !txForm.description.trim() || !txForm.amount) return;
    addTransaction({
      date: txForm.date,
      type: txForm.type,
      category: txForm.category,
      description: txForm.description.trim(),
      amount: parseInt(txForm.amount),
      eventId: selectedEventId,
    });
    setTxForm((f) => ({ ...f, description: "", amount: "" }));
  };

  const handleTypeChange = (type: TransactionType) => {
    const cats = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    setTxForm((f) => ({ ...f, type, category: cats[0] }));
  };

  const selectedEvent = events.find((e) => e.id === selectedEventId);
  const { income, expense, balance, txs } = selectedEventId ? eventBalance(selectedEventId) : { income: 0, expense: 0, balance: 0, txs: [] };
  const categories = txForm.type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  return (
    <div className="space-y-5">
      {/* イベント作成ボタン */}
      <button
        onClick={() => setShowForm((v) => !v)}
        className="w-full py-2.5 border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-400 dark:text-gray-500 hover:border-blue-300 hover:text-blue-500 transition-colors"
      >
        + イベントを作成
      </button>

      {/* イベント作成フォーム */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">新しいイベント</h2>
          <form onSubmit={handleAddEvent} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">イベント名</label>
                <input
                  type="text"
                  placeholder="例：新歓コンパ"
                  value={eventForm.name}
                  onChange={(e) => setEventForm((f) => ({ ...f, name: e.target.value }))}
                  required
                  className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 placeholder-gray-300 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">日付</label>
                <input
                  type="date"
                  value={eventForm.date}
                  onChange={(e) => setEventForm((f) => ({ ...f, date: e.target.value }))}
                  className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">説明（任意）</label>
              <input
                type="text"
                placeholder="例：新入生歓迎イベント"
                value={eventForm.description}
                onChange={(e) => setEventForm((f) => ({ ...f, description: e.target.value }))}
                className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 placeholder-gray-300 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">作成</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-gray-500 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors">キャンセル</button>
            </div>
          </form>
        </div>
      )}

      {/* イベント一覧 */}
      {events.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-8 text-center text-gray-400 text-sm">
          イベントがありません
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl overflow-hidden">
          <ul className="divide-y divide-gray-50 dark:divide-gray-700">
            {events.map((ev) => {
              const { income: ei, expense: ee, balance: eb } = eventBalance(ev.id);
              const isSelected = selectedEventId === ev.id;
              return (
                <li key={ev.id}>
                  <div
                    className={`flex items-center px-5 py-3 gap-3 cursor-pointer transition-colors group ${
                      isSelected ? "bg-blue-50 dark:bg-blue-900/20" : "hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    }`}
                    onClick={() => setSelectedEventId(isSelected ? null : ev.id)}
                  >
                    <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center text-base flex-shrink-0">
                      🎉
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{ev.name}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{ev.date}{ev.description && ` · ${ev.description}`}</p>
                    </div>
                    <div className="text-right text-xs text-gray-400 dark:text-gray-500">
                      <div className="text-green-600 dark:text-green-400">+{ei.toLocaleString()}円</div>
                      <div className="text-red-500 dark:text-red-400">−{ee.toLocaleString()}円</div>
                    </div>
                    <p className={`text-sm font-bold w-20 text-right ${eb >= 0 ? "text-blue-600 dark:text-blue-400" : "text-red-500"}`}>
                      {eb < 0 && "−"}{Math.abs(eb).toLocaleString()}円
                    </p>
                    <button
                      onClick={(e2) => { e2.stopPropagation(); deleteEvent(ev.id); if (selectedEventId === ev.id) setSelectedEventId(null); }}
                      className="ml-1 text-gray-200 dark:text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all text-lg leading-none"
                    >×</button>
                  </div>

                  {/* イベント詳細（展開） */}
                  {isSelected && selectedEvent && (
                    <div className="px-5 pb-5 pt-2 bg-blue-50/50 dark:bg-blue-900/10 space-y-4">
                      {/* 収支追加フォーム */}
                      <form onSubmit={handleAddTx} className="bg-white dark:bg-gray-800 rounded-xl p-4 space-y-3 border border-blue-100 dark:border-blue-800">
                        <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">このイベントの収支を追加</p>
                        <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600 w-fit">
                          {(["expense", "income"] as TransactionType[]).map((t) => (
                            <button key={t} type="button" onClick={() => handleTypeChange(t)}
                              className={`px-4 py-1.5 text-xs font-medium transition-colors ${
                                txForm.type === t
                                  ? t === "income" ? "bg-green-500 text-white" : "bg-red-400 text-white"
                                  : "bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                              }`}>
                              {t === "income" ? "収入" : "支出"}
                            </button>
                          ))}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <select value={txForm.category} onChange={(e) => setTxForm((f) => ({ ...f, category: e.target.value }))}
                            className="border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400">
                            {categories.map((c) => <option key={c}>{c}</option>)}
                          </select>
                          <input type="date" value={txForm.date} onChange={(e) => setTxForm((f) => ({ ...f, date: e.target.value }))}
                            className="border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400" />
                          <input type="text" placeholder="説明" value={txForm.description} onChange={(e) => setTxForm((f) => ({ ...f, description: e.target.value }))} required
                            className="border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 placeholder-gray-300 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400" />
                          <input type="number" min={1} placeholder="金額（円）" value={txForm.amount} onChange={(e) => setTxForm((f) => ({ ...f, amount: e.target.value }))} required
                            className="border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 placeholder-gray-300 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400" />
                        </div>
                        <button type="submit" className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">追加</button>
                      </form>

                      {/* このイベントの取引一覧 */}
                      {txs.length > 0 && (
                        <div className="space-y-1">
                          {txs.map((tx) => (
                            <div key={tx.id} className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-lg px-3 py-2 group">
                              <span className={`text-sm ${tx.type === "income" ? "text-green-600" : "text-red-500"}`}>{tx.type === "income" ? "↑" : "↓"}</span>
                              <p className="text-xs text-gray-400 dark:text-gray-500 w-16 flex-shrink-0">{tx.date}</p>
                              <p className="text-sm text-gray-700 dark:text-gray-200 flex-1 truncate">{tx.description}</p>
                              <p className={`text-sm font-semibold ${tx.type === "income" ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"}`}>
                                {tx.type === "income" ? "+" : "−"}{tx.amount.toLocaleString()}円
                              </p>
                              <button onClick={() => deleteTransaction(tx.id)}
                                className="text-gray-200 dark:text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all text-base leading-none">×</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
