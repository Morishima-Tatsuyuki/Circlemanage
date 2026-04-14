"use client";

import { useState, useEffect, useCallback } from "react";
import type { Member, DuesPayment, CircleEvent, Transaction } from "./types";

function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) setValue(JSON.parse(raw));
    } catch {}
  }, [key]);

  const set = useCallback((v: T | ((prev: T) => T)) => {
    setValue((prev) => {
      const next = typeof v === "function" ? (v as (p: T) => T)(prev) : v;
      localStorage.setItem(key, JSON.stringify(next));
      return next;
    });
  }, [key]);

  return [value, set] as const;
}

export function useAccountingStore() {
  const [members, setMembers] = useLocalStorage<Member[]>("circle_members", []);
  const [dues, setDues] = useLocalStorage<DuesPayment[]>("circle_dues", []);
  const [events, setEvents] = useLocalStorage<CircleEvent[]>("circle_events", []);
  const [transactions, setTransactions] = useLocalStorage<Transaction[]>("circle_transactions", []);

  // Members
  const addMember = (name: string) => {
    const m: Member = { id: crypto.randomUUID(), name: name.trim(), createdAt: new Date().toISOString().slice(0, 10) };
    setMembers((prev) => [...prev, m]);
  };
  const deleteMember = (id: string) => {
    setMembers((prev) => prev.filter((m) => m.id !== id));
    setDues((prev) => prev.filter((d) => d.memberId !== id));
  };

  // Dues
  const addDues = (payment: Omit<DuesPayment, "id">) => {
    setDues((prev) => [...prev, { ...payment, id: crypto.randomUUID() }]);
  };
  const deleteDues = (id: string) => setDues((prev) => prev.filter((d) => d.id !== id));

  // Events
  const addEvent = (e: Omit<CircleEvent, "id">) => {
    setEvents((prev) => [...prev, { ...e, id: crypto.randomUUID() }].sort((a, b) => b.date.localeCompare(a.date)));
  };
  const deleteEvent = (id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
    setTransactions((prev) => prev.map((t) => t.eventId === id ? { ...t, eventId: undefined } : t));
  };

  // Transactions
  const addTransaction = (t: Omit<Transaction, "id">) => {
    setTransactions((prev) => [...prev, { ...t, id: crypto.randomUUID() }].sort((a, b) => b.date.localeCompare(a.date)));
  };
  const deleteTransaction = (id: string) => setTransactions((prev) => prev.filter((t) => t.id !== id));

  // Computed
  const totalIncome = transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const balance = totalIncome - totalExpense;

  const totalDues = dues.reduce((s, d) => s + d.amount, 0);

  const eventBalance = (eventId: string) => {
    const txs = transactions.filter((t) => t.eventId === eventId);
    const income = txs.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const expense = txs.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    return { income, expense, balance: income - expense, txs };
  };

  const memberDuesTotal = (memberId: string) =>
    dues.filter((d) => d.memberId === memberId).reduce((s, d) => s + d.amount, 0);

  return {
    members, addMember, deleteMember,
    dues, addDues, deleteDues,
    events, addEvent, deleteEvent,
    transactions, addTransaction, deleteTransaction,
    totalIncome, totalExpense, balance, totalDues,
    eventBalance, memberDuesTotal,
  };
}
