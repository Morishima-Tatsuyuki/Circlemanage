"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession, signIn } from "next-auth/react";
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
const CAMP_FORM_URL_KEY = "camp_form_url";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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
  const { data: session } = useSession();
  const [section, setSection] = useState<"settings" | "roster">("settings");
  const [period, setPeriod] = useState<Period>({ start: "", end: "" });
  const [attendance, setAttendance] = useState<Attendance>({});
  const [members, setMembers] = useState<Member[]>([]);
  const [saved, setSaved] = useState(false);
  const [formUrl, setFormUrl] = useState("");
  const [creatingForm, setCreatingForm] = useState(false);
  const [formError, setFormError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const p = localStorage.getItem(CAMP_PERIOD_KEY);
    if (p) setPeriod(JSON.parse(p));

    const a = localStorage.getItem(CAMP_ATTENDANCE_KEY);
    if (a) setAttendance(JSON.parse(a));

    const r = localStorage.getItem(ROSTER_KEY);
    if (r) {
      try { setMembers(JSON.parse(r)); } catch {}
    }

    const f = localStorage.getItem(CAMP_FORM_URL_KEY);
    if (f) setFormUrl(f);
  }, []);

  const savePeriod = () => {
    if (!period.start || !period.end || period.start > period.end) return;
    localStorage.setItem(CAMP_PERIOD_KEY, JSON.stringify(period));

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

  const createGoogleForm = async () => {
    if (!isValidPeriod || !session?.access_token) return;
    setCreatingForm(true);
    setFormError("");
    try {
      const res = await fetch(`${API_BASE}/create-camp-form`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_token: session.access_token,
          camp_dates: dates,
          event_name: "合宿参加可否アンケート",
        }),
      });
      const data = await res.json();
      if (data.error) {
        setFormError(data.error);
      } else {
        setFormUrl(data.form_url);
        localStorage.setItem(CAMP_FORM_URL_KEY, data.form_url);
      }
    } catch {
      setFormError("フォームの作成に失敗しました");
    } finally {
      setCreatingForm(false);
    }
  };

  const copyFormUrl = async () => {
    if (!formUrl) return;
    await navigator.clipboard.writeText(formUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
        <div className="space-y-4">
          {/* 期間設定 */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 space-y-5">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">合宿期間</h3>
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
              <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                {nightsAndDays(period.start, period.end)}（{dates.length}日間）
              </p>
            )}

            <button
              onClick={savePeriod}
              disabled={!isValidPeriod}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white text-sm font-medium transition-colors"
            >
              {saved ? "保存しました" : "保存して名簿へ"}
            </button>
          </div>

          {/* 参加可否フォーム作成 */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">参加可否アンケート</h3>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                合宿期間をもとに Google フォームを自動作成します
              </p>
            </div>

            {/* フォーム内容プレビュー */}
            {isValidPeriod && (
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 space-y-2 text-xs text-gray-500 dark:text-gray-400">
                <p className="font-medium text-gray-600 dark:text-gray-300">作成されるフォームの内容</p>
                <ul className="space-y-1 ml-2">
                  <li>・名前（テキスト）</li>
                  <li>・参加：全参加 / 途中参加or途中帰宅</li>
                  <li className="ml-3 text-gray-400 dark:text-gray-500">↓ 途中参加の方のみ</li>
                  <li className="ml-3">・参加日（{dates.map(formatDateLabel).join(" / ")}）</li>
                  <li className="ml-3">・参加日の飯：朝飯から / 昼飯から / 夜飯から / いらない</li>
                  <li className="ml-3">・帰宅日（{dates.map(formatDateLabel).join(" / ")}）</li>
                  <li className="ml-3">・帰宅日の飯：朝飯まで / 昼飯まで / 夜飯まで / いらない</li>
                </ul>
              </div>
            )}

            {/* ログイン状態に応じたUI */}
            {!session?.access_token ? (
              <div className="space-y-3">
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Googleアカウントでログインするとフォームを自動作成できます
                </p>
                <button
                  onClick={() => signIn("google")}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Googleでログイン
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {formError && (
                  <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
                    {formError}
                  </p>
                )}

                <button
                  onClick={createGoogleForm}
                  disabled={!isValidPeriod || creatingForm}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white text-sm font-medium transition-colors"
                >
                  {creatingForm ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                      </svg>
                      作成中...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                        <line x1="12" y1="18" x2="12" y2="12"/>
                        <line x1="9" y1="15" x2="15" y2="15"/>
                      </svg>
                      {formUrl ? "フォームを再作成" : "Googleフォームを作成"}
                    </>
                  )}
                </button>

                {!isValidPeriod && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
                    合宿期間を入力してください
                  </p>
                )}

                {/* 作成済みフォームURL */}
                {formUrl && (
                  <div className="rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-4 space-y-3">
                    <p className="text-xs font-medium text-green-700 dark:text-green-400">フォームが作成されました</p>
                    <div className="flex items-center gap-2">
                      <input
                        readOnly
                        value={formUrl}
                        className="flex-1 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-600 dark:text-gray-400 truncate"
                      />
                      <button
                        onClick={copyFormUrl}
                        className="flex-shrink-0 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                      >
                        {copied ? "コピー済" : "コピー"}
                      </button>
                    </div>
                    <a
                      href={formUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg border border-green-300 dark:border-green-700 text-xs text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors"
                    >
                      フォームを開く
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
                        <polyline points="15 3 21 3 21 9"/>
                        <line x1="10" y1="14" x2="21" y2="3"/>
                      </svg>
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
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
