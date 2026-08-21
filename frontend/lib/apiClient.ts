"use client";

import { getSession } from "next-auth/react";
import type { Session } from "next-auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function request(path: string, init: RequestInit, session: Session | null): Promise<Response> {
  const doFetch = (token?: string) =>
    fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        ...(init.headers || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

  let res = await doFetch(session?.backendToken);
  if (res.status === 401) {
    const fresh = await getSession();
    res = await doFetch(fresh?.backendToken);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `リクエストに失敗しました (${res.status})`);
  }
  return res;
}

export async function apiGet<T = unknown>(path: string, session: Session | null): Promise<T> {
  const res = await request(path, { method: "GET" }, session);
  return res.json();
}

export async function apiPost<T = unknown>(path: string, body: unknown, session: Session | null): Promise<T> {
  const res = await request(
    path,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
    session
  );
  return res.json();
}

export async function apiPut<T = unknown>(path: string, body: unknown, session: Session | null): Promise<T> {
  const res = await request(
    path,
    { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
    session
  );
  return res.json();
}

export async function apiDelete<T = unknown>(path: string, session: Session | null): Promise<T> {
  const res = await request(path, { method: "DELETE" }, session);
  return res.json();
}
