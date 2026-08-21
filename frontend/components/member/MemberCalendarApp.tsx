"use client";

import { useState } from "react";
import { useMemberCalendarStore, EVENT_COLORS } from "./useMemberCalendarStore";

function todayStr() { return new Date().toISOString().slice(0, 10); }
function ymd(y: number, m: number, d: number) {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
function getDaysInMonth(y: number, m: number) { return new Date(y, m, 0).getDate(); }
function getFirstDow(y: number, m: number) { return new Date(y, m - 1, 1).getDay(); }
function parseDow(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).getDay();
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

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

function ConfirmDialog({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mx-4 w-full max-w-sm space-y-4">
        <p className="text-sm font-medium text-gray-800 dark:text-gray-100 text-center">
          この予定を削除しますか？
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors"
          >
            削除する
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MemberCalendarApp({ groupId }: { groupId: string }) {
  const { addEvent, deleteEvent, eventsForDate } = useMemberCalendarStore(groupId);

  const today = todayStr();
  const [viewYear, setViewYear]   = useState(new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(new Date().getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    time: "",
    note: "",
    colorHex: EVENT_COLORS[0].hex,
    until: "", // 連続日程の最終日(未入力ならselectedDateのみに追加)
  });

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDow    = getFirstDow(viewYear, viewMonth);
  const totalCells  = Math.ceil((firstDow + daysInMonth) / 7) * 7;

  const prevMonth = () =>
    viewMonth === 1 ? (setViewYear((y) => y - 1), setViewMonth(12)) : setViewMonth((m) => m - 1);
  const nextMonth = () =>
    viewMonth === 12 ? (setViewYear((y) => y + 1), setViewMonth(1)) : setViewMonth((m) => m + 1);

  const selectDate = (d: string | null) => {
    setSelectedDate(d);
    setForm((f) => ({ ...f, until: "" }));
  };

  const handleAdd = async () => {
    if (!selectedDate || !form.title.trim()) return;
    const endDate = form.until && form.until >= selectedDate ? form.until : selectedDate;
    const targetDates = getDatesInRange(selectedDate, endDate);
    for (const d of targetDates) {
      await addEvent({
        date: d,
        title: form.title.trim(),
        time: form.time.trim(),
        note: form.note.trim(),
        colorHex: form.colorHex,
      });
    }
    setForm((f) => ({ ...f, title: "", time: "", note: "", until: "" }));
  };

  const bulkDateCount =
    selectedDate && form.until && form.until >= selectedDate
      ? getDatesInRange(selectedDate, form.until).length
      : 1;

  const selectedEntries = selectedDate ? eventsForDate(selectedDate) : [];

  return (
    <>
      {pendingDeleteId && (
        <ConfirmDialog
          onConfirm={() => { deleteEvent(pendingDeleteId); setPendingDeleteId(null); }}
          onCancel={() => setPendingDeleteId(null)}
        />
      )}

      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">スケジュール</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">チームの予定を管理します</p>
        </div>

        {/* 月カレンダー */}
        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-gray-700">
            <button
              onClick={prevMonth}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors text-lg"
            >‹</button>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
              {viewYear}年 {viewMonth}月
            </p>
            <button
              onClick={nextMonth}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors text-lg"
            >›</button>
          </div>

          {/* 曜日ヘッダー */}
          <div className="grid grid-cols-7 border-b border-gray-100 dark:border-gray-700">
            {WEEKDAYS.map((d, i) => (
              <div
                key={d}
                className={`py-2 text-center text-xs font-medium ${
                  i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-gray-400 dark:text-gray-500"
                }`}
              >
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
              const dayEntries = isValid ? eventsForDate(dateStr) : [];
              return (
                <div
                  key={idx}
                  onClick={() => isValid && selectDate(isSelected ? null : dateStr)}
                  className={`min-h-[64px] p-1 border-b border-r border-gray-50 dark:border-gray-700/50 transition-colors ${
                    isValid ? "cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/40" : ""
                  } ${isSelected ? "bg-blue-50 dark:bg-blue-900/20" : ""}`}
                >
                  {isValid && (
                    <>
                      <div className="flex justify-end mb-1">
                        <span
                          className={`w-6 h-6 flex items-center justify-center text-xs rounded-full font-medium ${
                            isToday
                              ? "bg-blue-600 text-white"
                              : dow === 0
                              ? "text-red-400"
                              : dow === 6
                              ? "text-blue-400"
                              : "text-gray-700 dark:text-gray-200"
                          }`}
                        >
                          {day}
                        </span>
                      </div>
                      <div className="space-y-0.5">
                        {dayEntries.slice(0, 2).map((e) => (
                          <div
                            key={e.id}
                            className="flex items-center gap-1 px-1 py-0.5 rounded truncate"
                            style={{ backgroundColor: e.colorHex + "22" }}
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: e.colorHex }}
                            />
                            <span
                              className="truncate text-gray-700 dark:text-gray-200"
                              style={{ fontSize: "10px" }}
                            >
                              {e.title}
                            </span>
                          </div>
                        ))}
                        {dayEntries.length > 2 && (
                          <p
                            className="text-gray-400 dark:text-gray-500"
                            style={{ fontSize: "10px", paddingLeft: "4px" }}
                          >
                            +{dayEntries.length - 2}
                          </p>
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
                  {WEEKDAYS[parseDow(selectedDate)]}曜日
                </span>
              </p>
              <button
                onClick={() => selectDate(null)}
                className="text-gray-300 dark:text-gray-600 hover:text-gray-500 text-lg leading-none"
              >×</button>
            </div>

            {/* イベント一覧 */}
            {selectedEntries.length > 0 && (
              <div className="space-y-2">
                {selectedEntries.map((e) => (
                  <div
                    key={e.id}
                    className="rounded-lg px-3 py-2.5 group"
                    style={{ backgroundColor: e.colorHex + "15" }}
                  >
                    <div className="flex items-start gap-2">
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0 mt-1"
                        style={{ backgroundColor: e.colorHex }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                            {e.title}
                          </span>
                          {e.time && (
                            <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0 font-mono">
                              {e.time}
                            </span>
                          )}
                        </div>
                        {e.note && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{e.note}</p>
                        )}
                      </div>
                      <button
                        onClick={() => setPendingDeleteId(e.id)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-300 dark:text-gray-600 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-all text-base flex-shrink-0"
                      >×</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 追加フォーム */}
            <div className="space-y-3">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">予定を追加</p>
              <input
                type="text"
                placeholder="タイトル（必須）"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
                className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 placeholder-gray-300 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="時間（例：18:00~21:00）"
                  value={form.time}
                  onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
                  className="border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 placeholder-gray-300 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400 font-mono"
                />
                <div className="flex items-center gap-2 flex-wrap">
                  {EVENT_COLORS.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, colorHex: c.hex }))}
                      title={c.name}
                      className={`w-6 h-6 rounded-full transition-transform ${
                        form.colorHex === c.hex
                          ? "scale-125 ring-2 ring-offset-1 ring-gray-400 dark:ring-gray-500"
                          : "hover:scale-110"
                      }`}
                      style={{ backgroundColor: c.hex }}
                    />
                  ))}
                </div>
              </div>
              <input
                type="text"
                placeholder="メモ（任意）"
                value={form.note}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 placeholder-gray-300 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  連続日程の最終日（同じ内容を続けて入れる場合のみ）
                </label>
                <input
                  type="date"
                  min={selectedDate ?? undefined}
                  value={form.until}
                  onChange={(e) => setForm((f) => ({ ...f, until: e.target.value }))}
                  className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                {bulkDateCount > 1 && (
                  <p className="text-[10px] text-blue-500 dark:text-blue-400 mt-1">
                    {selectedDate?.replace(/-/g, "/")} 〜 {form.until.replace(/-/g, "/")} の {bulkDateCount}日分、まとめて同じ予定を追加します
                  </p>
                )}
              </div>
              <button
                onClick={handleAdd}
                disabled={!form.title.trim()}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 dark:disabled:bg-blue-900 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                {bulkDateCount > 1 ? `${bulkDateCount}日分まとめて追加` : "追加"}
              </button>
            </div>
          </div>
        )}

        {!selectedDate && (
          <p className="text-center text-xs text-gray-400 dark:text-gray-500">
            日付をタップして予定を追加できます
          </p>
        )}
      </div>
    </>
  );
}
