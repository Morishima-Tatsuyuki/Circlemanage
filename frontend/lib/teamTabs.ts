// 幹部ビュー（/?view=team）内のタブ一覧。
// page.tsx（タブの中身の描画）と Navbar.tsx（ハンバーガーメニューのタブ一覧）の
// 両方から参照し、一覧がズレないようにする。
export const TEAM_TABS = [
  { id: "roster",     label: "名簿" },
  { id: "schedule",   label: "スケジュール" },
  { id: "accounting", label: "会計管理" },
  { id: "camp",       label: "合宿管理" },
  { id: "stay",       label: "宿泊大会管理" },
  { id: "group",      label: "グループ" },
] as const;
