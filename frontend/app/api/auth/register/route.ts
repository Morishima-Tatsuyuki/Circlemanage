import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const backendUrl = process.env.BACKEND_URL;
  if (!backendUrl) {
    return NextResponse.json({ detail: "サーバー設定エラー: BACKEND_URLが未設定です" }, { status: 500 });
  }

  const body = await req.json();

  try {
    const res = await fetch(`${backendUrl}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    console.error("register proxy error:", e);
    return NextResponse.json({ detail: "バックエンドに接続できません" }, { status: 502 });
  }
}
