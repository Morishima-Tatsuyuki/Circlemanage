"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import GoogleLoginButton from "@/components/GoogleLoginButton";

const CarIcon = ({ className }: { className: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 17H3a1 1 0 01-1-1v-4l2.5-5h11l2.5 5v4a1 1 0 01-1 1h-2" />
    <circle cx="7.5" cy="17" r="1.5" />
    <circle cx="16.5" cy="17" r="1.5" />
    <path d="M7.5 15.5h9" />
  </svg>
);

const WalletIcon = ({ className }: { className: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <path d="M2 10h20" />
    <path d="M16 14h2" />
  </svg>
);

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

const navItems = [
  { href: "/haisha",     label: "配車", Icon: CarIcon },
  { href: "/accounting", label: "会計", Icon: WalletIcon },
];

const PAGE_TITLES: Record<string, string> = {
  "/haisha":     "配車",
  "/accounting": "会計",
};

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [dark, setDark] = useState(false);

  const isHome = pathname === "/";

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    if (stored === "dark" || (!stored && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      document.documentElement.classList.add("dark");
      setDark(true);
    }
  }, []);

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  return (
    <>
      {/* トップナビ（全画面共通） */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 z-50 transition-colors duration-200">
        <div className="max-w-5xl mx-auto px-5 flex items-center justify-between h-full">

          {/* 左: ロゴ + デスクトップナビ */}
          <div className="flex items-center gap-6">
            {/* モバイル: 戻るボタン */}
            {!isHome && (
              <button
                onClick={() => router.back()}
                className="md:hidden flex items-center gap-1 text-blue-600 dark:text-blue-400 text-sm font-medium -ml-1">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 19l-7-7 7-7"/>
                </svg>
                {PAGE_TITLES[pathname] ? "" : "戻る"}
              </button>
            )}

            {/* ロゴ */}
            <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
              <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
                </svg>
              </div>
              <span className={`text-sm font-semibold text-gray-800 dark:text-gray-100 ${!isHome ? "hidden md:block" : ""}`}>
                イベント管理
              </span>
            </Link>

            {/* デスクトップ: ナビ項目 */}
            <nav className="hidden md:flex items-center gap-0.5">
              {navItems.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link key={item.href} href={item.href}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-150 ${
                      active
                        ? "text-blue-700 dark:text-blue-400 font-medium bg-blue-50 dark:bg-blue-900/20"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
                    }`}>
                    <item.Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* 右: ダークモード + ログイン */}
          <div className="flex items-center gap-1">
            <button
              onClick={toggleDark}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              {dark ? <SunIcon /> : <MoonIcon />}
            </button>
            <GoogleLoginButton />
          </div>
        </div>
      </header>

      {/* モバイル: ボトムナビ */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 flex z-50 transition-colors duration-200">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link key={item.href} href={item.href}
              className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs transition-all duration-150 ${
                active ? "text-blue-600 dark:text-blue-400" : "text-gray-400 dark:text-gray-600"
              }`}>
              <item.Icon className="w-6 h-6" />
              {item.label}
              {active && <span className="w-1 h-1 rounded-full bg-blue-500" />}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
