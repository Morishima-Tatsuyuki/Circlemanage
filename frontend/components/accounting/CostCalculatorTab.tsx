"use client";

import { useState, useRef } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type CostMember = {
  id: string;
  name: string;
  can_drive: boolean;
  has_insurance: boolean;
  pre_paid: boolean;
  advance_payment: number;
};

type CostResult = { name: string; role: string; amount: number };
type CostResponse = {
  costs?: CostResult[];
  summary?: { drivers: number; passengers: number; pass_val: number; drive_val: number };
  error?: string;
};

function uuid() { return crypto.randomUUID(); }

function parseCostCsv(text: string): CostMember[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));
  return lines
    .slice(1)
    .map((line) => {
      const values = line.split(",").map((v) => v.trim().replace(/"/g, ""));
      const row: Record<string, string> = {};
      headers.forEach((h, i) => { row[h] = values[i] ?? ""; });
      const name = row["名前"] ?? "";
      if (!name) return null;
      return {
        id: uuid(),
        name,
        can_drive: row["参加形態"] === "運転手",
        has_insurance: row["保険"] === "あり",
        pre_paid: row["事前支払い"] === "済",
        advance_payment: parseFloat(row["立て替え"]) || 0,
      };
    })
    .filter((m): m is CostMember => m !== null);
}

const TEMPLATE_CSV = [
  "名前,最寄り駅,参加形態,一緒になりたい人,気まずい人,保険,事前支払い,立て替え",
  "田中,新宿,運転手,,,なし,,42448",
  "山田,渋谷,乗客,,,あり,済,",
  "鈴木,池袋,乗客,,,,未,",
].join("\n");

const inputCls =
  "w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-400";

export default function CostCalculatorTab() {
  const [participate, setParticipate] = useState(11500);
  const [prePayed, setPrePayed] = useState(15000);
  const [entry, setEntry] = useState(20000);
  const [finance, setFinance] = useState(600);
  const [alcohol, setAlcohol] = useState("");
  const [petlorem, setPetlorem] = useState("");
  const [express, setExpress] = useState("");
  const [lent, setLent] = useState("");

  const [members, setMembers] = useState<CostMember[]>([]);
  const [csvFileName, setCsvFileName] = useState("");
  const [csvApplied, setCsvApplied] = useState(false);
  const [parsedRows, setParsedRows] = useState<CostMember[]>([]);

  const [result, setResult] = useState<CostResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseList = (s: string): number[] =>
    s.split(",").map((v) => v.trim()).filter(Boolean).map(Number).filter((n) => !isNaN(n) && n >= 0);

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFileName(file.name);
    setCsvApplied(false);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setParsedRows(parseCostCsv(text));
    };
    reader.readAsText(file, "UTF-8");
  };

  const applyCsv = () => {
    setMembers(parsedRows);
    setCsvApplied(true);
    setResult(null);
  };

  const removeMember = (id: string) =>
    setMembers((prev) => prev.filter((m) => m.id !== id));

  const downloadTemplate = () => {
    const blob = new Blob(["﻿" + TEMPLATE_CSV], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "費用計算テンプレート.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const calculate = async () => {
    setLoading(true);
    setResult(null);
    try {
      const payload = {
        members: members.map(({ id: _id, ...rest }) => rest),
        participate,
        pre_payed: prePayed,
        entry,
        finance,
        alcohol: parseList(alcohol),
        petlorem: parseList(petlorem),
        express: parseList(express),
        lent: parseList(lent),
      };
      const res = await fetch(`${API_BASE}/calculate-costs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setResult(await res.json());
    } catch {
      setResult({ error: "通信エラーが発生しました。バックエンドが起動しているか確認してください。" });
    } finally {
      setLoading(false);
    }
  };

  const drivers = members.filter((m) => m.can_drive);
  const passengers = members.filter((m) => !m.can_drive);

  return (
    <div className="space-y-5">

      {/* STEP 1: CSVアップロード */}
      <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-xs font-bold mr-1.5">1</span>
            参加者CSVを読み込む
          </p>
          <button
            type="button"
            onClick={downloadTemplate}
            className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            📥 テンプレートDL
          </button>
        </div>

        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-xl p-5 text-center cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition-colors"
        >
          <p className="text-xl mb-1">📂</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {csvFileName ? csvFileName : "CSVファイルをクリックして選択"}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Excelファイル → 名前を付けて保存 → CSV形式で保存してからアップロード
          </p>
          <input ref={fileInputRef} type="file" accept=".csv" onChange={handleCsvUpload} className="hidden" />
        </div>

        {parsedRows.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-600 dark:text-gray-400">{parsedRows.length}件を読み込みました</p>
              {csvApplied && <span className="text-xs text-green-600 dark:text-green-400">✅ 反映済み</span>}
            </div>
            <button
              type="button"
              onClick={applyCsv}
              className="w-full py-2.5 rounded-xl text-sm font-medium bg-indigo-600 hover:bg-indigo-700 active:scale-[.98] text-white transition-all"
            >
              ✅ このデータで参加者を設定する
            </button>
          </div>
        )}
      </div>

      {/* 参加者一覧 */}
      {members.length > 0 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-xs font-bold mr-1.5">2</span>
              参加者確認
            </p>
            <div className="flex gap-3 text-xs text-gray-400 dark:text-gray-500">
              <span>🚗 運転手 {drivers.length}名</span>
              <span>👤 乗客 {passengers.length}名</span>
            </div>
          </div>
          <div className="space-y-2">
            {members.map((m) => (
              <div
                key={m.id}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border ${
                  m.can_drive
                    ? "border-l-4 border-l-blue-400 border-gray-100 dark:border-gray-700"
                    : "border-l-4 border-l-green-400 border-gray-100 dark:border-gray-700"
                }`}
              >
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
                    m.can_drive
                      ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                      : "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                  }`}
                >
                  {m.can_drive ? "運転手" : "乗客"}
                </span>
                <span className="flex-1 text-sm text-gray-800 dark:text-gray-100">{m.name}</span>
                <div className="flex gap-2 text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                  {m.has_insurance && <span className="text-indigo-500 dark:text-indigo-400">保険あり</span>}
                  {m.pre_paid && <span className="text-green-500 dark:text-green-400">事前支払済</span>}
                  {m.advance_payment > 0 && (
                    <span className="text-amber-500 dark:text-amber-400">立替{m.advance_payment.toLocaleString()}円</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeMember(m.id)}
                  className="text-gray-300 dark:text-gray-600 hover:text-red-400 transition-colors text-base leading-none flex-shrink-0"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STEP 2/3: 費用設定 */}
      <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-5 space-y-4">
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-xs font-bold mr-1.5">
            {members.length > 0 ? "3" : "2"}
          </span>
          費用設定
        </p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "参加費（円）", value: participate, set: setParticipate },
            { label: "施設費（円）", value: entry, set: setEntry },
            { label: "保険費（円/人）", value: finance, set: setFinance },
            { label: "事前支払い額（円）", value: prePayed, set: setPrePayed },
          ].map(({ label, value, set }) => (
            <div key={label}>
              <label className="text-xs text-gray-400 block mb-1">{label}</label>
              <input
                type="number"
                value={value}
                min={0}
                onChange={(e) => set(Number(e.target.value))}
                className={inputCls}
              />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "お酒代（カンマ区切り）", value: alcohol, set: setAlcohol, placeholder: "6316" },
            { label: "ガソリン代（カンマ区切り）", value: petlorem, set: setPetlorem, placeholder: "0" },
            { label: "高速代（カンマ区切り）", value: express, set: setExpress, placeholder: "0" },
            { label: "立て替え（カンマ区切り）", value: lent, set: setLent, placeholder: "42448,19670,20650" },
          ].map(({ label, value, set, placeholder }) => (
            <div key={label}>
              <label className="text-xs text-gray-400 block mb-1">{label}</label>
              <input
                type="text"
                value={value}
                onChange={(e) => set(e.target.value)}
                placeholder={placeholder}
                className={inputCls}
              />
            </div>
          ))}
        </div>
      </div>

      {/* 計算ボタン */}
      <button
        type="button"
        onClick={calculate}
        disabled={loading || members.length === 0}
        className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 active:scale-[.98] disabled:bg-gray-200 dark:disabled:bg-gray-700 disabled:text-gray-400 text-white font-bold text-sm rounded-xl transition-all"
      >
        {loading ? "計算中..." : "費用を計算する"}
      </button>

      {/* 結果 */}
      {result && (
        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl overflow-hidden">
          {result.error ? (
            <p className="p-5 text-sm text-red-500 dark:text-red-400">{result.error}</p>
          ) : (
            <>
              {result.summary && (
                <div className="grid grid-cols-2 divide-x divide-gray-100 dark:divide-gray-700 border-b border-gray-100 dark:border-gray-700">
                  <div className="px-4 py-3 text-center">
                    <p className="text-xs text-gray-400 dark:text-gray-500">乗客の基本費用</p>
                    <p className="text-base font-bold text-gray-800 dark:text-gray-100 mt-0.5">
                      {Math.ceil(result.summary.pass_val).toLocaleString()}円
                    </p>
                  </div>
                  <div className="px-4 py-3 text-center">
                    <p className="text-xs text-gray-400 dark:text-gray-500">運転手の基本費用</p>
                    <p className="text-base font-bold text-gray-800 dark:text-gray-100 mt-0.5">
                      {Math.ceil(result.summary.drive_val).toLocaleString()}円
                    </p>
                  </div>
                </div>
              )}
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 px-5 py-3 border-b border-gray-100 dark:border-gray-700">
                個人別費用
              </p>
              <ul className="divide-y divide-gray-50 dark:divide-gray-700">
                {result.costs?.map((c, i) => (
                  <li key={i} className="flex items-center px-5 py-3.5 gap-3">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
                        c.role === "運転手"
                          ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                          : "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                      }`}
                    >
                      {c.role}
                    </span>
                    <span className="flex-1 text-sm text-gray-800 dark:text-gray-100">{c.name}</span>
                    <span
                      className={`text-base font-bold ${
                        c.amount < 0 ? "text-green-600 dark:text-green-400" : "text-gray-800 dark:text-gray-100"
                      }`}
                    >
                      {c.amount < 0 ? "+" : ""}
                      {Math.abs(c.amount).toLocaleString()}円
                      {c.amount < 0 && (
                        <span className="text-xs font-normal ml-1 text-gray-400">受取</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
