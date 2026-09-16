import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, ArrowRight, Send, MessageCircle, HelpCircle, Star, Quote,
  EyeOff, Loader2, Pin, Edit3, CornerUpLeft, X, ChevronDown, Copy,
  Trash2, Flag, Check
} from 'lucide-react';
import {
  ReadingClub, ClubUserProfile, ClubPost,
  getPostAuthorNickname, getPostAuthorAvatar, getPostAuthorId
} from '../../types/readingClub';
import { clubMessagesAPI } from '../../services/readingClubAPI';
import { readingClubSync } from '../../services/readingClubSync';
import SpoilerGuard from './shared/SpoilerGuard';
import ConfirmDialog from './shared/ConfirmDialog';

const MotionDiv = motion.div as any;

const AVATARS = ['📖','🌙','⭐','🔥','🌿','💎','🦋','🌸','🏔️','🌊','🎭','🕌'];
const QUICK_EMOJIS = ['❤️', '👍', '🔥', '💡', '👏'];

interface Props {
  lang: 'ar' | 'en';
  club: ReadingClub;
  userProfile: ClubUserProfile;
  isOwner?: boolean;
  isAdmin?: boolean;
  onBack: () => void;
}

export default function ClubDiscussion({ lang, club, userProfile, isOwner, isAdmin, onBack }: Props) {
  const isRTL = lang === 'ar';
  const currentUserId = userProfile.id || userProfile.serverUserId || '';

  // ═══════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════
  const [messages, setMessages] = useState<ClubPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [body, setBody] = useState('');
  const [type, setType] = useState<'thought'|'question'|'review'|'quote'>('thought');
  const [spoilerLevel, setSpoilerLevel] = useState<0|1|2>(0);
  const [replyTo, setReplyTo] = useState<ClubPost | null>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [pendingBody, setPendingBody] = useState<string | null>(null);

  // Enhanced features
  const [editingPost, setEditingPost] = useState<ClubPost | null>(null);
  const [contextMenu, setContextMenu] = useState<{ post: ClubPost; x: number; y: number } | null>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<ClubPost | null>(null);
  const [copyToast, setCopyToast] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Refs
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<any>(null);
  const longPressRef = useRef<any>(null);
  const messageElsRef = useRef<Map<string, HTMLDivElement>>(new Map());

  // ═══════════════════════════════════════════════════
  // KEYBOARD HANDLING — visualViewport
  // ═══════════════════════════════════════════════════
  useEffect(() => {
    const vp = window.visualViewport;
    if (!vp) return;

    const onResize = () => {
      const kbH = Math.max(0, window.innerHeight - vp.height);
      setKeyboardHeight(kbH);
      if (kbH > 0) {
        requestAnimationFrame(() => {
          scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'auto' });
        });
      }
    };

    vp.addEventListener('resize', onResize);
    vp.addEventListener('scroll', onResize);
    return () => {
      vp.removeEventListener('resize', onResize);
      vp.removeEventListener('scroll', onResize);
    };
  }, []);

  // ═══════════════════════════════════════════════════
  // BACK BUTTON — close modals first
  // ═══════════════════════════════════════════════════
  useEffect(() => {
    const handleBack = (e: any) => {
      if (contextMenu) { e.stopImmediatePropagation(); setContextMenu(null); return; }
      if (deleteConfirm) { e.stopImmediatePropagation(); setDeleteConfirm(null); return; }
      if (editingPost) { e.stopImmediatePropagation(); setEditingPost(null); setBody(''); return; }
    };
    window.addEventListener('readingClubBackPress', handleBack);
    return () => window.removeEventListener('readingClubBackPress', handleBack);
  }, [contextMenu, deleteConfirm, editingPost]);

  // ═══════════════════════════════════════════════════
  // LOAD MESSAGES + SOCKET EVENTS
  // ═══════════════════════════════════════════════════
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await clubMessagesAPI.list(club._id);
        if (res.ok && res.data?.messages) {
          setMessages(res.data.messages.reverse());
        }
      } catch (err) { console.error(err); }
      finally { setIsLoading(false); }
    };

    fetchMessages();
    readingClubSync.joinRoom(club._id);

    readingClubSync.onNewMessage((msg: ClubPost) => {
      setMessages(prev => [...prev, msg]);
      setTimeout(() => {
        const el = scrollRef.current;
        if (el) {
          const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150;
          if (nearBottom) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
        }
      }, 100);
    });

    readingClubSync.onMessageUpdated((updated: ClubPost) => {
      setMessages(prev => prev.map(m => m._id === updated._id ? updated : m));
    });

    readingClubSync.onMessageDeleted((data: { messageId: string }) => {
      setMessages(prev => prev.filter(m => m._id !== data.messageId));
    });

    readingClubSync.onUserTyping((data: { userId: string; nickname: string; groupId: string }) => {
      if (data.userId === currentUserId) return;
      setTypingUsers(prev => [...new Set([...prev, data.nickname])]);
      setTimeout(() => setTypingUsers(prev => prev.filter(n => n !== data.nickname)), 3000);
    });

    return () => { readingClubSync.leaveRoom(club._id); readingClubSync.offAll(); };
  }, [club._id, currentUserId]);

  // Initial scroll
  useEffect(() => {
    if (!isLoading && scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'auto' });
    }
  }, [isLoading]);

  // ═══════════════════════════════════════════════════
  // SCROLL OBSERVER — show/hide scroll-to-bottom
  // ═══════════════════════════════════════════════════
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150;
      setShowScrollBtn(!nearBottom && messages.length > 5);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [messages.length]);

  // ═══════════════════════════════════════════════════
  // AUTO-RESIZE TEXTAREA
  // ═══════════════════════════════════════════════════
  const autoResize = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
  }, []);

  useEffect(() => { autoResize(); }, [body, autoResize]);

  // ═══════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════
  const handleBodyChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setBody(e.target.value);
    readingClubSync.sendTyping(club._id, true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => readingClubSync.sendTyping(club._id, false), 2000);
  };

  const handleSend = async () => {
    if (!body.trim() || sending) return;

    // ——— Edit mode ———
    if (editingPost) {
      setSending(true);
      try {
        const res = await clubMessagesAPI.edit(club._id, editingPost._id, body.trim(), spoilerLevel);
        if (res.ok && res.data) {
          setMessages(prev => prev.map(m => m._id === editingPost._id ? res.data! : m));
        }
      } catch (err) { console.error('Edit failed:', err); }
      finally { setSending(false); setEditingPost(null); setBody(''); setSpoilerLevel(0); }
      return;
    }

    // ——— Send mode ———
    const msgBody = body;
    const msgReplyTo = replyTo;
    const msgType = type;
    const msgSpoiler = spoilerLevel;
    const opId = crypto.randomUUID();

    setSending(true); setSendError(null);
    setBody(''); setReplyTo(null); setSpoilerLevel(0);
    readingClubSync.sendTyping(club._id, false);

    try {
      const res = await clubMessagesAPI.send(club._id, {
        body: msgBody, type: msgType, spoilerLevel: msgSpoiler,
        replyToMessageId: msgReplyTo?._id, clientOperationId: opId,
      });
      if (!res.ok) { setSendError(res.error || 'Failed'); setPendingBody(msgBody); }
    } catch { setSendError('Network error'); setPendingBody(msgBody); }
    finally { setSending(false); }
  };

  const handleRetry = () => {
    if (pendingBody) { setBody(pendingBody); setPendingBody(null); setSendError(null); }
  };

  const handleEdit = (post: ClubPost) => {
    setEditingPost(post);
    setBody(post.body || post.content || '');
    setReplyTo(null); setContextMenu(null);
    setTimeout(() => textareaRef.current?.focus(), 100);
  };

  const handleCancelEdit = () => { setEditingPost(null); setBody(''); setSpoilerLevel(0); };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      const res = await clubMessagesAPI.delete(club._id, deleteConfirm._id);
      if (res.ok) setMessages(prev => prev.filter(m => m._id !== deleteConfirm._id));
    } catch (err) { console.error('Delete failed:', err); }
    finally { setDeleting(false); setDeleteConfirm(null); }
  };

  const handleCopy = (post: ClubPost) => {
    const text = post.body || post.content || '';
    navigator.clipboard.writeText(text).then(() => {
      setCopyToast(true); setTimeout(() => setCopyToast(false), 2000);
    }).catch(() => {});
    setContextMenu(null);
  };

  const handleReact = async (postId: string, emoji: string) => {
    try {
      const res = await clubMessagesAPI.react(club._id, postId, emoji);
      if (res.ok && res.data) {
        setMessages(prev => prev.map(m => m._id === postId ? { ...m, reactions: res.data! } : m));
      }
    } catch (err) { console.error('React failed:', err); }
    setContextMenu(null);
  };

  const handlePin = async (post: ClubPost) => {
    try {
      const res = await clubMessagesAPI.pin(club._id, post._id);
      if (res.ok && res.data) {
        setMessages(prev => prev.map(m => {
          if (m._id === post._id) return { ...m, isPinned: !m.isPinned };
          if (m.isPinned && m._id !== post._id) return { ...m, isPinned: false };
          return m;
        }));
      }
    } catch (err) { console.error('Pin failed:', err); }
    setContextMenu(null);
  };

  const handleReply = (post: ClubPost) => {
    setReplyTo(post); setEditingPost(null); setContextMenu(null);
    setTimeout(() => textareaRef.current?.focus(), 100);
  };

  // ═══════════════════════════════════════════════════
  // LONG PRESS
  // ═══════════════════════════════════════════════════
  const handleTouchStart = (post: ClubPost, e: React.TouchEvent) => {
    const touch = e.touches[0];
    longPressRef.current = setTimeout(() => {
      setContextMenu({ post, x: touch.clientX, y: touch.clientY });
    }, 500);
  };
  const handleTouchEnd = () => { if (longPressRef.current) { clearTimeout(longPressRef.current); longPressRef.current = null; } };
  const handleTouchMove = () => { if (longPressRef.current) { clearTimeout(longPressRef.current); longPressRef.current = null; } };

  // ═══════════════════════════════════════════════════
  // SCROLL TO MESSAGE (for replies & pinned)
  // ═══════════════════════════════════════════════════
  const scrollToMessage = (messageId: string) => {
    const el = messageElsRef.current.get(messageId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedId(messageId);
      setTimeout(() => setHighlightedId(null), 2000);
    }
  };
  const scrollToBottom = () => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });

  // Pinned message
  const pinnedMessage = messages.find(m => m.isPinned);

  // ═══════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════
  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className="flex flex-col h-full bg-[#000a00] text-white relative"
      style={{ paddingBottom: keyboardHeight > 0 ? `${keyboardHeight}px` : undefined }}
    >
      {/* ═══ HEADER ═══ */}
      <div className="flex items-center justify-between p-3 border-b border-red-900/30 shrink-0 bg-[#000a00]">
        <button onClick={onBack} className="text-red-600 p-2 hover:bg-red-900/20 rounded-full">
          {isRTL ? <ArrowRight size={22} /> : <ArrowLeft size={22} />}
        </button>
        <div className="flex-1 text-center mx-2 min-w-0">
          <h1 className="font-black uppercase tracking-widest text-sm truncate">{club.name}</h1>
          {typingUsers.length > 0 && (
            <p className="text-[10px] text-red-500 animate-pulse font-black uppercase tracking-widest truncate">
              {typingUsers.join(', ')} {isRTL ? 'يكتبون...' : 'typing...'}
            </p>
          )}
        </div>
        <div className="w-10" />
      </div>

      {/* ═══ PINNED MESSAGE BAR ═══ */}
      {pinnedMessage && (
        <button
          onClick={() => scrollToMessage(pinnedMessage._id)}
          className="flex items-center gap-2 px-4 py-2 bg-red-900/20 border-b border-red-900/30 shrink-0 text-start w-full hover:bg-red-900/30 transition-colors"
        >
          <Pin size={14} className="text-red-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-[10px] text-red-500 font-black uppercase tracking-widest">
              {isRTL ? 'رسالة مثبتة' : 'PINNED'}
            </span>
            <p className="text-xs text-gray-400 truncate">{pinnedMessage.body}</p>
          </div>
        </button>
      )}

      {/* ═══ MESSAGES AREA ═══ */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="animate-spin text-red-600" size={32} />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-10 uppercase tracking-widest text-sm">
            {isRTL ? 'لا توجد رسائل بعد' : 'No messages yet'}
          </div>
        ) : (
          messages.map(msg => {
            const isMe = getPostAuthorId(msg) === currentUserId;
            const highlighted = highlightedId === msg._id;

            // Resolve reply data
            const rawReplyRef = msg.replyToMessageId;
            const replyObj = rawReplyRef && typeof rawReplyRef === 'object' ? rawReplyRef : null;
            const replyStrId = typeof rawReplyRef === 'string' ? rawReplyRef : (msg as any).replyToId;
            const replySource: any = replyObj || (replyStrId ? messages.find(m => m._id === replyStrId) : null);
            const hasReply = !!(replyObj || replyStrId);

            return (
              <div
                key={msg._id}
                ref={el => { if (el) messageElsRef.current.set(msg._id, el); }}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                onTouchStart={e => handleTouchStart(msg, e)}
                onTouchEnd={handleTouchEnd}
                onTouchMove={handleTouchMove}
                onContextMenu={e => { e.preventDefault(); setContextMenu({ post: msg, x: e.clientX, y: e.clientY }); }}
              >
                {/* ── Message Bubble ── */}
                <div className={`max-w-[85%] rounded-2xl p-3 transition-all duration-500 ${
                  isMe
                    ? 'bg-red-900/30 border border-red-600/30'
                    : 'bg-gray-900 border border-gray-800'
                } ${highlighted ? 'ring-2 ring-red-500/50 bg-red-900/40' : ''} ${
                  msg._failed ? 'border-red-500/50 opacity-70' : ''
                } ${msg._sending ? 'opacity-60' : ''}`}>

                  {/* Author */}
                  {!isMe && (
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center bg-gray-800 text-xs">
                        {AVATARS[getPostAuthorAvatar(msg)] || '📖'}
                      </div>
                      <span className="text-xs text-red-500 font-black uppercase tracking-widest">
                        {getPostAuthorNickname(msg)}
                      </span>
                    </div>
                  )}

                  {/* Reply Preview — clickable to scroll */}
                  {hasReply && (
                    <button
                      onClick={() => {
                        const targetId = replyStrId || (replyObj as any)?._id;
                        if (targetId) scrollToMessage(targetId);
                      }}
                      className={`w-full text-start text-xs bg-black/30 p-2 rounded mb-2 ${
                        isRTL ? 'border-r-2' : 'border-l-2'
                      } border-red-600 text-gray-400 hover:bg-black/50 transition-colors`}
                    >
                      {replySource ? (
                        <>
                          <span className="text-red-500 text-[10px] font-bold block">
                            {typeof replySource.authorId === 'object'
                              ? replySource.authorId.nickname
                              : getPostAuthorNickname(replySource as ClubPost)}
                          </span>
                          <span className="line-clamp-1 text-[11px]">
                            {(replySource.body || '').substring(0, 80)}
                          </span>
                        </>
                      ) : (
                        <span>{isRTL ? 'رد على رسالة' : 'Reply to a message'}</span>
                      )}
                    </button>
                  )}

                  {/* Body */}
                  {msg.spoilerLevel > 0 ? (
                    <SpoilerGuard lang={lang}>
                      <p className="text-sm whitespace-pre-wrap break-words">{msg.body}</p>
                    </SpoilerGuard>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap break-words">{msg.body}</p>
                  )}

                  {/* Time + Status */}
                  <div className="flex items-center justify-between mt-2 gap-2">
                    <span className="text-[10px] text-white/30">
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <div className="flex items-center gap-1">
                      {msg.isEdited && <span className="text-[9px] text-white/30">{isRTL ? 'معدّل' : 'edited'}</span>}
                      {msg.isPinned && <Pin size={10} className="text-yellow-500" />}
                      {msg._sending && <Loader2 size={10} className="text-white/30 animate-spin" />}
                      {msg._failed && <span className="text-[9px] text-red-500 font-bold">{isRTL ? 'فشل' : 'failed'}</span>}
                    </div>
                  </div>
                </div>

                {/* Reactions */}
                {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                  <div className={`flex flex-wrap gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                    {Object.entries(msg.reactions).map(([emoji, users]) => (
                      <button
                        key={emoji}
                        onClick={() => handleReact(msg._id, emoji)}
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
              </div>
            );
          })
        )}
      </div>

      {/* ═══ SCROLL TO BOTTOM BUTTON ═══ */}
      <AnimatePresence>
        {showScrollBtn && (
          <MotionDiv
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className={`absolute ${isRTL ? 'left-4' : 'right-4'} z-20`}
            style={{ bottom: `${(keyboardHeight > 0 ? keyboardHeight : 0) + 140}px` }}
          >
            <button
              onClick={scrollToBottom}
              className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center shadow-lg shadow-red-900/50 hover:bg-red-500 transition-colors"
            >
              <ChevronDown size={20} />
            </button>
          </MotionDiv>
        )}
      </AnimatePresence>

      {/* ═══ CONTEXT MENU (Long-Press) ═══ */}
      <AnimatePresence>
        {contextMenu && (
          <>
            <div
              className="fixed inset-0 z-[9000] bg-black/40"
              onClick={() => setContextMenu(null)}
              onTouchStart={() => setContextMenu(null)}
            />
            <MotionDiv
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed z-[9001] bg-gray-900 border border-white/10 rounded-2xl shadow-2xl shadow-black/80 overflow-hidden min-w-[180px]"
              style={{
                top: Math.min(Math.max(contextMenu.y - 60, 60), window.innerHeight - 350),
                ...(isRTL
                  ? { right: Math.min(Math.max(window.innerWidth - contextMenu.x, 10), window.innerWidth - 200) }
                  : { left: Math.min(Math.max(contextMenu.x - 90, 10), window.innerWidth - 200) }
                ),
              }}
            >
              {/* Quick Reactions */}
              <div className="flex items-center justify-center gap-1 p-2 border-b border-white/5">
                {QUICK_EMOJIS.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => handleReact(contextMenu.post._id, emoji)}
                    className="text-lg p-1.5 rounded-lg hover:bg-white/10 active:scale-90 transition-all"
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              {/* Actions */}
              <div className="py-1">
                {/* Reply */}
                <button onClick={() => handleReply(contextMenu.post)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 text-sm transition-colors">
                  <CornerUpLeft size={16} className="text-gray-400 shrink-0" />
                  <span>{isRTL ? 'رد' : 'Reply'}</span>
                </button>

                {/* Copy */}
                <button onClick={() => handleCopy(contextMenu.post)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 text-sm transition-colors">
                  <Copy size={16} className="text-gray-400 shrink-0" />
                  <span>{isRTL ? 'نسخ' : 'Copy'}</span>
                </button>

                {/* Edit — author only */}
                {getPostAuthorId(contextMenu.post) === currentUserId && (
                  <button onClick={() => handleEdit(contextMenu.post)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 text-sm transition-colors">
                    <Edit3 size={16} className="text-gray-400 shrink-0" />
                    <span>{isRTL ? 'تعديل' : 'Edit'}</span>
                  </button>
                )}

                {/* Pin — admin only */}
                {isAdmin && (
                  <button onClick={() => handlePin(contextMenu.post)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 text-sm transition-colors">
                    <Pin size={16} className={`shrink-0 ${contextMenu.post.isPinned ? 'text-yellow-500' : 'text-gray-400'}`} />
                    <span>{contextMenu.post.isPinned ? (isRTL ? 'إلغاء التثبيت' : 'Unpin') : (isRTL ? 'تثبيت' : 'Pin')}</span>
                  </button>
                )}

                {/* Delete — author or admin */}
                {(getPostAuthorId(contextMenu.post) === currentUserId || isAdmin) && (
                  <button onClick={() => { setDeleteConfirm(contextMenu.post); setContextMenu(null); }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 text-sm text-red-500 transition-colors">
                    <Trash2 size={16} className="shrink-0" />
                    <span>{isRTL ? 'حذف' : 'Delete'}</span>
                  </button>
                )}

                {/* Report — not author */}
                {getPostAuthorId(contextMenu.post) !== currentUserId && (
                  <button onClick={() => setContextMenu(null)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 text-sm text-gray-500 transition-colors">
                    <Flag size={16} className="shrink-0" />
                    <span>{isRTL ? 'إبلاغ' : 'Report'}</span>
                  </button>
                )}
              </div>
            </MotionDiv>
          </>
        )}
      </AnimatePresence>

      {/* ═══ DELETE CONFIRMATION ═══ */}
      {deleteConfirm && (
        <ConfirmDialog
          lang={lang}
          kind="delete"
          title={isRTL ? 'حذف الرسالة؟' : 'Delete Message?'}
          operationLabel={isRTL ? 'حذف هذه الرسالة نهائياً' : 'Permanently delete this message'}
          consequencesLabel={isRTL ? 'لا يمكن استرجاع الرسالة بعد الحذف' : 'The message cannot be recovered'}
          permanenceLabel={isRTL ? 'لا يمكن التراجع' : 'This cannot be undone'}
          loading={deleting}
          onCancel={() => setDeleteConfirm(null)}
          onConfirm={handleDelete}
        />
      )}

      {/* ═══ COPY TOAST ═══ */}
      <AnimatePresence>
        {copyToast && (
          <MotionDiv
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs font-bold px-4 py-2 rounded-full flex items-center gap-2 shadow-lg z-30"
            style={{ bottom: `${(keyboardHeight > 0 ? keyboardHeight : 0) + 140}px` }}
          >
            <Check size={14} className="text-green-500" />
            {isRTL ? 'تم النسخ' : 'Copied'}
          </MotionDiv>
        )}
      </AnimatePresence>

      {/* ═══ INPUT AREA ═══ */}
      <div className="border-t border-red-900/30 bg-[#000a00] shrink-0">
        {/* Reply / Edit Preview */}
        {(replyTo || editingPost) && (
          <div className="flex items-center justify-between bg-gray-900/80 px-4 py-2 border-b border-red-900/20">
            <div className="flex-1 min-w-0">
              <span className={`text-[10px] font-black uppercase tracking-widest ${editingPost ? 'text-yellow-500' : 'text-red-500'}`}>
                {editingPost
                  ? (isRTL ? 'تعديل الرسالة' : 'EDITING')
                  : (isRTL ? `رد على ${getPostAuthorNickname(replyTo!)}` : `REPLY TO ${getPostAuthorNickname(replyTo!)}`)}
              </span>
              <p className="text-xs text-gray-400 truncate mt-0.5">
                {editingPost
                  ? (editingPost.body || '').substring(0, 60)
                  : (replyTo?.body || '').substring(0, 60)}
              </p>
            </div>
            <button
              onClick={() => { if (editingPost) handleCancelEdit(); else setReplyTo(null); }}
              className="text-gray-500 hover:text-white p-1 shrink-0"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Type Selector (hidden during edit) */}
        {!editingPost && (
          <div className="flex items-center gap-2 px-3 pt-2">
            {([
              { t: 'thought', i: MessageCircle },
              { t: 'question', i: HelpCircle },
              { t: 'review', i: Star },
              { t: 'quote', i: Quote },
            ] as const).map(item => (
              <button
                key={item.t}
                onClick={() => setType(item.t as any)}
                className={`p-1.5 rounded-full ${type === item.t ? 'bg-red-600 text-white' : 'text-gray-500'}`}
              >
                <item.i size={16} />
              </button>
            ))}
            <div className="flex-1" />
            <button
              onClick={() => setSpoilerLevel(prev => (prev === 0 ? 1 : 0) as any)}
              className={`p-1.5 rounded-full ${spoilerLevel > 0 ? 'bg-yellow-600 text-white' : 'text-gray-500'}`}
            >
              <EyeOff size={16} />
            </button>
          </div>
        )}

        {/* Textarea + Send */}
        <div className="flex items-end gap-2 p-3">
          <textarea
            ref={textareaRef}
            value={body}
            onChange={handleBodyChange}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            className="flex-1 bg-gray-900 rounded-xl p-3 text-sm focus:outline-none focus:ring-1 focus:ring-red-600 resize-none max-h-[120px]"
            placeholder={editingPost
              ? (isRTL ? 'عدّل رسالتك...' : 'Edit your message...')
              : (isRTL ? 'اكتب رسالتك...' : 'Type a message...')}
            rows={1}
            dir={isRTL ? 'rtl' : 'ltr'}
          />
          <button
            onClick={handleSend}
            disabled={!body.trim() || sending}
            className="bg-red-600 text-white p-3 rounded-xl disabled:opacity-50 shrink-0"
          >
            {sending
              ? <Loader2 size={20} className="animate-spin" />
              : editingPost
                ? <Check size={20} />
                : <Send size={20} className={isRTL ? 'rotate-180' : ''} />}
          </button>
        </div>

        {/* Send Error */}
        {sendError && (
          <div className="bg-red-900/50 px-4 py-2 text-red-500 text-xs flex justify-between items-center">
            <span>{sendError}</span>
            <button onClick={handleRetry} className="underline uppercase tracking-widest font-black">
              {isRTL ? 'إعادة المحاولة' : 'Retry'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
