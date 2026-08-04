"use client";

import { useState, useRef, useEffect } from "react";

type Member = {
  grade: string;
  name: string;
  studentId: string;
  birthDate: string;
};

const STORAGE_KEY = "roster_members";

const TEMPLATE_ROWS = [
  "学年,名前,学籍番号,生年月日",
  "1,山田太郎,12345678,2005-04-01",
  "2,鈴木花子,12345679,2004-06-15",
].join("\n");

export default function RosterApp() {
  const [members, setMembers] = useState<Member[]>([]);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try { setMembers(JSON.parse(saved)); } catch {}
    }
  }, []);

  const downloadTemplate = () => {
    const blob = new Blob(["﻿" + TEMPLATE_ROWS], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "名簿テンプレート.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = (ev.target?.result as string).replace(/^﻿/, "");
        const lines = text.split(/\r?\n/).filter(Boolean);
        if (lines.length < 2) { setError("データが見つかりません"); return; }

        const headers = lines[0].split(",").map(h => h.trim());
        const gradeIdx   = headers.indexOf("学年");
        const nameIdx    = headers.indexOf("名前");
        const idIdx      = headers.indexOf("学籍番号");
        const birthIdx   = headers.indexOf("生年月日");

        if (gradeIdx < 0 || nameIdx < 0) {
          setError("「学年」「名前」列が見つかりません。テンプレートを使用してください。");
          return;
        }

        const parsed: Member[] = lines.slice(1)
          .map(line => {
            const cols = line.split(",").map(c => c.trim());
            return {
              grade:     cols[gradeIdx]  ?? "",
              name:      cols[nameIdx]   ?? "",
              studentId: idIdx    >= 0 ? (cols[idIdx]    ?? "") : "",
              birthDate: birthIdx >= 0 ? (cols[birthIdx] ?? "") : "",
            };
          })
          .filter(m => m.name);

        setMembers(parsed);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
      } catch {
        setError("CSVの読み込みに失敗しました");
      }
    };
    reader.readAsText(file, "UTF-8");
    e.target.value = "";
  };

  const clearMembers = () => {
    setMembers([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  const grouped = members.reduce<Record<string, Member[]>>((acc, m) => {
    const key = m.grade || "不明";
    (acc[key] ??= []).push(m);
    return acc;
  }, {});
  const grades = Object.keys(grouped).sort((a, b) => Number(a) - Number(b));

  return (
    <div className="space-y-6">

      {/* アクション */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={downloadTemplate}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
          </svg>
          テンプレートCSV
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
          </svg>
          CSVをインポート
        </button>

        {members.length > 0 && (
          <button
            onClick={clearMembers}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            データを削除
          </button>
        )}

        <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
      </div>

      {error && (
        <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-lg">{error}</p>
      )}

      {/* 空状態 */}
      {members.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-3xl mb-4">
            📋
          </div>
          <p className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-1">名簿がありません</p>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            テンプレートをダウンロードして記入後、CSVをインポートしてください
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <p className="text-sm text-gray-500 dark:text-gray-400">計 {members.length} 名</p>

          {grades.map(grade => (
            <div key={grade}>
              <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">
                {grade}年生 · {grouped[grade].length}名
              </h3>
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-700 text-xs text-gray-400">
                      <th className="text-left px-4 py-2.5 font-medium">名前</th>
                      <th className="text-left px-4 py-2.5 font-medium">学籍番号</th>
                      <th className="text-left px-4 py-2.5 font-medium">生年月日</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grouped[grade].map((m, i) => (
                      <tr key={i} className="border-b border-gray-50 dark:border-gray-700/50 last:border-0">
                        <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">{m.name}</td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{m.studentId}</td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{m.birthDate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
