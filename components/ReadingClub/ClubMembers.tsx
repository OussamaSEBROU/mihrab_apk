import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, MoreVertical, Copy, Loader2, Check, X, Share2, Link2 } from 'lucide-react';
import { ReadingClub, ClubUserProfile, ClubMember, getMemberNickname, getMemberAvatar, getMemberId } from '../../types/readingClub';
import { clubMembersAPI, clubInvitesAPI } from '../../services/readingClubAPI';
import ConfirmDialog from './shared/ConfirmDialog';

const MotionDiv = motion.div as any;
const AVATARS = ['📖','🌙','⭐','🔥','🌿','💎','🦋','🌸','🏔️','🌊','🎭','🕌'];

interface Props {
  lang: 'ar' | 'en';
  club: ReadingClub;
  userProfile: ClubUserProfile;
  isOwner: boolean;
  onBack: () => void;
}

export default function ClubMembers({ lang, club, userProfile, isOwner, onBack }: Props) {
  const isRTL = lang === 'ar';
  const isOwnerOrAdmin = isOwner || ['owner', 'full_admin', 'content_admin', 'member_admin', 'admin'].includes(club.myRole || '');

  const [members, setMembers] = useState<ClubMember[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionMemberId, setActionMemberId] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean; title: string; message: string; onConfirm: () => void;
  } | null>(null);

  // Invite link state
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [generatingInvite, setGeneratingInvite] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);
  // Toast
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2000); };

  useEffect(() => {
    const load = async () => {
      try {
        const memRes = await clubMembersAPI.list(club._id);
        setMembers(memRes.data || []);
        if (isOwner) {
          const reqRes = await clubInvitesAPI.getJoinRequests(club._id);
          setRequests(reqRes.data || []);
        }
      } catch (err) { console.error(err); }
      finally { setIsLoading(false); }
    };
    load();
  }, [club._id, isOwner]);

  // ═══════════════════════════════════════════════════
  // INVITE LINK — persistent from club creation
  // ═══════════════════════════════════════════════════
  useEffect(() => {
    // Auto-load existing invite code from club data
    if (club.inviteCode && !inviteToken) {
      setInviteToken(club.inviteCode);
    }
  }, [club.inviteCode]);

  const handleGenerateInvite = async () => {
    if (inviteToken) return;
    setGeneratingInvite(true);
    try {
      const res = await clubInvitesAPI.create(club._id);
      if (res.ok && res.data) {
        setInviteToken(res.data.token);
      } else {
        showToast(isRTL ? 'فشل إنشاء الرابط' : 'Failed to generate link');
      }
    } catch (err) { console.error(err); showToast(isRTL ? 'خطأ في الاتصال' : 'Network error'); }
    finally { setGeneratingInvite(false); }
  };

  const copyInviteLink = () => {
    const token = inviteToken || club.inviteCode;
    if (!token) return;
    const webUrl = `${window.location.origin}/join/${token}`;
    navigator.clipboard.writeText(webUrl).then(() => {
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 2000);
      showToast(isRTL ? 'تم نسخ الرابط' : 'Link copied');
    }).catch(() => {
      navigator.clipboard.writeText(`mihrab://club/invite/${token}`);
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 2000);
    });
  };

  const shareInviteLink = () => {
    const token = inviteToken || club.inviteCode;
    if (!token) return;
    const webUrl = `${window.location.origin}/join/${token}`;
    const text = isRTL ? `انضم لنادي "${club.name}" على تطبيق محراب!` : `Join "${club.name}" on Mihrab!`;
    if (navigator.share) {
      navigator.share({ title: club.name, text, url: webUrl }).catch(() => {});
    } else {
      copyInviteLink();
    }
  };

  // ═══════════════════════════════════════════════════
  // MEMBER ACTIONS
  // ═══════════════════════════════════════════════════
  const handleApprove = async (requestId: string) => {
    try {
      await clubInvitesAPI.handleJoinRequest(club._id, requestId, 'approve');
      setRequests(prev => prev.filter(r => r._id !== requestId));
      const memRes = await clubMembersAPI.list(club._id);
      setMembers(memRes.data || []);
      showToast(isRTL ? 'تم قبول العضو' : 'Member approved');
    } catch (err) { console.error(err); }
  };

  const handleReject = async (requestId: string) => {
    try {
      await clubInvitesAPI.handleJoinRequest(club._id, requestId, 'reject');
      setRequests(prev => prev.filter(r => r._id !== requestId));
      showToast(isRTL ? 'تم رفض الطلب' : 'Request rejected');
    } catch (err) { console.error(err); }
  };

  const handlePromote = async (memberId: string) => {
    try {
      await clubMembersAPI.changeRole(club._id, memberId, 'admin');
      setActionMemberId(null);
      const memRes = await clubMembersAPI.list(club._id);
      setMembers(memRes.data || []);
      showToast(isRTL ? 'تمت الترقية' : 'Promoted');
    } catch (err) { console.error(err); }
  };

  const handleMute = async (memberId: string) => {
    try {
      await clubMembersAPI.muteMember(club._id, memberId, 3600);
      setActionMemberId(null);
      showToast(isRTL ? 'تم كتم العضو لمدة ساعة' : 'Muted for 1 hour');
    } catch (err) { console.error(err); }
  };

  const handleRemove = (memberId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: isRTL ? 'إزالة العضو' : 'Remove Member',
      message: isRTL ? 'هل أنت متأكد من إزالة هذا العضو؟' : 'Are you sure you want to remove this member?',
      onConfirm: async () => {
        try {
          await clubMembersAPI.removeMember(club._id, memberId);
          setMembers(prev => prev.filter(m => getMemberId(m) !== memberId));
          setConfirmDialog(null); setActionMemberId(null);
          showToast(isRTL ? 'تم إزالة العضو' : 'Member removed');
        } catch (err) { console.error(err); }
      }
    });
  };

  const handleBan = (memberId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: isRTL ? 'حظر العضو' : 'Ban Member',
      message: isRTL ? 'هل أنت متأكد من حظر هذا العضو؟' : 'Are you sure you want to ban this member?',
      onConfirm: async () => {
        try {
          await clubMembersAPI.banMember(club._id, memberId);
          setMembers(prev => prev.filter(m => getMemberId(m) !== memberId));
          setConfirmDialog(null); setActionMemberId(null);
          showToast(isRTL ? 'تم حظر العضو' : 'Member banned');
        } catch (err) { console.error(err); }
      }
    });
  };

  const getRoleBadge = (role: string) => {
    const map: Record<string, {ar: string, en: string, color: string}> = {
      owner: {ar: 'مالك', en: 'OWNER', color: 'bg-red-600'},
      full_admin: {ar: 'مشرف أول', en: 'ADMIN', color: 'bg-amber-600'},
      content_admin: {ar: 'مشرف محتوى', en: 'CONTENT MOD', color: 'bg-amber-600/80'},
      member_admin: {ar: 'مشرف أعضاء', en: 'MEMBER MOD', color: 'bg-amber-600/60'},
      discussion_mod: {ar: 'مشرف نقاش', en: 'DISCUSSION MOD', color: 'bg-amber-600/40'},
      admin: {ar: 'مشرف', en: 'ADMIN', color: 'bg-amber-600'},
      member: {ar: 'عضو', en: 'MEMBER', color: 'bg-gray-600'},
      readonly: {ar: 'قراءة فقط', en: 'READ ONLY', color: 'bg-gray-500'},
    };
    const r = map[role] || map.member;
    return { label: lang === 'ar' ? r.ar : r.en, color: r.color };
  };

  return (
    <div className="flex flex-col h-full bg-[#000a00] text-white" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-red-900/30">
        <button onClick={onBack} className="text-red-600 p-2 hover:bg-red-900/20 rounded-full">
          {isRTL ? <ArrowRight size={24} /> : <ArrowLeft size={24} />}
        </button>
        <h1 className="font-black uppercase tracking-widest text-lg">{isRTL ? 'الأعضاء' : 'Members'}</h1>
        <div className="w-10"></div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">

        {/* ═══ INVITE LINK SECTION — Owner/Admin ═══ */}
        {isOwnerOrAdmin && club.privacy !== 'personal' && (
          <div className="bg-red-900/10 border border-red-900/30 rounded-xl p-4">
            <div className="text-xs text-red-500 font-black uppercase tracking-widest mb-3 flex items-center gap-2">
              <Link2 size={14} />
              {isRTL ? 'رابط الدعوة' : 'INVITE LINK'}
            </div>

            {!inviteToken ? (
              <button
                onClick={handleGenerateInvite}
                disabled={generatingInvite}
                className="w-full flex items-center justify-center gap-2 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black uppercase tracking-widest text-xs transition-colors disabled:opacity-50"
              >
                {generatingInvite ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <>
                    <Share2 size={16} />
                    <span>{isRTL ? 'إنشاء رابط دعوة' : 'Generate Invite Link'}</span>
                  </>
                )}
              </button>
            ) : (
              <div className="space-y-3">
                {/* Link display */}
                <div className="bg-black/50 rounded-lg p-3 border border-white/5">
                  <span className="text-xs font-mono text-gray-300 break-all block">
                    {window.location.origin}/join/{inviteToken}
                  </span>
                  <span className="text-[10px] font-mono text-gray-500 break-all block mt-1">
                    mihrab://club/invite/{inviteToken}
                  </span>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={copyInviteLink}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gray-800 hover:bg-gray-700 rounded-xl text-xs font-black uppercase tracking-widest transition-colors"
                  >
                    {inviteCopied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                    {isRTL ? 'نسخ' : 'Copy'}
                  </button>
                  <button
                    onClick={shareInviteLink}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-600 hover:bg-red-700 rounded-xl text-xs font-black uppercase tracking-widest transition-colors"
                  >
                    <Share2 size={14} />
                    {isRTL ? 'مشاركة' : 'Share'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ JOIN REQUESTS ═══ */}
        {isOwner && requests.length > 0 && (
          <div>
            <h2 className="text-sm font-black uppercase tracking-widest text-red-500 mb-3">
              {isRTL ? 'طلبات الانضمام' : 'Join Requests'} ({requests.length})
            </h2>
            <div className="space-y-2">
              {requests.map(req => (
                <div key={req._id} className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-xl">
                      {AVATARS[req.userId?.avatarIndex] || '📖'}
                    </div>
                    <span className="font-bold">{req.userId?.nickname}</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleApprove(req._id)} className="p-2 bg-green-600 rounded-lg text-white"><Check size={16} /></button>
                    <button onClick={() => handleReject(req._id)} className="p-2 bg-red-600 rounded-lg text-white"><X size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ MEMBERS LIST ═══ */}
        <div>
          <h2 className="text-sm font-black uppercase tracking-widest text-red-500 mb-3">
            {isRTL ? 'قائمة الأعضاء' : 'Members List'} ({members.length})
          </h2>
          {isLoading ? (
            <div className="flex justify-center p-8"><Loader2 className="animate-spin text-red-600" size={32} /></div>
          ) : (
            <div className="space-y-2">
              {members.map(member => {
                const memberId = getMemberId(member);
                const roleBadge = getRoleBadge(member.role);

                return (
                  <MotionDiv key={member._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex items-center justify-between relative">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-xl">
                        {AVATARS[getMemberAvatar(member)] || '📖'}
                      </div>
                      <div>
                        <div className="font-bold">{getMemberNickname(member)}</div>
                        <div className={`text-[10px] font-black uppercase tracking-widest border border-transparent rounded px-1 inline-block mt-1 ${roleBadge.color}`}>
                          {roleBadge.label}
                        </div>
                      </div>
                    </div>
                    {isOwner && memberId !== userProfile.id && memberId !== (userProfile.serverUserId || '') && (
                      <div className="relative">
                        <button
                          onClick={() => setActionMemberId(actionMemberId === memberId ? null : memberId)}
                          className="text-gray-500 hover:text-white p-1"
                        >
                          <MoreVertical size={20} />
                        </button>

                        {actionMemberId === memberId && (
                          <>
                            <div className="fixed inset-0 z-[100]" onClick={() => setActionMemberId(null)} />
                            <div className={`absolute ${isRTL ? 'left-0' : 'right-0'} mt-2 w-48 bg-gray-800 border border-gray-700 rounded-xl shadow-lg z-[101] overflow-hidden`}>
                              <button onClick={() => handlePromote(memberId)}
                                className={`w-full ${isRTL ? 'text-right' : 'text-left'} px-4 py-2 hover:bg-gray-700 text-sm`}>
                                {isRTL ? 'ترقية لمشرف' : 'Promote to Admin'}
                              </button>
                              <button onClick={() => handleMute(memberId)}
                                className={`w-full ${isRTL ? 'text-right' : 'text-left'} px-4 py-2 hover:bg-gray-700 text-sm`}>
                                {isRTL ? 'كتم (ساعة)' : 'Mute (1h)'}
                              </button>
                              <button onClick={() => handleRemove(memberId)}
                                className={`w-full ${isRTL ? 'text-right' : 'text-left'} px-4 py-2 hover:bg-gray-700 text-sm text-red-500`}>
                                {isRTL ? 'إزالة' : 'Remove'}
                              </button>
                              <button onClick={() => handleBan(memberId)}
                                className={`w-full ${isRTL ? 'text-right' : 'text-left'} px-4 py-2 hover:bg-gray-700 text-sm text-red-500`}>
                                {isRTL ? 'حظر' : 'Ban'}
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </MotionDiv>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Confirm Dialog */}
      {confirmDialog && (
        <ConfirmDialog
          lang={lang}
          kind="warning"
          title={confirmDialog.title}
          operationLabel={confirmDialog.message}
          consequencesLabel=""
          permanenceLabel=""
          onCancel={() => setConfirmDialog(null)}
          onConfirm={confirmDialog.onConfirm}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs font-bold px-4 py-2 rounded-full flex items-center gap-2 shadow-lg z-30 animate-pulse">
          <Check size={14} className="text-green-500" />
          {toast}
        </div>
      )}
    </div>
  );
}
