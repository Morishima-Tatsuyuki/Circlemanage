"use client";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import AuthButton from "@/components/AuthButton";
import { TEAM_TABS } from "@/lib/teamTabs";
import { useMyGroups, ACTIVE_GROUP_KEY } from "@/lib/useGroups";

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

const PAGE_TITLES: Record<string, string> = {
  "/haisha":     "配車",
  "/accounting": "会計",
};

// ハンバーガーメニューの最上部に常時表示するチーム切替。ページ(GroupGate)を
// 経由せずどの画面からでもチームを切り替えられるようにするため、
// useMyGroupsを直接呼んでlocalStorageのactive_group_idを更新する。
function TeamSwitcher({ onNavigate }: { onNavigate: () => void }) {
  const { groups, loading } = useMyGroups();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (loading || groups.length === 0) return;
    const paramId = searchParams.get("groupId");
    const stored = typeof window !== "undefined" ? localStorage.getItem(ACTIVE_GROUP_KEY) : null;
    const candidate = paramId || stored;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveId(candidate && groups.some((g) => String(g.id) === candidate) ? candidate : String(groups[0].id));
  }, [loading, groups, searchParams]);

  if (loading || groups.length === 0) return null;

  const switchGroup = (id: string) => {
    try { localStorage.setItem(ACTIVE_GROUP_KEY, id); } catch {}
    router.push(`/?groupId=${id}`);
    onNavigate();
  };

  return (
    <div className="mb-3 pb-3 border-b border-gray-100 dark:border-gray-800">
      <p className="px-4 pb-1.5 text-xs font-medium text-gray-400 dark:text-gray-500">チーム</p>
      {groups.map((g) => {
        const isActive = String(g.id) === activeId;
        return (
          <button
            key={g.id}
            onClick={() => (isActive ? onNavigate() : switchGroup(String(g.id)))}
            className={`w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-lg text-sm transition-all duration-150 ${
              isActive
                ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium"
                : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            }`}
          >
            <span className="truncate">{g.name}</span>
            {isActive && <span className="flex-shrink-0 text-[10px] text-blue-500 dark:text-blue-400">選択中</span>}
          </button>
        );
      })}
      <button
        onClick={() => { router.push("/?view=team&tab=group"); onNavigate(); }}
        className="w-full text-left px-4 pt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline"
      >
        + チームを作成・招待コードで参加
      </button>
    </div>
  );
}

// メニュー内のナビ項目: 幹部/メンバーに分け、幹部ビューに現在いる場合はその下に
// タブ一覧を展開する。現在地の判定にuseSearchParamsを使うためSuspense配下に置く。
function DrawerNav({ onNavigate }: { onNavigate: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentView = pathname === "/" ? searchParams.get("view") : null;
  const isTeamView = currentView === "team";
  const currentTab = searchParams.get("tab") ?? "roster";

  const goTo = (href: string) => {
    router.push(href);
    onNavigate();
  };

  return (
    <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
      <TeamSwitcher onNavigate={onNavigate} />
      <button
        onClick={() => goTo("/?view=team")}
        className={`w-full flex items-center gap-2.5 px-4 py-3.5 rounded-xl transition-all duration-150 ${
          isTeamView
            ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
            : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
        }`}
      >
        <span className="text-lg">👑</span>
        <span className="text-sm font-medium">幹部</span>
      </button>

      {isTeamView && (
        <div className="pl-4 space-y-1">
          {TEAM_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => goTo(`/?view=team&tab=${tab.id}`)}
              className={`w-full flex items-center px-4 py-2.5 rounded-lg text-sm transition-all duration-150 ${
                currentTab === tab.id
                  ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium"
                  : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      <button
        onClick={() => goTo("/?view=personal")}
        className={`w-full flex items-center gap-2.5 px-4 py-3.5 rounded-xl transition-all duration-150 ${
          currentView === "personal"
            ? "bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300"
            : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
        }`}
      >
        <span className="text-lg">👤</span>
        <span className="text-sm font-medium">メンバー</span>
      </button>
    </nav>
  );
}

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
            <Suspense fallback={null}>
              <DrawerNav onNavigate={() => setMenuOpen(false)} />
            </Suspense>

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
