"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { apiGet, apiPut } from "@/lib/apiClient";

export const MEALS = ["朝", "昼", "夜"] as const;
export type Meal = (typeof MEALS)[number];

export type Period = { start: string; end: string };

// 氏名 -> 日付 -> 食事 -> 参加有無
export type Attendance = Record<string, Record<string, Record<Meal, boolean>>>;

// 氏名 -> 前金を徴収済みか
export type DepositPaid = Record<string, boolean>;

export type CostItem = { label: string; amount: number };

export type MealPrices = Record<Meal, number>;

// BBQなど、特定の日だけ夕食が通常と異なる単価になる場合の設定
export type SpecialDinnerPrice = { id: string; date: string; price: number };

export type CostSettings = {
  lodgingFee: number;
  mealPrices: MealPrices;
  specialDinnerPrices: SpecialDinnerPrice[];
  depositAmount: number;
  items: CostItem[];
};

export const DEFAULT_COST_SETTINGS: CostSettings = {
  lodgingFee: 8400,
  mealPrices: { 朝: 0, 昼: 0, 夜: 0 },
  specialDinnerPrices: [],
  depositAmount: 0,
  items: [
    { label: "宴会費", amount: 0 },
    { label: "保険料", amount: 0 },
    { label: "バス代", amount: 0 },
    { label: "施設利用料", amount: 0 },
    { label: "備品費", amount: 0 },
  ],
};

type ApiCampData = {
  period_start: string;
  period_end: string;
  attendance: Attendance;
  deposit_paid: DepositPaid;
  cost_settings: Partial<CostSettings>;
};

export function useCampData(groupId: string) {
  const { data: session } = useSession();
  const [period, setPeriod] = useState<Period>({ start: "", end: "" });
  const [attendance, setAttendance] = useState<Attendance>({});
  const [depositPaid, setDepositPaid] = useState<DepositPaid>({});
  const [costSettings, setCostSettings] = useState<CostSettings>(DEFAULT_COST_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!groupId || !session) return;
    let cancelled = false;
    apiGet<ApiCampData>(`/groups/${groupId}/camp`, session)
      .then((data) => {
        if (cancelled) return;
        setPeriod({ start: data.period_start || "", end: data.period_end || "" });
        setAttendance(data.attendance || {});
        setDepositPaid(data.deposit_paid || {});
        setCostSettings({
          ...DEFAULT_COST_SETTINGS,
          ...(data.cost_settings || {}),
          mealPrices: { ...DEFAULT_COST_SETTINGS.mealPrices, ...(data.cost_settings?.mealPrices || {}) },
          specialDinnerPrices: data.cost_settings?.specialDinnerPrices || [],
        });
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, [groupId, session]);

  // flush()時点の最新値を参照するため、レンダーごとに更新するrefに逃がす
  const latestRef = useRef({ period, attendance, depositPaid, costSettings });
  latestRef.current = { period, attendance, depositPaid, costSettings };

  const flush = useCallback(async () => {
    if (!groupId || !session) return;
    const { period, attendance, depositPaid, costSettings } = latestRef.current;
    await apiPut(`/groups/${groupId}/camp`, {
      period_start: period.start,
      period_end: period.end,
      attendance,
      deposit_paid: depositPaid,
      cost_settings: costSettings,
    }, session);
  }, [groupId, session]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!loaded) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { flush(); }, 500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [period, attendance, depositPaid, costSettings, loaded, flush]);

  // アンマウント時に保留中の変更を必ず反映する
  useEffect(() => {
    return () => { flush(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    period, setPeriod,
    attendance, setAttendance,
    depositPaid, setDepositPaid,
    costSettings, setCostSettings,
    loaded, flush,
  };
}
