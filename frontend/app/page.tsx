"use client";

import Link from "next/link";
import { useState } from "react";
import { useSession } from "next-auth/react";

const TABS = [
  { id: "stay",       label: "宿泊大会管理" },
  { id: "camp",       label: "合宿管理" },
  { id: "accounting", label: "会計管理" },
  { id: "schedule",   label: "スケジュール" },
];

const STAY_ITEMS = [
  {
    href: "/haisha",
    icon: "🚗",
    label: "配車",
    description: "移動時間・人間関係を考慮した最適な配車パターンを自動計算します",
    iconBg: "bg-blue-100 dark:bg-blue-900/40",
    tag: "AI最適化",
  },
  {
    href: "/accounting",
    icon: "💴",
    label: "会計",
    description: "イベントの収支を記録・管理し、メンバー間の精算をサポートします",
    iconBg: "bg-indigo-50 dark:bg-indigo-900/20",
    tag: "収支管理",
  },
];

function ComingSoon({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-3xl mb-5">
        🚧
      </div>
      <p className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">{label}</p>
      <p className="text-sm text-gray-400 dark:text-gray-500">Coming Soon</p>
    </div>
  );
}

export default function HomePage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState("stay");

  const userName = session?.user?.name;

  return (
    <div className="space-y-8">

      {/* グリーティング */}
      <div className="pt-4">
        <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">
          {userName ? `こんにちは、${userName}さん` : "こんにちは"}
        </p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
          今日も運営を楽にしよう
        </p>
      </div>

      {/* タブ */}
      <div>
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 overflow-x-auto no-scrollbar">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                activeTab === tab.id
                  ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* タブコンテンツ */}
        <div className="mt-6">

          {activeTab === "stay" && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {STAY_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group bg-white dark:bg-gray-800 rounded-2xl p-6 flex flex-col gap-5 shadow-sm hover:shadow-lg border border-gray-100 dark:border-gray-700 hover:border-blue-100 dark:hover:border-blue-800 active:scale-[.98] transition-all duration-200"
                >
                  <div className="flex items-start justify-between">
                    <div className={`w-12 h-12 ${item.iconBg} rounded-xl flex items-center justify-center text-2xl`}>
                      {item.icon}
                    </div>
                    <span className="text-xs font-medium text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2.5 py-1 rounded-full">
                      {item.tag}
                    </span>
                  </div>
                  <div>
                    <p className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-1.5">{item.label}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{item.description}</p>
                  </div>
                  <div className="flex items-center text-blue-600 dark:text-blue-400 text-sm font-medium gap-1 group-hover:gap-2 transition-all">
                    開く
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {activeTab === "camp"       && <ComingSoon label="合宿管理" />}
          {activeTab === "accounting" && <ComingSoon label="会計管理" />}
          {activeTab === "schedule"   && <ComingSoon label="スケジュール" />}

        </div>
      </div>
    </div>
  );
}
