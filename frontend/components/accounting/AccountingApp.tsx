"use client";

import CostCalculatorTab from "./CostCalculatorTab";

export default function AccountingApp() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">費用計算</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">参加者CSVをアップロードして個人別費用を計算します</p>
      </div>
      <CostCalculatorTab />
    </div>
  );
}
