import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, Image as ImageIcon, EyeOff } from 'lucide-react';
import { ReadingClub, ClubUserProfile, ClubPost } from '../../types/readingClub';
import { readingClubStorage } from '../../services/readingClubStorage';
import PostCard from './shared/PostCard';

const MotionDiv = motion.div as any;

interface ClubDiscussionProps {
  lang: 'ar' | 'en';
  club: ReadingClub;
  userProfile: ClubUserProfile;
  onBack: () => void;
}

export default function ClubDiscussion({ lang, club, userProfile }: ClubDiscussionProps) {
  const [posts, setPosts] = useState<ClubPost[]>([]);
  const [newPost, setNewPost] = useState('');
  const [isSpoiler, setIsSpoiler] = useState(false);
  const isRTL = lang === 'ar';

  const t = {
    placeholder: isRTL ? 'اكتب شيئاً...' : 'Write something...',
    send: isRTL ? 'إرسال' : 'Send',
    empty: isRTL ? 'لا توجد نقاشات بعد' : 'No discussions yet'
  };

  useEffect(() => {
    loadPosts();
  }, [club.id]);

  const loadPosts = async () => {
    const clubPosts = await readingClubStorage.getClubPosts(club.id);
    setPosts(clubPosts || []);
  };

  const handleSend = async () => {
    if (!newPost.trim()) return;
    const now = Date.now();
    const post: ClubPost = {
      id: 'post_' + now.toString(36),
      clubId: club.id,
      authorId: userProfile.id,
      authorNickname: userProfile.nickname,
      authorAvatarIndex: userProfile.avatarIndex,
      content: newPost,
      type: 'thought',
      containsSpoiler: isSpoiler,
      createdAt: now,
      updatedAt: now,
      syncStatus: 'local-only',
      reactions: {}
    };
    await readingClubStorage.addPost(post);
    setNewPost('');
    setIsSpoiler(false);
    loadPosts();
  };

  const handleReact = async (postId: string, emoji: string) => {
    // Implement reaction logic here
  };

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {posts.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-white/50 text-[10px]">
            {t.empty}
          </div>
        ) : (
          posts.map((post) => (
            <PostCard key={post.id} lang={lang} post={post} currentUserId={userProfile.id} onReact={handleReact} />
          ))
        )}
      </div>
      
      <div className="p-4 bg-black/80 backdrop-blur-xl border-t border-white/10 flex flex-col gap-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
            placeholder={t.placeholder}
            className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-[10px] text-white focus:outline-none focus:border-red-600/50"
          />
          <button onClick={handleSend} className="bg-red-600 text-white p-3 rounded-2xl flex items-center justify-center">
            <Send size={16} className={isRTL ? 'transform rotate-180' : ''} />
          </button>
        </div>
        <div className="flex gap-4 px-2">
          <button 
            onClick={() => setIsSpoiler(!isSpoiler)} 
            className={`flex items-center gap-1 text-[7.5px] ${isSpoiler ? 'text-red-600' : 'text-white/50 hover:text-white/80'}`}
          >
            <EyeOff size={12} />
            <span>Spoiler Guard</span>
          </button>
        </div>
      </div>
    </div>
  );
}
