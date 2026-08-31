import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, Heart, ThumbsUp, Star, Bookmark, Pin, Edit3, Trash2, Flag, Reply, Clock, AlertTriangle } from 'lucide-react';
import type { ClubPost } from '../../types/readingClub';
import { getPostAuthorNickname, getPostAuthorAvatar, getPostAuthorId } from '../../types/readingClub';
import SpoilerGuard from './SpoilerGuard';

const MotionDiv = motion.div as any;

const AVATARS = ['📚','🦉','🌙','⭐','🔥','📖','🎯','💎','🌿','🏛️','✨','🔬'];
const TYPE_ICONS: Record<string, string> = { thought: '💭', question: '❓', review: '⭐', quote: '📝', announcement: '📢', reply: '↩️' };
const QUICK_EMOJIS = ['❤️', '👍', '🔥', '💡', '👏'];

interface PostCardProps {
  lang: 'ar' | 'en';
  post: ClubPost;
  currentUserId: string;
  onReact: (postId: string, emoji: string) => void;
  onReply?: (post: ClubPost) => void;
  onEdit?: (post: ClubPost) => void;
  onDelete?: (postId: string) => void;
  onPin?: (postId: string) => void;
  onReport?: (postId: string) => void;
  isAdmin?: boolean;
}

export default function PostCard({ lang, post, currentUserId, onReact, onReply, onEdit, onDelete, onPin, onReport, isAdmin }: PostCardProps) {
  const [showActions, setShowActions] = useState(false);
  const isRTL = lang === 'ar';
  const isAuthor = getPostAuthorId(post) === currentUserId;
  const authorNick = getPostAuthorNickname(post);
  const authorAvatar = getPostAuthorAvatar(post);
  const typeIcon = TYPE_ICONS[post.type] || '💭';

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return isRTL ? 'الآن' : 'now';
    if (mins < 60) return `${mins}${isRTL ? 'د' : 'm'}`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}${isRTL ? 'س' : 'h'}`;
    const days = Math.floor(hrs / 24);
    return `${days}${isRTL ? 'ي' : 'd'}`;
  };

  // Reply preview
  const replyPreview = post.replyToMessageId && typeof post.replyToMessageId === 'object'
    ? post.replyToMessageId : null;

  const content = post.body || post.content || '';
  const hasSpoiler = (post.spoilerLevel || 0) > 0 || post.containsSpoiler;

  const postBody = (
    <div className="space-y-2">
      {/* Reply reference */}
      {replyPreview && (
        <div className={`border-${isRTL ? 'r' : 'l'}-2 border-red-600/50 ${isRTL ? 'pr-0 pl-3' : 'pl-3 pr-0'} py-1 opacity-60`}>
          <p className="text-[8px] text-red-400">{typeof replyPreview.authorId === 'object' ? replyPreview.authorId.nickname : ''}</p>
          <p className="text-[9px] text-white/50 line-clamp-1">{replyPreview.body?.substring(0, 80)}</p>
        </div>
      )}

      {/* Message body */}
      <p className="text-[11px] font-normal normal-case tracking-normal leading-relaxed text-white/90 whitespace-pre-wrap break-words">
        {content}
      </p>

      {/* Page reference */}
      {post.pageReference && (
        <span className="inline-block text-[8px] bg-red-600/20 text-red-400 px-2 py-0.5 rounded-full">
          {isRTL ? `ص ${post.pageReference}` : `p.${post.pageReference}`}
        </span>
      )}
    </div>
  );

  return (
    <MotionDiv
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-3 rounded-xl border border-white/5 ${isAuthor ? 'bg-red-950/20 border-red-600/10' : 'bg-white/[0.03]'} ${post._sending ? 'opacity-60' : ''} ${post._failed ? 'border-red-500/30' : ''}`}
      onLongPress={() => setShowActions(true)}
      onClick={() => showActions && setShowActions(false)}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-sm shrink-0">
          {AVATARS[authorAvatar] || '📚'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-white/80 truncate">{authorNick}</span>
            <span className="text-[9px]">{typeIcon}</span>
            {post.isPinned && <Pin size={10} className="text-yellow-500" />}
            {post.isEdited && <span className="text-[7px] text-white/30">{isRTL ? 'معدّل' : 'edited'}</span>}
          </div>
        </div>
        <span className="text-[8px] text-white/30 shrink-0">{timeAgo(post.createdAt)}</span>
        {post._sending && <Clock size={10} className="text-white/30 animate-pulse" />}
        {post._failed && <AlertTriangle size={10} className="text-red-500" />}
      </div>

      {/* Body */}
      {hasSpoiler ? <SpoilerGuard lang={lang}>{postBody}</SpoilerGuard> : postBody}

      {/* Reactions */}
      {post.reactions && Object.keys(post.reactions).length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {Object.entries(post.reactions).map(([emoji, users]) => (
            <button
              key={emoji}
              onClick={(e) => { e.stopPropagation(); onReact(post._id, emoji); }}
              className={`text-[10px] px-1.5 py-0.5 rounded-full border transition-all ${
                (users as string[]).includes(currentUserId)
                  ? 'bg-red-600/20 border-red-600/40 text-red-400'
                  : 'bg-white/5 border-white/10 text-white/50'
              }`}
            >
              {emoji} {(users as string[]).length}
            </button>
          ))}
        </div>
      )}

      {/* Quick actions */}
      <div className="flex items-center gap-1 mt-2 pt-1.5 border-t border-white/5">
        {QUICK_EMOJIS.map(emoji => (
          <button key={emoji} onClick={() => onReact(post._id, emoji)}
            className="text-sm p-1 rounded-lg hover:bg-white/5 active:scale-90 transition-all">
            {emoji}
          </button>
        ))}
        <div className="flex-1" />
        {onReply && (
          <button onClick={() => onReply(post)} className="p-1 rounded-lg hover:bg-white/5 text-white/30">
            <Reply size={12} />
          </button>
        )}
        {isAuthor && onEdit && (
          <button onClick={() => onEdit(post)} className="p-1 rounded-lg hover:bg-white/5 text-white/30">
            <Edit3 size={12} />
          </button>
        )}
        {(isAuthor || isAdmin) && onDelete && (
          <button onClick={() => onDelete(post._id)} className="p-1 rounded-lg hover:bg-white/5 text-white/30">
            <Trash2 size={12} />
          </button>
        )}
        {isAdmin && onPin && (
          <button onClick={() => onPin(post._id)} className={`p-1 rounded-lg hover:bg-white/5 ${post.isPinned ? 'text-yellow-500' : 'text-white/30'}`}>
            <Pin size={12} />
          </button>
        )}
      </div>
    </MotionDiv>
  );
}
