"use client";

import { useState } from "react";

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

function parseList(s: string): number[] {
  return s.split(",").map((v) => v.trim()).filter(Boolean).map(Number).filter((n) => !isNaN(n) && n >= 0);
}

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
  const [newName, setNewName] = useState("");
  const [newCanDrive, setNewCanDrive] = useState(false);

  const [result, setResult] = useState<CostResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const addMember = () => {
    const name = newName.trim();
    if (!name) return;
    setMembers((prev) => [
      ...prev,
      { id: uuid(), name, can_drive: newCanDrive, has_insurance: false, pre_paid: false, advance_payment: 0 },
    ]);
    setNewName("");
  };

  const updateMember = <K extends keyof CostMember>(id: string, field: K, value: CostMember[K]) =>
    setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, [field]: value } : m)));

  const removeMember = (id: string) => setMembers((prev) => prev.filter((m) => m.id !== id));

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
      {/* 費用設定 */}
      <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-5 space-y-4">
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">費用設定</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-400 block mb-1">参加費（円）</label>
            <input type="number" value={participate} min={0} onChange={(e) => setParticipate(Number(e.target.value))} className={inputCls} />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">施設費（円）</label>
            <input type="number" value={entry} min={0} onChange={(e) => setEntry(Number(e.target.value))} className={inputCls} />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">保険費（円/人）</label>
            <input type="number" value={finance} min={0} onChange={(e) => setFinance(Number(e.target.value))} className={inputCls} />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">事前支払い額（円）</label>
            <input type="number" value={prePayed} min={0} onChange={(e) => setPrePayed(Number(e.target.value))} className={inputCls} />
          </div>
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
              <input type="text" value={value} onChange={(e) => set(e.target.value)} placeholder={placeholder} className={inputCls} />
            </div>
          ))}
        </div>
      </div>

      {/* 参加者 */}
      <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">参加者</p>
          <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
            <span>運転手 {drivers.length}名</span>
            <span>乗客 {passengers.length}名</span>
          </div>
        </div>

        {/* 追加フォーム */}
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addMember()}
            placeholder="名前を入力"
            className="flex-1 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <div className="flex border border-gray-200 dark:border-gray-600 rounded-xl overflow-hidden flex-shrink-0">
            <button
              type="button"
              onClick={() => setNewCanDrive(false)}
              className={`px-3 py-2 text-xs font-medium transition-colors ${
                !newCanDrive ? "bg-green-600 text-white" : "bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-500"
              }`}
            >
              乗客
            </button>
            <button
              type="button"
              onClick={() => setNewCanDrive(true)}
              className={`px-3 py-2 text-xs font-medium transition-colors ${
                newCanDrive ? "bg-blue-600 text-white" : "bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-500"
              }`}
            >
              運転手
            </button>
          </div>
          <button
            type="button"
            onClick={addMember}
            disabled={!newName.trim()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 dark:disabled:bg-gray-700 disabled:text-gray-400 text-white text-sm font-semibold rounded-xl transition-colors flex-shrink-0"
          >
            追加
          </button>
        </div>

        {members.length === 0 ? (
          <p className="text-center text-sm text-gray-400 dark:text-gray-500 py-4">参加者を追加してください</p>
        ) : (
          <div className="space-y-2">
            {members.map((m) => (
              <div
                key={m.id}
                className={`border rounded-xl p-3 transition-all ${
                  m.can_drive
                    ? "border-l-4 border-l-blue-400 border-gray-100 dark:border-gray-700"
                    : "border-l-4 border-l-green-400 border-gray-100 dark:border-gray-700"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        m.can_drive
                          ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                          : "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                      }`}
                    >
                      {m.can_drive ? "運転手" : "乗客"}
                    </span>
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-100">{m.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeMember(m.id)}
                    className="text-xs text-gray-300 dark:text-gray-600 hover:text-red-400 transition-colors"
                  >
                    ✕
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2 items-center">
                  <label className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={m.has_insurance}
                      onChange={(e) => updateMember(m.id, "has_insurance", e.target.checked)}
                      className="rounded border-gray-300 dark:border-gray-600 text-indigo-600"
                    />
                    保険あり
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={m.pre_paid}
                      onChange={(e) => updateMember(m.id, "pre_paid", e.target.checked)}
                      className="rounded border-gray-300 dark:border-gray-600 text-indigo-600"
                    />
                    事前支払い済
                  </label>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-400 flex-shrink-0">立替</span>
                    <input
                      type="number"
                      value={m.advance_payment}
                      min={0}
                      onChange={(e) => updateMember(m.id, "advance_payment", Number(e.target.value))}
                      className="flex-1 min-w-0 border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1 text-xs bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                    />
                    <span className="text-xs text-gray-400 flex-shrink-0">円</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
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
