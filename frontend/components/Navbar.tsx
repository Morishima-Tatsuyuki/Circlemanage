"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AuthButton from "@/components/AuthButton";

const SunIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="4"/>
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
  </svg>
);

const MoonIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
  </svg>
);

const TABS = [
  { id: "stay",       label: "宿泊大会管理", soon: false },
  { id: "camp",       label: "合宿管理",     soon: true  },
  { id: "accounting", label: "会計管理",     soon: true  },
  { id: "schedule",   label: "スケジュール",  soon: true  },
];

const PAGE_TITLES: Record<string, string> = {
  "/haisha":     "配車",
  "/accounting": "会計",
};

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [dark, setDark] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const isHome = pathname === "/";
  const pageTitle = PAGE_TITLES[pathname];

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    if (stored === "dark" || (!stored && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      document.documentElement.classList.add("dark");
      setDark(true);
    }
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  return (
    <>
      {/* トップナビ */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 z-50 transition-colors duration-200">
        <div className="max-w-5xl mx-auto px-5 flex items-center justify-between h-full">

          {/* 左: 戻るボタン（モバイル・非ホーム）またはロゴ */}
          <div className="flex items-center gap-3">
            {!isHome && (
              <button
                onClick={() => router.back()}
                className="md:hidden flex items-center gap-1 text-blue-600 dark:text-blue-400 text-sm font-medium -ml-1 py-1 px-1">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 19l-7-7 7-7"/>
                </svg>
              </button>
            )}
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="8" cy="12" r="3"/>
                  <circle cx="16" cy="12" r="3"/>
                </svg>
              </div>
              {isHome ? (
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                  サークル管理
                </span>
              ) : (
                <>
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-100 md:hidden">
                    {pageTitle ?? "サークル管理"}
                  </span>
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-100 hidden md:block">
                    サークル管理
                  </span>
                </>
              )}
            </Link>
          </div>

          {/* 右: ダークモード + ログイン + ハンバーガー */}
          <div className="flex items-center gap-1">
            <button
              onClick={toggleDark}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              {dark ? <SunIcon /> : <MoonIcon />}
            </button>
            <div className="hidden md:block">
              <AuthButton />
            </div>
            <button
              onClick={() => setMenuOpen(true)}
              className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ml-1"
              aria-label="メニューを開く">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M4 6h16M4 12h16M4 18h16"/>
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* ドロワーオーバーレイ */}
      {menuOpen && (
        <div className="fixed inset-0 z-[100]" onClick={() => setMenuOpen(false)}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm animate-fade-in" />

          <div
            className="absolute right-0 top-0 h-full w-72 bg-white dark:bg-gray-900 shadow-2xl flex flex-col animate-slide-in-right"
            onClick={(e) => e.stopPropagation()}>

            {/* ドロワーヘッダー */}
            <div className="flex items-center justify-between px-6 h-14 border-b border-gray-100 dark:border-gray-800">
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">メニュー</span>
              <button
                onClick={() => setMenuOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>

            {/* ナビ項目 */}
            <nav className="flex-1 px-4 py-6 space-y-1">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    router.push(`/?tab=${tab.id}`);
                    setMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-150"
                >
                  <span className="text-sm font-medium">{tab.label}</span>
                  {tab.soon && (
                    <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                      Soon
                    </span>
                  )}
                </button>
              ))}
            </nav>

            {/* ドロワーフッター */}
            <div className="px-6 py-5 border-t border-gray-100 dark:border-gray-800 space-y-3">
              <div className="md:hidden">
                <AuthButton />
              </div>
              <p className="text-xs text-gray-400 text-center">サークル管理ツール</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
