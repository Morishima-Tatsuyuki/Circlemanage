import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import SessionWrapper from "@/components/SessionWrapper";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "イベント管理ツール",
  description: "配車・会計・カレンダー管理アプリ",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <head>
        {/* FOUCを防ぐため、React hydration前にダークモードクラスを適用 */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            try {
              var theme = localStorage.getItem('theme');
              if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                document.documentElement.classList.add('dark');
              }
            } catch(e) {}
          })();
        `}} />
      </head>
      <body className={`${geist.className} bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100`}>
        <SessionWrapper>
          <Navbar />
          <main className="pt-14 min-h-screen">
            <div className="max-w-3xl mx-auto px-5 py-10">
              {children}
            </div>
          </main>
        </SessionWrapper>
      </body>
    </html>
  );
}
