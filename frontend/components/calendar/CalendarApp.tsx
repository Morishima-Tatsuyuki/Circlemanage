"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useCalendarStore, GOOGLE_CALENDAR_COLORS } from "./useCalendarStore";

type Status = { type: "success" | "error"; message: string } | null;

// HH:MM 形式に変換
function parseTime(slot: string): { start: string; end: string } | null {
  const match = slot.match(/^(\d{1,2}:\d{2})~(\d{1,2}:\d{2})$/);
  if (!match) return null;
  return { start: match[1], end: match[2] };
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

type Tab = "input" | "settings";

export default function CalendarApp() {
  const { data: session } = useSession();
  const store = useCalendarStore();
  const { eventNames, addEventName, deleteEventName, timeSlots, addTimeSlot, deleteTimeSlot } = store;

  const [tab, setTab] = useState<Tab>("input");

  // 入力フォーム
  const [form, setForm] = useState({
    date: todayStr(),
    eventName: eventNames[0] ?? "",
    timeSlot: timeSlots[0] ?? "",
    colorId: "7", // ピーコック（デフォルト）
  });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const [history, setHistory] = useState<{ date: string; eventName: string; timeSlot: string; colorId: string }[]>([]);

  // 設定フォーム
  const [newEventName, setNewEventName] = useState("");
  const [newTimeSlot, setNewTimeSlot] = useState("");

  // フォームのeventNameが削除されたとき最初の項目にフォールバック
  const safeEventName = eventNames.includes(form.eventName) ? form.eventName : (eventNames[0] ?? "");
  const safeTimeSlot = timeSlots.includes(form.timeSlot) ? form.timeSlot : (timeSlots[0] ?? "");

  const handleAdd = async () => {
    if (!safeEventName || !safeTimeSlot) {
      setStatus({ type: "error", message: "イベント名と時間を選択してください" });
      return;
    }

    const times = parseTime(safeTimeSlot);
    if (!times) {
      setStatus({ type: "error", message: "時間の形式が正しくありません（例: 18:00~21:00）" });
      return;
    }

    const entry = { date: form.date, eventName: safeEventName, timeSlot: safeTimeSlot, colorId: form.colorId };

    if (session?.access_token) {
      setLoading(true);
      setStatus(null);
      try {
        const startDateTime = `${form.date}T${times.start}:00+09:00`;
        const endDateTime = `${form.date}T${times.end}:00+09:00`;

        const body = {
          summary: safeEventName,
          start: { dateTime: startDateTime, timeZone: "Asia/Tokyo" },
          end: { dateTime: endDateTime, timeZone: "Asia/Tokyo" },
          colorId: form.colorId,
        };

        const res = await fetch(
          "https://www.googleapis.com/calendar/v3/calendars/primary/events",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
          }
        );

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error?.message ?? "APIエラー");
        }

        setStatus({ type: "success", message: `Googleカレンダーに追加しました：${safeEventName} (${form.date} ${safeTimeSlot})` });
      } catch (e: unknown) {
        setStatus({ type: "error", message: `失敗しました：${e instanceof Error ? e.message : String(e)}` });
      } finally {
        setLoading(false);
      }
    } else {
      setStatus({ type: "success", message: `追加しました（ローカル）：${safeEventName} (${form.date} ${safeTimeSlot})` });
    }

    setHistory((prev) => [entry, ...prev].slice(0, 20));
    // フォームは日付・色を維持してイベント名と時間はそのまま（連続入力しやすいよう）
  };

  const selectedColor = GOOGLE_CALENDAR_COLORS.find((c) => c.id === form.colorId);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">カレンダー</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">定常活動をGoogleカレンダーに追加します</p>
      </div>

      {/* Googleログイン状態 */}
      {session ? (
        <div className="flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-xs text-green-700 dark:text-green-400">
          <span>✓</span>
          <span>{session.user?.name} としてGoogleカレンダーに追加されます</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 px-4 py-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl text-xs text-yellow-700 dark:text-yellow-400">
          <span>⚠</span>
          <span>Googleログインするとカレンダーに自動追加されます</span>
        </div>
      )}

      {/* タブ */}
      <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1 gap-1">
        {([["input", "入力"], ["settings", "設定"]] as const).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all ${
              tab === id ? "bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 shadow-sm" : "text-gray-500 dark:text-gray-400"
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* ===== 入力タブ ===== */}
      {tab === "input" && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-5 space-y-4">

            {/* 日にち */}
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">日にち</label>
              <input type="date" value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>

            {/* イベント名 */}
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">イベント名</label>
              <select value={safeEventName}
                onChange={(e) => setForm((f) => ({ ...f, eventName: e.target.value }))}
                className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400">
                {eventNames.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>

            {/* 時間 */}
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">時間</label>
              <select value={safeTimeSlot}
                onChange={(e) => setForm((f) => ({ ...f, timeSlot: e.target.value }))}
                className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400">
                {timeSlots.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* 色（Googleログイン時のみ） */}
            {session && (
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">カレンダーの色</label>
                <div className="relative">
                  <select value={form.colorId}
                    onChange={(e) => setForm((f) => ({ ...f, colorId: e.target.value }))}
                    className="w-full border border-gray-200 dark:border-gray-600 rounded-lg pl-8 pr-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400 appearance-none">
                    {GOOGLE_CALENDAR_COLORS.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  {selectedColor && (
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full pointer-events-none"
                      style={{ backgroundColor: selectedColor.hex }} />
                  )}
                </div>
              </div>
            )}

            {/* 追加ボタン */}
            <button onClick={handleAdd} disabled={loading || eventNames.length === 0 || timeSlots.length === 0}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 dark:disabled:bg-blue-800 text-white text-sm font-semibold rounded-lg transition-colors">
              {loading ? "追加中..." : session ? "Googleカレンダーに追加" : "追加"}
            </button>

            {/* ステータス */}
            {status && (
              <div className={`px-4 py-3 rounded-lg text-sm ${
                status.type === "success"
                  ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800"
                  : "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800"
              }`}>
                {status.message}
              </div>
            )}
          </div>

          {/* 追加履歴（今セッション分） */}
          {history.length > 0 && (
            <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl overflow-hidden">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 px-5 py-3 border-b border-gray-100 dark:border-gray-700">
                今セッションの追加履歴
              </p>
              <ul className="divide-y divide-gray-50 dark:divide-gray-700">
                {history.map((h, i) => {
                  const color = GOOGLE_CALENDAR_COLORS.find((c) => c.id === h.colorId);
                  return (
                    <li key={i} className="flex items-center gap-3 px-5 py-2.5">
                      {color && <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color.hex }} />}
                      <span className="text-sm text-gray-700 dark:text-gray-200">{h.eventName}</span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">{h.date}</span>
                      <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">{h.timeSlot}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* ===== 設定タブ ===== */}
      {tab === "settings" && (
        <div className="space-y-5">

          {/* イベント名管理 */}
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
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
                追加
              </button>
            </div>
          </div>

          {/* 時間スロット管理 */}
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
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
                追加
              </button>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500">形式：HH:MM~HH:MM（例：18:00~21:00）</p>
          </div>
        </div>
      )}
    </div>
  );
}
