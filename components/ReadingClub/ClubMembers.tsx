import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, MoreVertical, Copy, Loader2, Check, X } from 'lucide-react';
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
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  
  const [actionMemberId, setActionMemberId] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const memRes = await clubMembersAPI.list(club._id);
        setMembers(memRes.data || []);
        if (isOwner) {
          const reqRes = await clubInvitesAPI.getJoinRequests(club._id);
          setRequests(reqRes.data || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [club._id, isOwner]);

  const copyInvite = () => {
    if (club.inviteCode) {
      navigator.clipboard.writeText(club.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleApprove = async (requestId: string) => {
    try {
      await clubInvitesAPI.handleJoinRequest(club._id, requestId, 'approve');
      setRequests(requests.filter(req => req._id !== requestId));
      // Refresh members list
      const memRes = await clubMembersAPI.list(club._id);
      setMembers(memRes.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      await clubInvitesAPI.handleJoinRequest(club._id, requestId, 'reject');
      setRequests(requests.filter(req => req._id !== requestId));
    } catch (err) {
      console.error(err);
    }
  };

  const handlePromote = async (memberId: string) => {
    try {
      await clubMembersAPI.changeRole(club._id, memberId, 'admin');
      setActionMemberId(null);
      const memRes = await clubMembersAPI.list(club._id);
      setMembers(memRes.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleMute = async (memberId: string) => {
    try {
      await clubMembersAPI.muteMember(club._id, memberId, 3600);
      setActionMemberId(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemove = (memberId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: isRTL ? 'إزالة العضو' : 'Remove Member',
      message: isRTL ? 'هل أنت متأكد من إزالة هذا العضو؟' : 'Are you sure you want to remove this member?',
      onConfirm: async () => {
        try {
          await clubMembersAPI.removeMember(club._id, memberId);
          setMembers(members.filter(m => getMemberId(m) !== memberId));
          setConfirmDialog(null);
          setActionMemberId(null);
        } catch (err) {
          console.error(err);
        }
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
          setMembers(members.filter(m => getMemberId(m) !== memberId));
          setConfirmDialog(null);
          setActionMemberId(null);
        } catch (err) {
          console.error(err);
        }
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
      <div className="flex items-center justify-between p-4 border-b border-red-900/30">
        <button onClick={onBack} className="text-red-600 p-2 hover:bg-red-900/20 rounded-full">
          {isRTL ? <ArrowRight size={24} /> : <ArrowLeft size={24} />}
        </button>
        <h1 className="font-black uppercase tracking-widest text-lg">{isRTL ? 'الأعضاء' : 'Members'}</h1>
        <div className="w-10"></div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {isOwner && club.inviteCode && (
          <div className="bg-red-900/20 border border-red-600/30 rounded-xl p-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-red-500 font-black uppercase tracking-widest mb-1">
                {isRTL ? 'رمز الدعوة' : 'Invite Code'}
              </div>
              <div className="font-mono text-lg">{club.inviteCode}</div>
            </div>
            <button onClick={copyInvite} className="p-2 bg-red-600 rounded-lg text-white">
              {copied ? <Check size={20} /> : <Copy size={20} />}
            </button>
          </div>
        )}

        {isOwner && requests.length > 0 && (
          <div>
            <h2 className="text-sm font-black uppercase tracking-widest text-red-500 mb-3">
              {isRTL ? 'طلبات الانضمام' : 'Join Requests'}
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
                  <MotionDiv key={member._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex items-center justify-between relative">
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
                    {isOwner && memberId !== userProfile.id && (
                      <div className="relative">
                        <button 
                          onClick={() => setActionMemberId(actionMemberId === memberId ? null : memberId)}
                          className="text-gray-500 hover:text-white p-1"
                        >
                          <MoreVertical size={20} />
                        </button>
                        
                        {actionMemberId === memberId && (
                          <div className={`absolute ${isRTL ? 'left-0' : 'right-0'} mt-2 w-48 bg-gray-800 border border-gray-700 rounded-xl shadow-lg z-10 overflow-hidden`}>
                            <button 
                              onClick={() => handlePromote(memberId)}
                              className="w-full text-left px-4 py-2 hover:bg-gray-700 text-sm"
                            >
                              {isRTL ? 'ترقية لمشرف' : 'Promote to Admin'}
                            </button>
                            <button 
                              onClick={() => handleMute(memberId)}
                              className="w-full text-left px-4 py-2 hover:bg-gray-700 text-sm"
                            >
                              {isRTL ? 'كتم' : 'Mute'}
                            </button>
                            <button 
                              onClick={() => handleRemove(memberId)}
                              className="w-full text-left px-4 py-2 hover:bg-gray-700 text-sm text-red-500"
                            >
                              {isRTL ? 'إزالة' : 'Remove'}
                            </button>
                            <button 
                              onClick={() => handleBan(memberId)}
                              className="w-full text-left px-4 py-2 hover:bg-gray-700 text-sm text-red-500"
                            >
                              {isRTL ? 'حظر' : 'Ban'}
                            </button>
                          </div>
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
      
      {confirmDialog && (
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={confirmDialog.message}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
          confirmText={isRTL ? 'تأكيد' : 'Confirm'}
          cancelText={isRTL ? 'إلغاء' : 'Cancel'}
        />
      )}
    </div>
  );
}
