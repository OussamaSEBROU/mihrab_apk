import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Shield, ShieldAlert, User, MoreVertical, Copy, Loader2, Check, X } from 'lucide-react';
import { ReadingClub, ClubUserProfile, ClubMember } from '../../types/readingClub';
import { clubMembersAPI, clubInvitesAPI } from '../../services/readingClubAPI';

const MotionDiv = motion.div as any;

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

  useEffect(() => {
    const load = async () => {
      try {
        const memRes = await clubMembersAPI.list(club._id);
        setMembers(memRes.data);
        if (isOwner) {
          const reqRes = await clubInvitesAPI.getJoinRequests(club._id);
          setRequests(reqRes.data);
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

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner': return 'text-red-500 border-red-500';
      case 'admin': return 'text-orange-500 border-orange-500';
      case 'moderator': return 'text-yellow-500 border-yellow-500';
      case 'member': return 'text-green-500 border-green-500';
      default: return 'text-gray-500 border-gray-500';
    }
  };

  return (
    <div className={`flex flex-col h-full bg-[#000a00] text-white ${isRTL ? 'dir-rtl' : 'dir-ltr'}`}>
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
                    <img src={req.userProfile?.avatarUrl || '/default-avatar.png'} alt="" className="w-10 h-10 rounded-full" />
                    <span className="font-bold">{req.userProfile?.nickname}</span>
                  </div>
                  <div className="flex gap-2">
                    <button className="p-2 bg-green-600 rounded-lg text-white"><Check size={16} /></button>
                    <button className="p-2 bg-red-600 rounded-lg text-white"><X size={16} /></button>
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
              {members.map(member => (
                <MotionDiv key={member._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img src={member.userProfile?.avatarUrl || '/default-avatar.png'} alt="" className="w-10 h-10 rounded-full" />
                    <div>
                      <div className="font-bold">{member.userProfile?.nickname}</div>
                      <div className={`text-[10px] font-black uppercase tracking-widest border rounded px-1 inline-block mt-1 ${getRoleColor(member.role)}`}>
                        {member.role}
                      </div>
                    </div>
                  </div>
                  {isOwner && member.userId !== userProfile.userId && (
                    <button className="text-gray-500 hover:text-white p-1">
                      <MoreVertical size={20} />
                    </button>
                  )}
                </MotionDiv>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
