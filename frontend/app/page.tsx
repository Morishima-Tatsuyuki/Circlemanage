"use client";

import Link from "next/link";

const MENU_ITEMS = [
  {
    href: "/haisha",
    icon: "🚗",
    label: "配車",
    description: "移動時間・人間関係を考慮した最適な配車パターンを自動計算します",
    iconBg: "bg-blue-100 dark:bg-blue-900/40",
  },
  {
    href: "/accounting",
    icon: "💴",
    label: "会計",
    description: "イベントの収支を記録・管理し、メンバー間の精算をサポートします",
    iconBg: "bg-blue-50 dark:bg-blue-900/20",
  },
];

export default function HomePage() {
  return (
    <div className="space-y-12">
      {/* ヒーロー */}
      <div className="text-center pt-6 pb-2">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-50 tracking-tight mb-4">
          イベント管理
        </h1>
        <p className="text-base text-gray-500 dark:text-gray-400">
          チームのイベントを、もっとスマートに。
        </p>
      </div>

      {/* メニューカード */}
      <div className="grid grid-cols-2 gap-5">
        {MENU_ITEMS.map((item) => (
          <Link key={item.href} href={item.href}
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 flex flex-col gap-5 shadow-sm hover:shadow-md border border-gray-100 dark:border-gray-700 hover:border-blue-100 dark:hover:border-blue-800 active:scale-[.98] transition-all duration-200">
            <div className={`w-12 h-12 ${item.iconBg} rounded-xl flex items-center justify-center text-2xl`}>
              {item.icon}
            </div>
            <div>
              <p className="text-lg font-semibold text-gray-800 dark:text-gray-100">{item.label}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{item.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
