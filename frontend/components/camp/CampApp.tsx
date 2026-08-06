"use client";

import { useState, useEffect, useCallback, useMemo, useRef, type PointerEvent as ReactPointerEvent } from "react";

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

const MEALS = ["朝", "昼", "夜"] as const;
type Meal = (typeof MEALS)[number];

// 氏名 -> 日付 -> 食事 -> 参加有無
type Attendance = Record<string, Record<string, Record<Meal, boolean>>>;

type CostItem = { label: string; amount: number };

type CostSettings = {
  lodgingFee: number;
  items: CostItem[];
};

const DEFAULT_COST_SETTINGS: CostSettings = {
  lodgingFee: 8400,
  items: [
    { label: "宴会費", amount: 0 },
    { label: "保険料", amount: 0 },
    { label: "バス代", amount: 0 },
    { label: "施設利用料", amount: 0 },
    { label: "備品費", amount: 0 },
  ],
};

const ROSTER_KEY = "roster_members";
const CAMP_PERIOD_KEY = "camp_period";
const CAMP_ATTENDANCE_KEY = "camp_attendance";
const CAMP_COST_KEY = "camp_cost_settings";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// 旧形式(日単位のbooleanのみ)のデータが残っていた場合は破棄して作り直す
function isValidAttendanceShape(a: unknown): a is Attendance {
  if (!a || typeof a !== "object") return false;
  for (const byDate of Object.values(a as Record<string, unknown>)) {
    if (!byDate || typeof byDate !== "object") return false;
    for (const byMeal of Object.values(byDate as Record<string, unknown>)) {
      if (!byMeal || typeof byMeal !== "object") return false;
    }
  }
  return true;
}

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
  const [costSettings, setCostSettings] = useState<CostSettings>(DEFAULT_COST_SETTINGS);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");

  useEffect(() => {
    const p = localStorage.getItem(CAMP_PERIOD_KEY);
    if (p) setPeriod(JSON.parse(p));

    const a = localStorage.getItem(CAMP_ATTENDANCE_KEY);
    if (a) {
      try {
        const parsed = JSON.parse(a);
        if (isValidAttendanceShape(parsed)) setAttendance(parsed);
      } catch {}
    }

    const r = localStorage.getItem(ROSTER_KEY);
    if (r) {
      try { setMembers(JSON.parse(r)); } catch {}
    }

    const c = localStorage.getItem(CAMP_COST_KEY);
    if (c) {
      try { setCostSettings(JSON.parse(c)); } catch {}
    }
  }, []);

  const dates = useMemo(
    () => (period.start && period.end ? getDatesInRange(period.start, period.end) : []),
    [period.start, period.end]
  );
  const isValidPeriod = period.start && period.end && period.start <= period.end;

  const saveCostSettings = useCallback((next: CostSettings) => {
    setCostSettings(next);
    localStorage.setItem(CAMP_COST_KEY, JSON.stringify(next));
  }, []);

  const updateLodgingFee = (value: number) => {
    saveCostSettings({ ...costSettings, lodgingFee: value });
  };

  const updateCostItem = (index: number, patch: Partial<CostItem>) => {
    const items = costSettings.items.map((it, i) => (i === index ? { ...it, ...patch } : it));
    saveCostSettings({ ...costSettings, items });
  };

  const addCostItem = () => {
    saveCostSettings({ ...costSettings, items: [...costSettings.items, { label: "", amount: 0 }] });
  };

  const removeCostItem = (index: number) => {
    saveCostSettings({ ...costSettings, items: costSettings.items.filter((_, i) => i !== index) });
  };

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
          const prevMeal = prev[m.name]?.[d];
          next[m.name][d] = {
            朝: prevMeal?.朝 ?? true,
            昼: prevMeal?.昼 ?? true,
            夜: prevMeal?.夜 ?? true,
          };
        }
      }
      localStorage.setItem(CAMP_ATTENDANCE_KEY, JSON.stringify(next));
      return next;
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
    setSection("roster");
  };

  const setMealValue = useCallback((name: string, date: string, meal: Meal, value: boolean) => {
    setAttendance(prev => {
      const prevMember = prev[name] ?? {};
      const prevDate = prevMember[date] ?? { 朝: false, 昼: false, 夜: false };
      if (prevDate[meal] === value) return prev;
      const next: Attendance = {
        ...prev,
        [name]: {
          ...prevMember,
          [date]: { ...prevDate, [meal]: value },
        },
      };
      localStorage.setItem(CAMP_ATTENDANCE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  // 出欠グリッドのドラッグ選択（1マス目の値を、なぞった範囲すべてに適用する）
  const paintValueRef = useRef<boolean | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingTapRef = useRef<{ name: string; date: string; meal: Meal; value: boolean } | null>(null);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);

  const readCellFromElement = useCallback((el: Element | null) => {
    const cell = el?.closest<HTMLElement>("[data-cell='true']");
    if (!cell) return null;
    const { name, date, meal } = cell.dataset;
    if (!name || !date || !meal) return null;
    return { name, date, meal: meal as Meal };
  }, []);

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const handleGridPointerDown = useCallback((e: ReactPointerEvent<HTMLTableSectionElement>) => {
    const cell = readCellFromElement(e.target as Element);
    if (!cell) return;
    const current = !!attendance[cell.name]?.[cell.date]?.[cell.meal];
    const value = !current;

    if (e.pointerType === "touch") {
      // タッチはタップ(単発切替)と長押し+スライド(範囲塗り)を区別する
      touchStartPosRef.current = { x: e.clientX, y: e.clientY };
      pendingTapRef.current = { ...cell, value };
      longPressTimerRef.current = setTimeout(() => {
        paintValueRef.current = value;
        pendingTapRef.current = null;
        setMealValue(cell.name, cell.date, cell.meal, value);
        if (typeof navigator.vibrate === "function") navigator.vibrate(10);
      }, 350);
    } else {
      // マウスは即座にドラッグ選択を開始
      paintValueRef.current = value;
      setMealValue(cell.name, cell.date, cell.meal, value);
    }
  }, [attendance, readCellFromElement, setMealValue]);

  const handleGridPointerMove = useCallback((e: ReactPointerEvent<HTMLTableSectionElement>) => {
    if (longPressTimerRef.current && touchStartPosRef.current) {
      const dx = e.clientX - touchStartPosRef.current.x;
      const dy = e.clientY - touchStartPosRef.current.y;
      if (Math.hypot(dx, dy) > 10) {
        // 長押し確定前に動いた＝スクロール意図とみなしキャンセル
        clearLongPressTimer();
        pendingTapRef.current = null;
        touchStartPosRef.current = null;
      }
    }
    if (paintValueRef.current === null) return;
    e.preventDefault();
    const cell = readCellFromElement(document.elementFromPoint(e.clientX, e.clientY));
    if (cell) setMealValue(cell.name, cell.date, cell.meal, paintValueRef.current);
  }, [clearLongPressTimer, readCellFromElement, setMealValue]);

  const handleGridPointerUp = useCallback(() => {
    if (pendingTapRef.current) {
      // 長押しが確定する前に指を離した＝通常のタップとして1マスだけ切替
      const { name, date, meal, value } = pendingTapRef.current;
      setMealValue(name, date, meal, value);
    }
    clearLongPressTimer();
    pendingTapRef.current = null;
    touchStartPosRef.current = null;
    paintValueRef.current = null;
  }, [clearLongPressTimer, setMealValue]);

  const handleGridPointerCancel = useCallback(() => {
    // ジェスチャーの中断（システムの割り込み等）ではタップ扱いにしない
    clearLongPressTimer();
    pendingTapRef.current = null;
    touchStartPosRef.current = null;
    paintValueRef.current = null;
  }, [clearLongPressTimer]);

  const toggleAllMeal = useCallback((date: string, meal: Meal, value: boolean) => {
    setAttendance(prev => {
      const next: Attendance = { ...prev };
      for (const name of Object.keys(next)) {
        const prevDate = next[name][date] ?? { 朝: false, 昼: false, 夜: false };
        next[name] = { ...next[name], [date]: { ...prevDate, [meal]: value } };
      }
      localStorage.setItem(CAMP_ATTENDANCE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const nightsCount = useCallback((name: string) => {
    return dates.reduce((acc, d) => acc + (attendance[name]?.[d]?.夜 ? 1 : 0), 0);
  }, [attendance, dates]);

  const exportExcel = async () => {
    if (!period.start || !period.end) return;
    setExporting(true);
    setExportError("");
    try {
      const res = await fetch(`${API_BASE}/export-camp-roster`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          members: members.map(m => ({ grade: m.grade, name: m.name })),
          dates,
          attendance,
          lodging_fee: costSettings.lodgingFee,
          cost_items: costSettings.items,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "合宿参加者名簿.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setExportError("Excel出力に失敗しました。バックエンドの起動状況を確認してください。");
    } finally {
      setExporting(false);
    }
  };

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

          {/* 費用設定 */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">費用設定</h3>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                参加者名簿のExcel出力時に、宿泊費と諸経費から一人あたりの徴収金額を自動計算する関数が入ります
              </p>
            </div>

            <div>
              <label className="block text-xs text-gray-400 dark:text-gray-500 mb-1.5">宿泊費（1人1泊あたり）</label>
              <input
                type="number"
                value={costSettings.lodgingFee}
                onChange={e => updateLodgingFee(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-3 py-2 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs text-gray-400 dark:text-gray-500">全体でかかる諸経費（宴会費・バス代など）</label>
              {costSettings.items.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={item.label}
                    onChange={e => updateCostItem(i, { label: e.target.value })}
                    placeholder="項目名"
                    className="flex-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-3 py-2 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="number"
                    value={item.amount}
                    onChange={e => updateCostItem(i, { amount: Number(e.target.value) })}
                    placeholder="金額"
                    className="w-32 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-3 py-2 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => removeCostItem(i)}
                    className="flex-shrink-0 p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    aria-label="項目を削除"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
              ))}
              <button
                onClick={addCostItem}
                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 font-medium"
              >
                + 項目を追加
              </button>
            </div>
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
                  disabled={exporting}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white text-sm font-medium transition-colors"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                  </svg>
                  {exporting ? "出力中..." : "Excelで出力"}
                </button>
              </div>

              {exportError && (
                <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
                  {exportError}
                </p>
              )}

              <div className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-gray-700">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                      <th rowSpan={2} className="text-left px-4 py-3 font-medium text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap align-bottom">学年</th>
                      <th rowSpan={2} className="text-left px-4 py-3 font-medium text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap align-bottom">名前</th>
                      {dates.map(d => (
                        <th key={d} colSpan={MEALS.length} className="px-2 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap border-l border-gray-100 dark:border-gray-700">
                          {formatDateLabel(d)}
                        </th>
                      ))}
                      <th rowSpan={2} className="px-3 py-3 text-center text-xs font-medium text-gray-400 dark:text-gray-500 whitespace-nowrap align-bottom border-l border-gray-100 dark:border-gray-700">泊数</th>
                    </tr>
                    <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                      {dates.map(d => (
                        MEALS.map(meal => (
                          <th key={`${d}-${meal}`} className="px-1 py-1.5 text-center border-l border-gray-100 dark:border-gray-700">
                            <div className="text-[10px] text-gray-400 dark:text-gray-500">{meal}</div>
                            <button
                              onClick={() => {
                                const allChecked = members.every(m => attendance[m.name]?.[d]?.[meal]);
                                toggleAllMeal(d, meal, !allChecked);
                              }}
                              className="text-[10px] text-blue-500 hover:text-blue-700 dark:text-blue-400"
                            >
                              {members.every(m => attendance[m.name]?.[d]?.[meal]) ? "解除" : "選択"}
                            </button>
                          </th>
                        ))
                      ))}
                    </tr>
                  </thead>
                  <tbody
                    className="bg-white dark:bg-gray-800 touch-none select-none"
                    onPointerDown={handleGridPointerDown}
                    onPointerMove={handleGridPointerMove}
                    onPointerUp={handleGridPointerUp}
                    onPointerCancel={handleGridPointerCancel}
                    onPointerLeave={handleGridPointerCancel}
                  >
                    {members.map((m, i) => (
                      <tr
                        key={i}
                        className="border-b border-gray-50 dark:border-gray-700/50 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                      >
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{m.grade}</td>
                        <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200 whitespace-nowrap">{m.name}</td>
                        {dates.map(d => (
                          MEALS.map(meal => (
                            <td key={`${d}-${meal}`} className="px-1 py-2 text-center border-l border-gray-50 dark:border-gray-700/50">
                              <button
                                type="button"
                                data-cell="true"
                                data-name={m.name}
                                data-date={d}
                                data-meal={meal}
                                onDragStart={(e) => e.preventDefault()}
                                className={`w-7 h-7 rounded-lg text-xs font-medium transition-all ${
                                  attendance[m.name]?.[d]?.[meal]
                                    ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800/60"
                                    : "bg-gray-100 dark:bg-gray-700 text-gray-300 dark:text-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600"
                                }`}
                              >
                                {attendance[m.name]?.[d]?.[meal] ? "○" : "×"}
                              </button>
                            </td>
                          ))
                        ))}
                        <td className="px-3 py-3 text-center text-gray-500 dark:text-gray-400 border-l border-gray-50 dark:border-gray-700/50">
                          {nightsCount(m.name)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="text-xs text-gray-400 dark:text-gray-500">
                ○ = 参加　× = 不参加　（泊数は「夜」の出席から自動計算されます）
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
