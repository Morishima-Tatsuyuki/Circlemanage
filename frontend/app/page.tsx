"use client";

import Link from "next/link";

const MENU_ITEMS = [
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

export default function HomePage() {
  return (
    <div className="space-y-14">

      {/* ヒーロー */}
      <div className="text-center pt-8 pb-2">
        <div className="inline-flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-medium px-3 py-1.5 rounded-full mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse-soft" />
          チームツール
        </div>
        <h1 className="text-5xl font-bold text-gray-900 dark:text-gray-50 tracking-tight mb-4 leading-tight">
          宿泊大会管理
        </h1>
        <p className="text-base text-gray-500 dark:text-gray-400 max-w-xs mx-auto leading-relaxed">
          モルテンカップの運営を楽にしよう
        </p>
      </div>

      {/* メニューカード */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {MENU_ITEMS.map((item) => (
          <Link key={item.href} href={item.href}
            className="group bg-white dark:bg-gray-800 rounded-2xl p-6 flex flex-col gap-5 shadow-sm hover:shadow-lg border border-gray-100 dark:border-gray-700 hover:border-blue-100 dark:hover:border-blue-800 active:scale-[.98] transition-all duration-200">
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
    </div>
  );
}
