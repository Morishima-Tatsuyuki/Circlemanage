"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useCalendarStore, GOOGLE_CALENDAR_COLORS, type CalendarEntry } from "./useCalendarStore";

// ── ユーティリティ ──────────────────────────────
function parseTime(slot: string): { start: string; end: string } | null {
  const match = slot.match(/^(\d{1,2}:\d{2})~(\d{1,2}:\d{2})$/);
  if (!match) return null;
  return { start: match[1], end: match[2] };
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function ymd(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month - 1, 1).getDay(); // 0=Sun
}

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

type Tab = "calendar" | "settings";
type Status = { type: "success" | "error"; message: string } | null;

// ── メインコンポーネント ─────────────────────────
export default function CalendarApp() {
  const { data: session } = useSession();
  const store = useCalendarStore();
  const { eventNames, addEventName, deleteEventName, timeSlots, addTimeSlot, deleteTimeSlot, entries, addEntry, deleteEntry, entriesForDate } = store;

  const today = todayStr();
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(new Date().getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("calendar");

  // 入力フォーム
  const [form, setForm] = useState({
    eventName: eventNames[0] ?? "",
    timeSlot: timeSlots[0] ?? "",
    colorId: "7",
  });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  // 設定フォーム
  const [newEventName, setNewEventName] = useState("");
  const [newTimeSlot, setNewTimeSlot] = useState("");

  const safeEventName = eventNames.includes(form.eventName) ? form.eventName : (eventNames[0] ?? "");
  const safeTimeSlot = timeSlots.includes(form.timeSlot) ? form.timeSlot : (timeSlots[0] ?? "");
  const selectedColor = GOOGLE_CALENDAR_COLORS.find((c) => c.id === form.colorId);

  // ── カレンダー計算 ──
  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDow = getFirstDayOfWeek(viewYear, viewMonth);
  const totalCells = Math.ceil((firstDow + daysInMonth) / 7) * 7;

  const prevMonth = () => {
    if (viewMonth === 1) { setViewYear(y => y - 1); setViewMonth(12); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 12) { setViewYear(y => y + 1); setViewMonth(1); }
    else setViewMonth(m => m + 1);
  };

  // ── イベント追加 ──
  const handleAdd = async () => {
    if (!selectedDate || !safeEventName || !safeTimeSlot) {
      setStatus({ type: "error", message: "日付・イベント名・時間を選択してください" });
      return;
    }
    const times = parseTime(safeTimeSlot);
    if (!times) {
      setStatus({ type: "error", message: "時間の形式が正しくありません" });
      return;
    }

    const entry = { date: selectedDate, eventName: safeEventName, timeSlot: safeTimeSlot, colorId: form.colorId };

    if (session?.access_token) {
      setLoading(true);
      setStatus(null);
      try {
        const body = {
          summary: safeEventName,
          start: { dateTime: `${selectedDate}T${times.start}:00+09:00`, timeZone: "Asia/Tokyo" },
          end:   { dateTime: `${selectedDate}T${times.end}:00+09:00`,   timeZone: "Asia/Tokyo" },
          colorId: form.colorId,
        };
        const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
          method: "POST",
          headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) { const e = await res.json(); throw new Error(e.error?.message ?? "APIエラー"); }
        setStatus({ type: "success", message: `Googleカレンダーに追加：${safeEventName} (${safeTimeSlot})` });
      } catch (e: unknown) {
        setStatus({ type: "error", message: `失敗：${e instanceof Error ? e.message : String(e)}` });
        setLoading(false);
        return;
      }
      setLoading(false);
    } else {
      setStatus({ type: "success", message: `追加：${safeEventName} (${safeTimeSlot})` });
    }

    addEntry(entry);
  };

  // ── 選択日のイベント ──
  const selectedEntries = selectedDate ? entriesForDate(selectedDate) : [];

  return (
    <div className="space-y-4">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">カレンダー</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">定常活動を管理します</p>
        </div>
        {/* タブ切替 */}
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1 gap-1">
          {([["calendar", "カレンダー"], ["settings", "設定"]] as const).map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                tab === id ? "bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 shadow-sm" : "text-gray-500 dark:text-gray-400"
              }`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Googleログイン状態 */}
      {tab === "calendar" && (
        session ? (
          <div className="flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-xs text-green-700 dark:text-green-400">
            <span>✓</span><span>{session.user?.name} のGoogleカレンダーに追加されます</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl text-xs text-yellow-700 dark:text-yellow-400">
            <span>⚠</span><span>Googleログインするとカレンダーに自動追加されます</span>
          </div>
        )
      )}

      {/* ===== カレンダータブ ===== */}
      {tab === "calendar" && (
        <div className="space-y-4">

          {/* 月カレンダー */}
          <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl overflow-hidden">
            {/* ナビ */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-gray-700">
              <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors text-lg">‹</button>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{viewYear}年 {viewMonth}月</p>
              <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors text-lg">›</button>
            </div>

            {/* 曜日ヘッダー */}
            <div className="grid grid-cols-7 border-b border-gray-100 dark:border-gray-700">
              {WEEKDAYS.map((d, i) => (
                <div key={d} className={`py-2 text-center text-xs font-medium ${i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-gray-400 dark:text-gray-500"}`}>
                  {d}
                </div>
              ))}
            </div>

            {/* 日付グリッド */}
            <div className="grid grid-cols-7">
              {Array.from({ length: totalCells }).map((_, idx) => {
                const day = idx - firstDow + 1;
                const isValid = day >= 1 && day <= daysInMonth;
                const dateStr = isValid ? ymd(viewYear, viewMonth, day) : "";
                const isToday = dateStr === today;
                const isSelected = dateStr === selectedDate;
                const dow = idx % 7;
                const dayEntries = isValid ? entriesForDate(dateStr) : [];

                return (
                  <div
                    key={idx}
                    onClick={() => isValid && setSelectedDate(isSelected ? null : dateStr)}
                    className={`min-h-[64px] p-1 border-b border-r border-gray-50 dark:border-gray-700/50 transition-colors ${
                      isValid ? "cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/40" : ""
                    } ${isSelected ? "bg-blue-50 dark:bg-blue-900/20" : ""}`}
                  >
                    {isValid && (
                      <>
                        <div className="flex justify-end mb-1">
                          <span className={`w-6 h-6 flex items-center justify-center text-xs rounded-full font-medium ${
                            isToday ? "bg-blue-600 text-white" :
                            dow === 0 ? "text-red-400" :
                            dow === 6 ? "text-blue-400" :
                            "text-gray-700 dark:text-gray-200"
                          }`}>
                            {day}
                          </span>
                        </div>
                        <div className="space-y-0.5">
                          {dayEntries.slice(0, 2).map((e) => {
                            const color = GOOGLE_CALENDAR_COLORS.find((c) => c.id === e.colorId);
                            return (
                              <div key={e.id} className="flex items-center gap-1 px-1 py-0.5 rounded text-xs truncate"
                                style={{ backgroundColor: color ? color.hex + "22" : "#e5e7eb" }}>
                                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color?.hex ?? "#9ca3af" }} />
                                <span className="truncate text-gray-700 dark:text-gray-200" style={{ fontSize: "10px" }}>{e.eventName}</span>
                              </div>
                            );
                          })}
                          {dayEntries.length > 2 && (
                            <p className="text-gray-400 dark:text-gray-500" style={{ fontSize: "10px", paddingLeft: "4px" }}>+{dayEntries.length - 2}</p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 選択日パネル */}
          {selectedDate && (
            <div className="bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                  {selectedDate.replace(/-/g, "/")}
                  <span className="ml-2 text-xs font-normal text-gray-400 dark:text-gray-500">
                    {["日","月","火","水","木","金","土"][new Date(selectedDate).getDay()]}曜日
                  </span>
                </p>
                <button onClick={() => setSelectedDate(null)} className="text-gray-300 dark:text-gray-600 hover:text-gray-500 text-lg leading-none">×</button>
              </div>

              {/* この日のイベント一覧 */}
              {selectedEntries.length > 0 && (
                <div className="space-y-1">
                  {selectedEntries.map((e) => {
                    const color = GOOGLE_CALENDAR_COLORS.find((c) => c.id === e.colorId);
                    return (
                      <div key={e.id} className="flex items-center gap-2 px-3 py-2 rounded-lg group"
                        style={{ backgroundColor: color ? color.hex + "15" : "#f3f4f6" }}>
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color?.hex ?? "#9ca3af" }} />
                        <span className="flex-1 text-sm text-gray-800 dark:text-gray-100">{e.eventName}</span>
                        <span className="text-xs text-gray-400 dark:text-gray-500">{e.timeSlot}</span>
                        <button onClick={() => deleteEntry(e.id)}
                          className="text-gray-200 dark:text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all text-base leading-none ml-1">×</button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 追加フォーム */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">イベント名</label>
                    <select value={safeEventName} onChange={(e) => setForm((f) => ({ ...f, eventName: e.target.value }))}
                      className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400">
                      {eventNames.map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">時間</label>
                    <select value={safeTimeSlot} onChange={(e) => setForm((f) => ({ ...f, timeSlot: e.target.value }))}
                      className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400">
                      {timeSlots.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                {session && (
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">色</label>
                    <div className="relative">
                      <select value={form.colorId} onChange={(e) => setForm((f) => ({ ...f, colorId: e.target.value }))}
                        className="w-full border border-gray-200 dark:border-gray-600 rounded-lg pl-8 pr-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400 appearance-none">
                        {GOOGLE_CALENDAR_COLORS.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      {selectedColor && (
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full pointer-events-none"
                          style={{ backgroundColor: selectedColor.hex }} />
                      )}
                    </div>
                  </div>
                )}

                <button onClick={handleAdd} disabled={loading || eventNames.length === 0 || timeSlots.length === 0}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-semibold rounded-lg transition-colors">
                  {loading ? "追加中..." : session ? "Googleカレンダーに追加" : "追加"}
                </button>

                {status && (
                  <div className={`px-3 py-2 rounded-lg text-xs ${
                    status.type === "success"
                      ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800"
                      : "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800"
                  }`}>
                    {status.message}
                  </div>
                )}
              </div>
            </div>
          )}

          {!selectedDate && (
            <p className="text-center text-xs text-gray-400 dark:text-gray-500">日付をタップして予定を追加できます</p>
          )}
        </div>
      )}

      {/* ===== 設定タブ ===== */}
      {tab === "settings" && (
        <div className="space-y-5">

          {/* イベント名 */}
          <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-5 space-y-3">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">イベント名</h2>
            <ul className="space-y-1">
              {eventNames.map((n) => (
                <li key={n} className="flex items-center gap-2 group">
                  <span className="flex-1 text-sm text-gray-700 dark:text-gray-200 px-3 py-1.5 bg-gray-50 dark:bg-gray-700 rounded-lg">{n}</span>
                  <button onClick={() => deleteEventName(n)}
                    className="text-gray-300 dark:text-gray-600 hover:text-red-400 text-lg leading-none opacity-0 group-hover:opacity-100 transition-all px-1">×</button>
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <input type="text" placeholder="新しいイベント名" value={newEventName}
                onChange={(e) => setNewEventName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { addEventName(newEventName); setNewEventName(""); } }}
                className="flex-1 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 placeholder-gray-300 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400" />
              <button onClick={() => { addEventName(newEventName); setNewEventName(""); }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">追加</button>
            </div>
          </div>

          {/* 時間スロット */}
          <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-5 space-y-3">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">時間スロット</h2>
            <ul className="space-y-1">
              {timeSlots.map((s) => (
                <li key={s} className="flex items-center gap-2 group">
                  <span className="flex-1 text-sm text-gray-700 dark:text-gray-200 px-3 py-1.5 bg-gray-50 dark:bg-gray-700 rounded-lg font-mono">{s}</span>
                  <button onClick={() => deleteTimeSlot(s)}
                    className="text-gray-300 dark:text-gray-600 hover:text-red-400 text-lg leading-none opacity-0 group-hover:opacity-100 transition-all px-1">×</button>
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <input type="text" placeholder="例：19:00~22:00" value={newTimeSlot}
                onChange={(e) => setNewTimeSlot(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { addTimeSlot(newTimeSlot); setNewTimeSlot(""); } }}
                className="flex-1 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 placeholder-gray-300 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400 font-mono" />
              <button onClick={() => { addTimeSlot(newTimeSlot); setNewTimeSlot(""); }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">追加</button>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500">形式：HH:MM~HH:MM（例：18:00~21:00）</p>
          </div>
        </div>
      )}
    </div>
  );
}
