"use client";

import type { useAccountingStore } from "./useAccountingStore";

type Store = ReturnType<typeof useAccountingStore>;

export default function OverviewTab({ store }: { store: Store }) {
  const { balance, totalIncome, totalExpense, totalDues, transactions, events, eventBalance } = store;
  const recent = transactions.slice(0, 8);

  return (
    <div className="space-y-5">
      {/* 残高サマリー */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-4 text-center">
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">残高</p>
          <p className={`text-lg font-bold ${balance >= 0 ? "text-blue-600 dark:text-blue-400" : "text-red-500"}`}>
            {balance < 0 && "−"}{Math.abs(balance).toLocaleString()}
            <span className="text-xs font-normal ml-0.5">円</span>
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-4 text-center">
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">収入合計</p>
          <p className="text-lg font-bold text-green-600 dark:text-green-400">
            {totalIncome.toLocaleString()}<span className="text-xs font-normal ml-0.5">円</span>
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-4 text-center">
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">支出合計</p>
          <p className="text-lg font-bold text-red-500 dark:text-red-400">
            {totalExpense.toLocaleString()}<span className="text-xs font-normal ml-0.5">円</span>
          </p>
        </div>
      </div>

      {/* 部費収入 */}
      <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-200">部費収入合計</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">メンバーから集めた部費の累計</p>
        </div>
        <p className="text-lg font-bold text-green-600 dark:text-green-400">
          {totalDues.toLocaleString()}<span className="text-xs font-normal ml-0.5">円</span>
        </p>
      </div>

      {/* イベント別サマリー */}
      {events.length > 0 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl overflow-hidden">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 px-5 py-3 border-b border-gray-100 dark:border-gray-700">
            イベント別収支
          </p>
          <ul className="divide-y divide-gray-50 dark:divide-gray-700">
            {events.slice(0, 5).map((ev) => {
              const { income, expense, balance: evBal } = eventBalance(ev.id);
              return (
                <li key={ev.id} className="flex items-center px-5 py-3 gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 dark:text-gray-100 truncate">{ev.name}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{ev.date}</p>
                  </div>
                  <div className="text-right text-xs text-gray-400 dark:text-gray-500 space-y-0.5">
                    <div className="text-green-600 dark:text-green-400">+{income.toLocaleString()}円</div>
                    <div className="text-red-500 dark:text-red-400">−{expense.toLocaleString()}円</div>
                  </div>
                  <p className={`text-sm font-semibold w-20 text-right ${evBal >= 0 ? "text-blue-600 dark:text-blue-400" : "text-red-500"}`}>
                    {evBal < 0 && "−"}{Math.abs(evBal).toLocaleString()}円
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* 最近の取引 */}
      <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl overflow-hidden">
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 px-5 py-3 border-b border-gray-100 dark:border-gray-700">
          最近の取引
        </p>
        {recent.length === 0 ? (
          <p className="p-8 text-center text-gray-400 text-sm">取引がありません</p>
        ) : (
          <ul className="divide-y divide-gray-50 dark:divide-gray-700">
            {recent.map((tx) => (
              <li key={tx.id} className="flex items-center px-5 py-3 gap-3">
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${
                  tx.type === "income" ? "bg-green-50 dark:bg-green-900/30 text-green-600" : "bg-red-50 dark:bg-red-900/30 text-red-500"
                }`}>
                  {tx.type === "income" ? "↑" : "↓"}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 dark:text-gray-100 truncate">{tx.description}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{tx.date} · {tx.category}</p>
                </div>
                <span className={`text-sm font-semibold ${tx.type === "income" ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"}`}>
                  {tx.type === "income" ? "+" : "−"}{tx.amount.toLocaleString()}円
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
