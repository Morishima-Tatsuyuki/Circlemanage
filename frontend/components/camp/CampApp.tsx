"use client";

import { useState, useEffect, useCallback, useMemo, useRef, type PointerEvent as ReactPointerEvent } from "react";
import { useSession, signIn } from "next-auth/react";

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
const CAMP_FORM_URL_KEY = "camp_form_url";
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

// ── Google Form プレビューモーダル ────────────────────────────
function FormPreviewModal({
  dates,
  onClose,
}: {
  dates: string[];
  onClose: () => void;
}) {
  const dateLabels = dates.map(formatDateLabel);
  const [participation, setParticipation] = useState<"全参加" | "途中参加or途中帰宅" | "">("");

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 overflow-y-auto py-8 px-4">
      <div className="w-full max-w-lg">
        {/* 閉じるボタン */}
        <div className="flex justify-end mb-3">
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white text-sm flex items-center gap-1"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
            閉じる
          </button>
        </div>

        {/* フォームヘッダー */}
        <div className="rounded-t-xl overflow-hidden">
          <div className="bg-[#4338ca] h-2 rounded-t-xl" />
          <div className="bg-white px-6 py-5 border-x border-b border-gray-200 rounded-b-none">
            <h2 className="text-2xl font-normal text-gray-800 mb-1">合宿参加可否アンケート</h2>
            <p className="text-sm text-red-500">* 必須</p>
          </div>
        </div>

        {/* Q1: 名前 */}
        <FormCard>
          <QuestionLabel text="名前" required />
          <input
            type="text"
            placeholder="回答を入力"
            className="w-full border-b border-gray-400 focus:border-[#4338ca] outline-none pb-1 text-sm text-gray-700 bg-transparent"
            readOnly
          />
        </FormCard>

        {/* Q2: 参加 */}
        <FormCard>
          <QuestionLabel text="参加" required />
          <div className="space-y-2 mt-1">
            {(["全参加", "途中参加or途中帰宅"] as const).map(opt => (
              <label key={opt} className="flex items-center gap-3 cursor-pointer">
                <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                  participation === opt ? "border-[#4338ca]" : "border-gray-400"
                }`}>
                  {participation === opt && (
                    <span className="w-2 h-2 rounded-full bg-[#4338ca]" />
                  )}
                </span>
                <span
                  className="text-sm text-gray-700"
                  onClick={() => setParticipation(opt)}
                >
                  {opt}
                </span>
              </label>
            ))}
          </div>
          {participation === "全参加" && (
            <p className="mt-3 text-xs text-[#4338ca] bg-indigo-50 rounded px-3 py-2">
              「全参加」を選択した場合、ここでフォームが送信されます
            </p>
          )}
        </FormCard>

        {/* セクション2: 詳細（途中参加のみ） */}
        {participation === "途中参加or途中帰宅" && (
          <>
            <div className="bg-white border border-gray-200 rounded-lg px-6 py-4 mt-4">
              <p className="text-base font-medium text-gray-700">詳細（途中参加・途中帰宅の方のみ）</p>
              <p className="text-sm text-gray-400 mt-1">途中から参加または途中で帰宅する方は以下を入力してください</p>
            </div>

            {/* Q3: 参加日 */}
            <FormCard>
              <QuestionLabel text="参加日" />
              <select className="mt-2 w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-700 focus:border-[#4338ca] focus:outline-none bg-white">
                <option value="">選択してください</option>
                {dateLabels.map(d => <option key={d}>{d}</option>)}
              </select>
            </FormCard>

            {/* Q4: 参加日の飯 */}
            <FormCard>
              <QuestionLabel text="参加日の飯" />
              <div className="space-y-2 mt-1">
                {["朝飯から", "昼飯から", "夜飯から", "いらない"].map(opt => (
                  <label key={opt} className="flex items-center gap-3 cursor-pointer">
                    <span className="w-4 h-4 rounded border-2 border-gray-400 flex-shrink-0" />
                    <span className="text-sm text-gray-700">{opt}</span>
                  </label>
                ))}
              </div>
            </FormCard>

            {/* Q5: 帰宅日 */}
            <FormCard>
              <QuestionLabel text="帰宅日" />
              <select className="mt-2 w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-700 focus:border-[#4338ca] focus:outline-none bg-white">
                <option value="">選択してください</option>
                {dateLabels.map(d => <option key={d}>{d}</option>)}
              </select>
            </FormCard>

            {/* Q6: 帰宅日の飯 */}
            <FormCard>
              <QuestionLabel text="帰宅日の飯" />
              <div className="space-y-2 mt-1">
                {["朝飯まで", "昼飯まで", "夜飯まで", "いらない"].map(opt => (
                  <label key={opt} className="flex items-center gap-3 cursor-pointer">
                    <span className="w-4 h-4 rounded border-2 border-gray-400 flex-shrink-0" />
                    <span className="text-sm text-gray-700">{opt}</span>
                  </label>
                ))}
              </div>
            </FormCard>
          </>
        )}

        {/* 送信ボタン */}
        <div className="bg-white border border-gray-200 rounded-lg px-6 py-4 mt-4 flex items-center justify-between">
          <button
            disabled
            className="px-6 py-2 rounded bg-[#4338ca] text-white text-sm font-medium opacity-60 cursor-not-allowed"
          >
            送信
          </button>
          <p className="text-xs text-gray-400">これはプレビューです</p>
        </div>

        <div className="h-8" />
      </div>
    </div>
  );
}

function FormCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-6 py-5 mt-4 space-y-1">
      {children}
    </div>
  );
}

function QuestionLabel({ text, required }: { text: string; required?: boolean }) {
  return (
    <p className="text-sm text-gray-700 mb-2">
      {text}
      {required && <span className="text-red-500 ml-1">*</span>}
    </p>
  );
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

// 既定の出欠: 基本的に全食参加。ただし初日の朝食と最終日の夕食は
// (前日入り・翌日退所が普通のため)既定で不参加とする。
function defaultMealValue(dateIndex: number, meal: Meal, totalDates: number): boolean {
  if (dateIndex === 0 && meal === "朝") return false;
  if (totalDates > 0 && dateIndex === totalDates - 1 && meal === "夜") return false;
  return true;
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
  const [showPreview, setShowPreview] = useState(false);
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

    const f = localStorage.getItem(CAMP_FORM_URL_KEY);
    if (f) setFormUrl(f);

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
        dates.forEach((d, i) => {
          const prevMeal = prev[m.name]?.[d];
          next[m.name][d] = {
            朝: prevMeal?.朝 ?? defaultMealValue(i, "朝", dates.length),
            昼: prevMeal?.昼 ?? defaultMealValue(i, "昼", dates.length),
            夜: prevMeal?.夜 ?? defaultMealValue(i, "夜", dates.length),
          };
        });
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

  // 途中参加などでご飯がいらない日がある人向け:
  // 「何日目からご飯が必要か」を指定すると、それより前の日の食事は
  // 一括で不参加にし、それ以降は既定ルール(初日朝食・最終日夕食を除き参加)に戻す
  const getMealStartIndex = useCallback((name: string) => {
    for (let i = 0; i < dates.length; i++) {
      const dayAtt = attendance[name]?.[dates[i]];
      if (dayAtt && (dayAtt.朝 || dayAtt.昼 || dayAtt.夜)) return i;
    }
    return 0;
  }, [attendance, dates]);

  const applyMealStartDay = useCallback((name: string, startIndex: number) => {
    setAttendance(prev => {
      const prevMember = prev[name] ?? {};
      const nextMember: Record<string, Record<Meal, boolean>> = { ...prevMember };
      dates.forEach((d, i) => {
        nextMember[d] = i < startIndex
          ? { 朝: false, 昼: false, 夜: false }
          : {
              朝: defaultMealValue(i, "朝", dates.length),
              昼: defaultMealValue(i, "昼", dates.length),
              夜: defaultMealValue(i, "夜", dates.length),
            };
      });
      const next: Attendance = { ...prev, [name]: nextMember };
      localStorage.setItem(CAMP_ATTENDANCE_KEY, JSON.stringify(next));
      return next;
    });
  }, [dates]);

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
      {showPreview && dates.length > 0 && (
        <FormPreviewModal dates={dates} onClose={() => setShowPreview(false)} />
      )}
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

          {/* 参加可否フォーム作成 */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">参加可否アンケート</h3>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                合宿期間をもとに Google フォームを自動作成します
              </p>
            </div>

            {/* プレビューボタン */}
            <button
              onClick={() => setShowPreview(true)}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              フォームのプレビューを見る
            </button>

            {/* ログイン状態に応じたUI */}
            {!session?.access_token ? (
              <div className="space-y-3">
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Googleアカウントでログインするとフォームを自動作成できます
                </p>
                <button
                  onClick={() => signIn("google", { callbackUrl: "/?view=team&tab=camp" })}
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
                      <th rowSpan={2} className="px-2 py-3 text-center text-xs font-medium text-gray-400 dark:text-gray-500 whitespace-nowrap align-bottom border-l border-gray-100 dark:border-gray-700">食事開始日</th>
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
                        <td className="px-2 py-2 text-center border-l border-gray-50 dark:border-gray-700/50">
                          <select
                            value={getMealStartIndex(m.name)}
                            onChange={e => applyMealStartDay(m.name, Number(e.target.value))}
                            className="text-xs rounded-md border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-1.5 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {dates.map((d, i) => (
                              <option key={d} value={i}>
                                {i === 0 ? "通常(初日から)" : `${formatDateLabel(d)}(${i + 1}日目)から`}
                              </option>
                            ))}
                          </select>
                        </td>
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
                ○ = 参加　× = 不参加　（初日の朝食・最終日の夕食は既定で×、泊数は「夜」の出席から自動計算されます）
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                途中参加などでご飯が不要な日がある人は、「食事開始日」でその人の食事が必要になる日を選んでください（それより前の食事は自動的に×になります。その後も個別のマス目で細かく調整できます）
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
