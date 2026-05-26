"use client";

import { useState, useEffect, useCallback } from "react";
import * as XLSX from "xlsx";

type Member = {
  grade: string;
  name: string;
  studentId: string;
  birthDate: string;
};

type Period = {
  start: string;
  end: string;
};

type Attendance = Record<string, Record<string, boolean>>;

const ROSTER_KEY = "roster_members";
const CAMP_PERIOD_KEY = "camp_period";
const CAMP_ATTENDANCE_KEY = "camp_attendance";

function getDatesInRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const cur = new Date(start);
  const last = new Date(end);
  while (cur <= last) {
    dates.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

function formatDateLabel(isoDate: string): string {
  const d = new Date(isoDate);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function nightsAndDays(start: string, end: string): string {
  const diff = Math.round(
    (new Date(end).getTime() - new Date(start).getTime()) / 86400000
  );
  return diff > 0 ? `${diff}泊${diff + 1}日` : "日帰り";
}

export default function CampApp() {
  const [section, setSection] = useState<"settings" | "roster">("settings");
  const [period, setPeriod] = useState<Period>({ start: "", end: "" });
  const [attendance, setAttendance] = useState<Attendance>({});
  const [members, setMembers] = useState<Member[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const p = localStorage.getItem(CAMP_PERIOD_KEY);
    if (p) setPeriod(JSON.parse(p));

    const a = localStorage.getItem(CAMP_ATTENDANCE_KEY);
    if (a) setAttendance(JSON.parse(a));

    const r = localStorage.getItem(ROSTER_KEY);
    if (r) {
      try { setMembers(JSON.parse(r)); } catch {}
    }
  }, []);

  const savePeriod = () => {
    if (!period.start || !period.end || period.start > period.end) return;
    localStorage.setItem(CAMP_PERIOD_KEY, JSON.stringify(period));

    // 新しい日付リストで出欠を初期化（既存データは保持）
    const dates = getDatesInRange(period.start, period.end);
    const members_: Member[] = (() => {
      const r = localStorage.getItem(ROSTER_KEY);
      return r ? JSON.parse(r) : [];
    })();
    setAttendance(prev => {
      const next: Attendance = {};
      for (const m of members_) {
        next[m.name] = {};
        for (const d of dates) {
          next[m.name][d] = prev[m.name]?.[d] ?? true;
        }
      }
      localStorage.setItem(CAMP_ATTENDANCE_KEY, JSON.stringify(next));
      return next;
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
    setSection("roster");
  };

  const toggleDay = useCallback((name: string, date: string) => {
    setAttendance(prev => {
      const next = {
        ...prev,
        [name]: { ...prev[name], [date]: !prev[name]?.[date] },
      };
      localStorage.setItem(CAMP_ATTENDANCE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const toggleAllOnDate = useCallback((date: string, value: boolean) => {
    setAttendance(prev => {
      const next = { ...prev };
      for (const name of Object.keys(next)) {
        next[name] = { ...next[name], [date]: value };
      }
      localStorage.setItem(CAMP_ATTENDANCE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const exportExcel = () => {
    if (!period.start || !period.end) return;
    const dates = getDatesInRange(period.start, period.end);
    const labels = dates.map(formatDateLabel);

    const rows = members.map(m => {
      const row: Record<string, string> = {
        学年: m.grade,
        名前: m.name,
      };
      dates.forEach((d, i) => {
        row[labels[i]] = attendance[m.name]?.[d] ? "○" : "";
      });
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(rows, {
      header: ["学年", "名前", ...labels],
    });

    // 列幅設定
    ws["!cols"] = [
      { wch: 6 },
      { wch: 10 },
      ...labels.map(() => ({ wch: 7 })),
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "合宿名簿");
    XLSX.writeFile(wb, "合宿名簿.xlsx");
  };

  const dates = period.start && period.end ? getDatesInRange(period.start, period.end) : [];
  const isValidPeriod = period.start && period.end && period.start <= period.end;

  return (
    <div className="space-y-6">
      {/* セクション切替 */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
        {[
          { id: "settings", label: "合宿設定" },
          { id: "roster",   label: "参加者名簿" },
        ].map(s => (
          <button
            key={s.id}
            onClick={() => setSection(s.id as "settings" | "roster")}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
              section === s.id
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* 合宿設定 */}
      {section === "settings" && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 space-y-5">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">合宿期間</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-400 dark:text-gray-500 mb-1.5">開始日</label>
                <input
                  type="date"
                  value={period.start}
                  onChange={e => setPeriod(p => ({ ...p, start: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-3 py-2 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 dark:text-gray-500 mb-1.5">終了日</label>
                <input
                  type="date"
                  value={period.end}
                  onChange={e => setPeriod(p => ({ ...p, end: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-3 py-2 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {isValidPeriod && (
              <p className="mt-3 text-sm font-medium text-blue-600 dark:text-blue-400">
                {nightsAndDays(period.start, period.end)}（{dates.length}日間）
              </p>
            )}
          </div>

          <button
            onClick={savePeriod}
            disabled={!isValidPeriod}
            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white text-sm font-medium transition-colors"
          >
            {saved ? "保存しました" : "保存して名簿へ"}
          </button>
        </div>
      )}

      {/* 参加者名簿 */}
      {section === "roster" && (
        <div className="space-y-4">
          {!dates.length ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-3xl mb-4">
                📅
              </div>
              <p className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-1">合宿期間が設定されていません</p>
              <p className="text-sm text-gray-400 dark:text-gray-500">
                先に「合宿設定」で期間を保存してください
              </p>
              <button
                onClick={() => setSection("settings")}
                className="mt-4 px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                設定へ
              </button>
            </div>
          ) : members.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-3xl mb-4">
                📋
              </div>
              <p className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-1">名簿にメンバーがいません</p>
              <p className="text-sm text-gray-400 dark:text-gray-500">
                「名簿」タブでCSVをインポートしてください
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {period.start && `${formatDateLabel(period.start)} 〜 ${formatDateLabel(period.end)}`}
                  　{nightsAndDays(period.start, period.end)}
                </p>
                <button
                  onClick={exportExcel}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                  </svg>
                  Excelで出力
                </button>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-gray-700">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                      <th className="text-left px-4 py-3 font-medium text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">学年</th>
                      <th className="text-left px-4 py-3 font-medium text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">名前</th>
                      {dates.map(d => (
                        <th key={d} className="px-3 py-3 text-center">
                          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">{formatDateLabel(d)}</div>
                          <button
                            onClick={() => {
                              const allChecked = members.every(m => attendance[m.name]?.[d]);
                              toggleAllOnDate(d, !allChecked);
                            }}
                            className="mt-1 text-[10px] text-blue-500 hover:text-blue-700 dark:text-blue-400"
                          >
                            {members.every(m => attendance[m.name]?.[d]) ? "全解除" : "全選択"}
                          </button>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800">
                    {members.map((m, i) => (
                      <tr
                        key={i}
                        className="border-b border-gray-50 dark:border-gray-700/50 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                      >
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{m.grade}</td>
                        <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200 whitespace-nowrap">{m.name}</td>
                        {dates.map(d => (
                          <td key={d} className="px-3 py-3 text-center">
                            <button
                              onClick={() => toggleDay(m.name, d)}
                              className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${
                                attendance[m.name]?.[d]
                                  ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800/60"
                                  : "bg-gray-100 dark:bg-gray-700 text-gray-300 dark:text-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600"
                              }`}
                            >
                              {attendance[m.name]?.[d] ? "○" : ""}
                            </button>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="text-xs text-gray-400 dark:text-gray-500">
                ○ = 参加　空欄 = 不参加・途中参加なし
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
