"use client";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";

export default function AuthButton() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 animate-pulse-soft">
        <div className="w-4 h-4 rounded-full bg-gray-300 dark:bg-gray-600" />
        <div className="h-3 w-20 bg-gray-300 dark:bg-gray-600 rounded" />
      </div>
    );
  }

  if (session) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
          {session.user?.image && (
            <img src={session.user.image} alt="avatar" className="w-5 h-5 rounded-full" />
          )}
          <span className="text-xs text-green-700 dark:text-green-400 font-medium">
            {session.user?.name}
          </span>
        </div>
        <button
          onClick={() => signOut()}
          className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          ログアウト
        </button>
      </div>
    );
  }

  return (
    <Link
      href="/login"
      className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
    >
      ログイン
    </Link>
  );
}
