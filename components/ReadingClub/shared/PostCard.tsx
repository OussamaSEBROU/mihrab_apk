import React from 'react';
import { motion } from 'framer-motion';
import { User, MessageCircle, Heart, Lightbulb, Bookmark } from 'lucide-react';
import { ClubPost } from '../../../types/readingClub';
import SpoilerGuard from './SpoilerGuard';

const MotionDiv = motion.div as any;

interface PostCardProps {
  lang: 'ar' | 'en';
  post: ClubPost;
  currentUserId: string;
  onReact: (postId: string, emoji: string) => void;
}

export default function PostCard({ lang, post, currentUserId, onReact }: PostCardProps) {
  const isRTL = lang === 'ar';
  
  const getTypeColor = (type: string) => {
    switch(type) {
      case 'thought': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
      case 'question': return 'text-orange-400 bg-orange-400/10 border-orange-400/20';
      case 'review': return 'text-purple-400 bg-purple-400/10 border-purple-400/20';
      case 'quote': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
      default: return 'text-white/50 bg-white/5 border-white/10';
    }
  };

  const content = (
    <div className="text-[10px] text-white/90 leading-relaxed mt-3 whitespace-pre-wrap">
      {post.content}
    </div>
  );

  return (
    <MotionDiv 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] p-4 flex flex-col"
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/70">
            <User size={16} />
          </div>
          <div>
            <h4 className="text-[10px] text-white">{post.authorNickname}</h4>
            <span className="text-[7.5px] text-white/40">
              {new Date(post.createdAt).toLocaleTimeString()}
            </span>
          </div>
        </div>
        <div className={`px-2 py-1 rounded-full border text-[7.5px] ${getTypeColor(post.type)}`}>
          {post.type}
        </div>
      </div>

      {post.containsSpoiler ? (
        <SpoilerGuard lang={lang}>{content}</SpoilerGuard>
      ) : content}

      <div className="flex gap-4 mt-4 pt-3 border-t border-white/10">
        {[
          { emoji: '👍', icon: MessageCircle },
          { emoji: '❤️', icon: Heart },
          { emoji: '💡', icon: Lightbulb },
          { emoji: '📌', icon: Bookmark }
        ].map(reaction => (
          <button 
            key={reaction.emoji}
            onClick={() => onReact(post.id, reaction.emoji)}
            className="flex items-center gap-1 text-[10px] text-white/50 hover:text-red-600 transition-colors"
          >
            <reaction.icon size={14} />
            <span>{post.reactions?.[reaction.emoji]?.length || 0}</span>
          </button>
        ))}
      </div>
    </MotionDiv>
  );
}
