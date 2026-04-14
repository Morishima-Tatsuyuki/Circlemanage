"use client";

import { useState } from "react";
import { useAccountingStore } from "./useAccountingStore";
import OverviewTab from "./OverviewTab";
import MembersTab from "./MembersTab";
import EventsTab from "./EventsTab";
import TransactionsTab from "./TransactionsTab";

type Tab = "overview" | "members" | "events" | "transactions";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "overview",      label: "概要",   icon: "📊" },
  { id: "members",       label: "メンバー", icon: "👥" },
  { id: "events",        label: "イベント", icon: "🎉" },
  { id: "transactions",  label: "取引",   icon: "💴" },
];

export default function AccountingApp() {
  const [tab, setTab] = useState<Tab>("overview");
  const store = useAccountingStore();

  return (
    <div className="space-y-4">
      {/* ヘッダー */}
      <div>
        <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">会計</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">サークルの収支を管理します</p>
      </div>

      {/* タブ */}
      <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1 gap-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg transition-all ${
              tab === t.id
                ? "bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            }`}
          >
            <span>{t.icon}</span>
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* タブコンテンツ */}
      {tab === "overview"     && <OverviewTab     store={store} />}
      {tab === "members"      && <MembersTab       store={store} />}
      {tab === "events"       && <EventsTab        store={store} />}
      {tab === "transactions" && <TransactionsTab  store={store} />}
    </div>
  );
}
