import { getSession } from "next-auth/react";
import { apiPut, apiPost } from "./apiClient";

const LEGACY_KEYS = {
  roster: "roster_members",
  schedule: "team_calendar_events",
  campPeriod: "camp_period",
  campAttendance: "camp_attendance",
  campCost: "camp_cost_settings",
  campDeposit: "camp_deposit_paid",
} as const;

const DISMISS_FLAG = "legacy_import_dismissed";

type LegacyRosterMember = { grade: string; name: string; studentId: string; birthDate: string };
type LegacyScheduleEvent = { date: string; title: string; time: string; note: string; colorHex: string };

export async function importLegacyLocalStorage(groupId: number): Promise<void> {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(DISMISS_FLAG)) return;

  const rosterRaw = localStorage.getItem(LEGACY_KEYS.roster);
  const scheduleRaw = localStorage.getItem(LEGACY_KEYS.schedule);
  const periodRaw = localStorage.getItem(LEGACY_KEYS.campPeriod);
  const attendanceRaw = localStorage.getItem(LEGACY_KEYS.campAttendance);
  const costRaw = localStorage.getItem(LEGACY_KEYS.campCost);
  const depositRaw = localStorage.getItem(LEGACY_KEYS.campDeposit);

  const hasData = [rosterRaw, scheduleRaw, periodRaw, attendanceRaw, costRaw, depositRaw].some(
    (v) => v && v !== "[]" && v !== "{}"
  );
  if (!hasData) return;

  const proceed = window.confirm(
    "この端末に保存されていた名簿・スケジュール・合宿データが見つかりました。新しいグループに引き継ぎますか？"
  );
  if (!proceed) {
    localStorage.setItem(DISMISS_FLAG, "1");
    return;
  }

  const session = await getSession();

  try {
    if (rosterRaw) {
      const roster: LegacyRosterMember[] = JSON.parse(rosterRaw);
      if (roster.length > 0) {
        await apiPut(
          `/groups/${groupId}/roster`,
          {
            members: roster.map((m) => ({
              grade: m.grade, name: m.name, student_id: m.studentId, birth_date: m.birthDate,
            })),
          },
          session
        );
      }
    }

    if (scheduleRaw) {
      const events: LegacyScheduleEvent[] = JSON.parse(scheduleRaw);
      for (const ev of events) {
        await apiPost(
          `/groups/${groupId}/schedule`,
          { date: ev.date, title: ev.title, time: ev.time, note: ev.note, color_hex: ev.colorHex },
          session
        );
      }
    }

    if (periodRaw || attendanceRaw || costRaw || depositRaw) {
      const period = periodRaw ? JSON.parse(periodRaw) : { start: "", end: "" };
      const attendance = attendanceRaw ? JSON.parse(attendanceRaw) : {};
      const depositPaid = depositRaw ? JSON.parse(depositRaw) : {};
      const costSettings = costRaw ? JSON.parse(costRaw) : {};
      await apiPut(
        `/groups/${groupId}/camp`,
        {
          period_start: period.start ?? "",
          period_end: period.end ?? "",
          attendance,
          deposit_paid: depositPaid,
          cost_settings: costSettings,
        },
        session
      );
    }

    Object.values(LEGACY_KEYS).forEach((k) => localStorage.removeItem(k));
  } catch (e) {
    console.error("ローカルデータの引き継ぎに失敗しました", e);
  }
}
