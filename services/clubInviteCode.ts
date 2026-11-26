// ══════════════════════════════════════════════════════════════
// CLUB INVITE CODE — مصدر واحد لرمز دعوة النادي
// نفس الرمز يظهر عند إنشاء المنافسة، وفي رابط الدعوة، وفي صفحة الأعضاء، لنفس النادي.
// ══════════════════════════════════════════════════════════════

import { clubInvitesAPI } from './readingClubAPI';

const KEY = (clubId: string) => `sanctuary_club_invite_${clubId}`;

export const clubInviteCode = {
  /** الرمز المعروف لهذا النادي (من بيانات النادي أو من التخزين المحلي) */
  get(clubId: string, club?: { inviteCode?: string } | null): string | null {
    if (club?.inviteCode) return club.inviteCode;
    try { return localStorage.getItem(KEY(clubId)) || null; } catch { return null; }
  },

  set(clubId: string, token: string) {
    try { localStorage.setItem(KEY(clubId), token); } catch { /* non-critical */ }
  },

  /** يعيد الرمز الموحَّد؛ وإن لم يوجد يُنشئ واحداً مرة واحدة ويحفظه */
  async ensure(clubId: string, club?: { inviteCode?: string } | null): Promise<string | null> {
    const known = clubInviteCode.get(clubId, club);
    if (known) { clubInviteCode.set(clubId, known); return known; }
    try {
      const res = await clubInvitesAPI.create(clubId, 0, 0);
      if (res.ok && res.data?.token) {
        clubInviteCode.set(clubId, res.data.token);
        return res.data.token;
      }
    } catch { /* offline */ }
    return null;
  },

  /** رابط الدعوة الذي يحمل الرمز نفسه */
  link(token: string): string {
    return `${window.location.origin}/join/${token}`;
  },
};
