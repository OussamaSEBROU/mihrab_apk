import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, User } from 'lucide-react';
import { ClubUserProfile, ReadingClub } from '../../types/readingClub';
import { readingClubAuth } from '../../services/readingClubAuth';
import { clubGroupsAPI } from '../../services/readingClubAPI';
import { readingClubSync } from '../../services/readingClubSync';

import ClubSetupProfile from './ClubSetupProfile';
import ClubList from './ClubList';
import ClubCreate from './ClubCreate';
import ClubPage from './ClubPage';
import ClubDiscussion from './ClubDiscussion';
import ClubQuotes from './ClubQuotes';
import ClubStages from './ClubStages';
import ClubMembers from './ClubMembers';
import ClubInvitePreview from './ClubInvitePreview';

const MotionDiv = motion.div as any;

export type ClubView = 'setup' | 'list' | 'create' | 'page' | 'discussion' | 'quotes' | 'stages' | 'members' | 'settings' | 'admin' | 'audit' | 'invite-preview' | 'profile-setup';

interface ReadingClubRootProps {
  lang: 'ar' | 'en';
  books: any[];
  onBack: () => void;
  inviteToken?: string;
}

export default function ReadingClubRoot({ lang, books, onBack, inviteToken }: ReadingClubRootProps) {
  const [view, setView] = useState<ClubView>('setup');
  const [profile, setProfile] = useState<ClubUserProfile | null>(null);
  const [selectedClub, setSelectedClub] = useState<ReadingClub | null>(null);
  const [clubs, setClubs] = useState<ReadingClub[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteTokenState, setInviteTokenState] = useState<string | undefined>(inviteToken);
  
  const isRTL = lang === 'ar';
  const t = {
    title: isRTL ? 'نادي القراءة' : 'Reading Club'
  };

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      if (readingClubAuth.isLoggedIn()) {
        const userProfile = readingClubAuth.getLocalProfile();
        if (userProfile) {
          setProfile(userProfile);
          readingClubSync.connect();
          try {
            const userClubs = await clubGroupsAPI.getMyGroups();
            setClubs(userClubs || []);
          } catch (error) {
            console.error('Failed to load groups', error);
          }
          if (inviteTokenState) {
            setView('invite-preview');
          } else {
            setView('list');
          }
        } else {
          setView('setup');
        }
      } else {
        setView('setup');
      }
      setLoading(false);
    };
    loadProfile();

    return () => {
      readingClubSync.disconnect();
    };
  }, []);

  const refreshClubs = async () => {
    try {
      const userClubs = await clubGroupsAPI.getMyGroups();
      setClubs(userClubs || []);
    } catch (error) {
      console.error('Failed to refresh groups', error);
    }
  };

  useEffect(() => {
    const handleBack = (e: any) => {
      if (view === 'list' || view === 'invite-preview') {
        onBack();
      } else if (view === 'page' || view === 'create') {
        setView('list');
      } else if (view !== 'setup') {
        setView('page');
      }
    };
    window.addEventListener('readingClubBackPress', handleBack);
    return () => window.removeEventListener('readingClubBackPress', handleBack);
  }, [view, onBack]);

  const handleNavigate = (newView: ClubView, data?: any) => {
    if (data && newView === 'page') setSelectedClub(data);
    setView(newView);
  };

  const isOwner = selectedClub?.myRole === 'owner' || selectedClub?.ownerId === profile?.id;
  const isAdmin = isOwner || ['full_admin','content_admin','member_admin','discussion_mod'].includes(selectedClub?.myRole || '');

  return (
    <div className="w-full h-full bg-[#000a00] text-white flex flex-col font-black uppercase tracking-widest" dir={isRTL ? 'rtl' : 'ltr'}>
      {view !== 'setup' && (
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/50 backdrop-blur-xl z-50">
          <button onClick={() => {
            if (view === 'list' || view === 'invite-preview') onBack();
            else if (view === 'page' || view === 'create') setView('list');
            else setView('page');
          }} className="p-2 bg-white/5 rounded-full text-red-600">
            {isRTL ? <ArrowRight size={20} /> : <ArrowLeft size={20} />}
          </button>
          <h1 className="text-red-600 text-[10px]">{t.title}</h1>
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-red-600">
            <User size={16} />
          </div>
        </div>
      )}
      
      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {view === 'setup' && (
            <MotionDiv key="setup" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
              <ClubSetupProfile lang={lang} onComplete={(p) => { 
                setProfile(p); 
                readingClubSync.connect();
                refreshClubs().then(() => {
                  if (inviteTokenState) setView('invite-preview');
                  else setView('list');
                });
              }} />
            </MotionDiv>
          )}
          {view === 'invite-preview' && profile && inviteTokenState && (
            <MotionDiv key="invite-preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
              <ClubInvitePreview 
                lang={lang} 
                token={inviteTokenState} 
                userProfile={profile}
                onJoin={(joinedClub) => {
                  setClubs([...clubs, joinedClub]);
                  setSelectedClub(joinedClub);
                  setInviteTokenState(undefined);
                  setView('page');
                }}
                onCancel={() => {
                  setInviteTokenState(undefined);
                  setView('list');
                }}
              />
            </MotionDiv>
          )}
          {view === 'list' && profile && (
            <MotionDiv key="list" initial={{ opacity: 0, x: isRTL ? -20 : 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: isRTL ? 20 : -20 }} className="h-full">
              <ClubList 
                lang={lang} 
                clubs={clubs} 
                userProfile={profile} 
                onCreateClub={() => setView('create')} 
                onSelectClub={(c) => { setSelectedClub(c); setView('page'); }} 
                onRefresh={refreshClubs} 
              />
            </MotionDiv>
          )}
          {view === 'create' && profile && (
            <MotionDiv key="create" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="h-full">
              <ClubCreate lang={lang} books={books} userProfile={profile} onCreated={(c) => { 
                setSelectedClub(c); 
                setClubs([...clubs, c]);
                setView('page'); 
              }} onBack={() => setView('list')} />
            </MotionDiv>
          )}
          {view === 'page' && profile && selectedClub && (
            <MotionDiv key="page" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
              <ClubPage lang={lang} club={selectedClub} userProfile={profile} onBack={() => setView('list')} onNavigate={handleNavigate} />
            </MotionDiv>
          )}
          {view === 'discussion' && profile && selectedClub && (
            <MotionDiv key="discussion" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
              <ClubDiscussion lang={lang} club={selectedClub} userProfile={profile} onBack={() => setView('page')} />
            </MotionDiv>
          )}
          {view === 'quotes' && profile && selectedClub && (
            <MotionDiv key="quotes" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
              <ClubQuotes lang={lang} club={selectedClub} userProfile={profile} onBack={() => setView('page')} />
            </MotionDiv>
          )}
          {view === 'stages' && profile && selectedClub && (
            <MotionDiv key="stages" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
              <ClubStages lang={lang} club={selectedClub} userProfile={profile} isOwner={isOwner} onBack={() => setView('page')} />
            </MotionDiv>
          )}
          {view === 'members' && profile && selectedClub && (
            <MotionDiv key="members" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
              <ClubMembers lang={lang} club={selectedClub} userProfile={profile} isOwner={isOwner} onBack={() => setView('page')} />
            </MotionDiv>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
