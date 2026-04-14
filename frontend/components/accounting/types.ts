export type TransactionType = "income" | "expense";

export interface Member {
  id: string;
  name: string;
  createdAt: string;
}

export interface DuesPayment {
  id: string;
  memberId: string;
  amount: number;
  date: string;
  note: string;
}

export interface CircleEvent {
  id: string;
  name: string;
  date: string;
  description: string;
}

export interface Transaction {
  id: string;
  date: string;
  type: TransactionType;
  category: string;
  description: string;
  amount: number;
  eventId?: string;
  memberId?: string;
  calendarEntryId?: string;
}

export const INCOME_CATEGORIES = ["部費", "補助金", "寄付", "イベント収益", "その他"];
export const EXPENSE_CATEGORIES = ["活動費", "備品", "食費", "交通費", "会場費", "印刷費", "その他"];
