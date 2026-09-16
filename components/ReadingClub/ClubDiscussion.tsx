import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, ArrowRight, Send, MessageCircle, HelpCircle, Star, Quote,
  EyeOff, Loader2, Pin, Edit3, CornerUpLeft, X, ChevronDown, Copy,
  Trash2, Flag, Check, Paperclip, FileText, Image as ImageIcon
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
const MAX_FILE_SIZE = 500 * 1024; // 500KB after compression

// ═══════════════════════════════════════════════════
// ATTACHMENT HELPERS
// ═══════════════════════════════════════════════════
interface AttachmentData {
  _isAttachment: true;
  mimeType: string;
  fileName: string;
  dataUrl: string;
}

function tryParseAttachment(body: string): AttachmentData | null {
  try {
    const parsed = JSON.parse(body);
    if (parsed && parsed._isAttachment) return parsed as AttachmentData;
  } catch {}
  return null;
}

async function compressImage(file: File, maxW = 800, quality = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width, h = img.height;
        if (w > maxW) { h = (h * maxW) / w; w = maxW; }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = e.target!.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target!.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ═══════════════════════════════════════════════════
// MEMOIZED MESSAGE BUBBLE
// ═══════════════════════════════════════════════════
interface BubbleProps {
  msg: ClubPost;
  isMe: boolean;
  isRTL: boolean;
  highlighted: boolean;
  currentUserId: string;
  messages: ClubPost[];
  onTouchStart: (post: ClubPost, e: React.TouchEvent) => void;
  onTouchEnd: () => void;
  onTouchMove: () => void;
  onContextMenu: (post: ClubPost, e: React.MouseEvent) => void;
  onReact: (postId: string, emoji: string) => void;
  onReplyClick: (id: string) => void;
  lang: 'ar' | 'en';
}

const MessageBubble = React.memo<BubbleProps>(({
  msg, isMe, isRTL, highlighted, currentUserId, messages,
  onTouchStart, onTouchEnd, onTouchMove, onContextMenu, onReact, onReplyClick, lang
}) => {
  const rawReplyRef = msg.replyToMessageId;
  const replyObj = rawReplyRef && typeof rawReplyRef === 'object' ? rawReplyRef : null;
  const replyStrId = typeof rawReplyRef === 'string' ? rawReplyRef : (msg as any).replyToId;
  const replySource: any = replyObj || (replyStrId ? messages.find(m => m._id === replyStrId) : null);
  const hasReply = !!(replyObj || replyStrId);
  const attachment = tryParseAttachment(msg.body || '');

  return (
    <div
      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
      onTouchStart={e => onTouchStart(msg, e)}
      onTouchEnd={onTouchEnd}
      onTouchMove={onTouchMove}
      onContextMenu={e => onContextMenu(msg, e)}
    >
      <div className={`max-w-[85%] rounded-2xl p-3 transition-all duration-500 ${
        isMe ? 'bg-red-900/30 border border-red-600/30' : 'bg-gray-900 border border-gray-800'
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

        {/* Reply Preview */}
        {hasReply && (
          <button
            onClick={() => { const id = replyStrId || (replyObj as any)?._id; if (id) onReplyClick(id); }}
            className={`w-full text-start text-xs bg-black/30 p-2 rounded mb-2 ${isRTL ? 'border-r-2' : 'border-l-2'} border-red-600 text-gray-400 hover:bg-black/50 transition-colors`}
          >
            {replySource ? (
              <>
                <span className="text-red-500 text-[10px] font-bold block">
                  {typeof replySource.authorId === 'object' ? replySource.authorId.nickname : getPostAuthorNickname(replySource as ClubPost)}
                </span>
                <span className="line-clamp-1 text-[11px]">{(replySource.body || '').substring(0, 80)}</span>
              </>
            ) : (
              <span>{isRTL ? 'رد على رسالة' : 'Reply to a message'}</span>
            )}
          </button>
        )}

        {/* Body / Attachment */}
        {attachment ? (
          <div className="my-1">
            {attachment.mimeType.startsWith('image/') ? (
              <img src={attachment.dataUrl} alt={attachment.fileName} className="max-w-full rounded-lg max-h-[300px] object-contain" loading="lazy" />
            ) : attachment.mimeType.startsWith('video/') ? (
              <video src={attachment.dataUrl} controls className="max-w-full rounded-lg max-h-[300px]" />
            ) : (
              <div className="flex items-center gap-2 bg-black/30 p-3 rounded-lg">
                <FileText size={24} className="text-red-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-bold truncate">{attachment.fileName}</p>
                  <p className="text-[10px] text-gray-500">{attachment.mimeType}</p>
                </div>
              </div>
            )}
          </div>
        ) : msg.spoilerLevel > 0 ? (
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
              onClick={() => onReact(msg._id, emoji)}
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
}, (prev, next) =>
  prev.msg._id === next.msg._id &&
  prev.msg.body === next.msg.body &&
  prev.msg.isEdited === next.msg.isEdited &&
  prev.msg.isPinned === next.msg.isPinned &&
  prev.msg._sending === next.msg._sending &&
  prev.msg._failed === next.msg._failed &&
  prev.highlighted === next.highlighted &&
  prev.msg.reactions === next.msg.reactions
);

// ═══════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════
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

  // State
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
  const [editingPost, setEditingPost] = useState<ClubPost | null>(null);
  const [contextMenu, setContextMenu] = useState<{ post: ClubPost; x: number; y: number } | null>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<ClubPost | null>(null);
  const [copyToast, setCopyToast] = useState(false);
  const [toastText, setToastText] = useState('');
  const [deleting, setDeleting] = useState(false);
  // Report
  const [reportPost, setReportPost] = useState<ClubPost | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [reporting, setReporting] = useState(false);
  // Attachment
  const [attachmentPreview, setAttachmentPreview] = useState<AttachmentData | null>(null);
  const [attachLoading, setAttachLoading] = useState(false);

  // Refs
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<any>(null);
  const longPressRef = useRef<any>(null);
  const messageElsRef = useRef<Map<string, HTMLDivElement>>(new Map());

  // ═══════════════════════════════════════════════════
  // KEYBOARD HANDLING
  // ═══════════════════════════════════════════════════
  useEffect(() => {
    const vp = window.visualViewport;
    if (!vp) return;
    const onResize = () => {
      const kbH = Math.max(0, window.innerHeight - vp.height);
      setKeyboardHeight(kbH);
      if (kbH > 0) requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: scrollRef.current!.scrollHeight, behavior: 'auto' }));
    };
    vp.addEventListener('resize', onResize);
    vp.addEventListener('scroll', onResize);
    return () => { vp.removeEventListener('resize', onResize); vp.removeEventListener('scroll', onResize); };
  }, []);

  // ═══════════════════════════════════════════════════
  // BACK — close modals first
  // ═══════════════════════════════════════════════════
  useEffect(() => {
    const h = (e: any) => {
      if (contextMenu) { e.stopImmediatePropagation(); setContextMenu(null); return; }
      if (reportPost) { e.stopImmediatePropagation(); setReportPost(null); return; }
      if (deleteConfirm) { e.stopImmediatePropagation(); setDeleteConfirm(null); return; }
      if (editingPost) { e.stopImmediatePropagation(); setEditingPost(null); setBody(''); return; }
      if (attachmentPreview) { e.stopImmediatePropagation(); setAttachmentPreview(null); return; }
    };
    window.addEventListener('readingClubBackPress', h);
    return () => window.removeEventListener('readingClubBackPress', h);
  }, [contextMenu, reportPost, deleteConfirm, editingPost, attachmentPreview]);

  // ═══════════════════════════════════════════════════
  // LOAD MESSAGES + SOCKET
  // ═══════════════════════════════════════════════════
  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await clubMessagesAPI.list(club._id);
        if (res.ok && res.data?.messages) setMessages(res.data.messages.reverse());
      } catch (err) { console.error(err); }
      finally { setIsLoading(false); }
    };
    fetch();
    readingClubSync.joinRoom(club._id);

    readingClubSync.onNewMessage((msg: ClubPost) => {
      setMessages(prev => {
        if (prev.some(m => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
      setTimeout(() => {
        const el = scrollRef.current;
        if (el && el.scrollHeight - el.scrollTop - el.clientHeight < 150)
          el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
      }, 100);
    });

    readingClubSync.onMessageUpdated((updated: ClubPost) => {
      setMessages(prev => prev.map(m => m._id === updated._id ? { ...m, ...updated } : m));
    });

    readingClubSync.onMessageDeleted((data: { messageId: string }) => {
      setMessages(prev => prev.filter(m => m._id !== data.messageId));
    });

    readingClubSync.onMessagePinned((pinned: ClubPost) => {
      setMessages(prev => prev.map(m => {
        if (m._id === pinned._id) return { ...m, isPinned: true };
        if (m.isPinned) return { ...m, isPinned: false };
        return m;
      }));
    });

    readingClubSync.onUserTyping((data: { userId: string; nickname: string }) => {
      if (data.userId === currentUserId) return;
      setTypingUsers(prev => [...new Set([...prev, data.nickname])]);
      setTimeout(() => setTypingUsers(prev => prev.filter(n => n !== data.nickname)), 3000);
    });

    return () => { readingClubSync.leaveRoom(club._id); readingClubSync.offAll(); };
  }, [club._id, currentUserId]);

  useEffect(() => {
    if (!isLoading && scrollRef.current) scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'auto' });
  }, [isLoading]);

  // Scroll observer
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => setShowScrollBtn(el.scrollHeight - el.scrollTop - el.clientHeight > 150 && messages.length > 5);
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [messages.length]);

  // Auto-resize textarea
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
  const showToast = useCallback((text: string) => {
    setToastText(text); setCopyToast(true);
    setTimeout(() => setCopyToast(false), 2000);
  }, []);

  const handleBodyChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setBody(e.target.value);
    readingClubSync.sendTyping(club._id, true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => readingClubSync.sendTyping(club._id, false), 2000);
  }, [club._id]);

  const handleSend = useCallback(async () => {
    // Attachment mode
    if (attachmentPreview) {
      setSending(true);
      try {
        const attachBody = JSON.stringify(attachmentPreview);
        const res = await clubMessagesAPI.send(club._id, {
          body: attachBody, type: 'thought',
          replyToMessageId: replyTo?._id,
          clientOperationId: crypto.randomUUID(),
        });
        if (!res.ok) { setSendError(res.error || 'Failed'); }
      } catch { setSendError('Network error'); }
      finally { setSending(false); setAttachmentPreview(null); setReplyTo(null); }
      return;
    }

    if (!body.trim() || sending) return;

    // Edit mode
    if (editingPost) {
      setSending(true);
      try {
        const res = await clubMessagesAPI.edit(club._id, editingPost._id, body.trim(), spoilerLevel);
        if (res.ok && res.data) setMessages(prev => prev.map(m => m._id === editingPost._id ? res.data! : m));
      } catch (err) { console.error(err); }
      finally { setSending(false); setEditingPost(null); setBody(''); setSpoilerLevel(0); }
      return;
    }

    // Send mode
    const msgBody = body, msgReplyTo = replyTo, msgType = type, msgSpoiler = spoilerLevel;
    setSending(true); setSendError(null); setBody(''); setReplyTo(null); setSpoilerLevel(0);
    readingClubSync.sendTyping(club._id, false);
    try {
      const res = await clubMessagesAPI.send(club._id, {
        body: msgBody, type: msgType, spoilerLevel: msgSpoiler,
        replyToMessageId: msgReplyTo?._id, clientOperationId: crypto.randomUUID(),
      });
      if (!res.ok) { setSendError(res.error || 'Failed'); setPendingBody(msgBody); }
    } catch { setSendError('Network error'); setPendingBody(msgBody); }
    finally { setSending(false); }
  }, [body, sending, editingPost, attachmentPreview, replyTo, type, spoilerLevel, club._id]);

  const handleRetry = useCallback(() => {
    if (pendingBody) { setBody(pendingBody); setPendingBody(null); setSendError(null); }
  }, [pendingBody]);

  const handleEdit = useCallback((post: ClubPost) => {
    setEditingPost(post); setBody(post.body || post.content || '');
    setReplyTo(null); setContextMenu(null);
    setTimeout(() => textareaRef.current?.focus(), 100);
  }, []);

  const handleCancelEdit = useCallback(() => { setEditingPost(null); setBody(''); setSpoilerLevel(0); }, []);

  const handleDelete = useCallback(async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      const res = await clubMessagesAPI.delete(club._id, deleteConfirm._id);
      if (res.ok) setMessages(prev => prev.filter(m => m._id !== deleteConfirm._id));
    } catch (err) { console.error(err); }
    finally { setDeleting(false); setDeleteConfirm(null); }
  }, [deleteConfirm, club._id]);

  const handleCopy = useCallback((post: ClubPost) => {
    navigator.clipboard.writeText(post.body || post.content || '').then(() => showToast(isRTL ? 'تم النسخ' : 'Copied')).catch(() => {});
    setContextMenu(null);
  }, [isRTL, showToast]);

  // ═══════════ OPTIMISTIC REACTIONS ═══════════
  const handleReact = useCallback(async (postId: string, emoji: string) => {
    // Optimistic update — show instantly
    setMessages(prev => prev.map(m => {
      if (m._id !== postId) return m;
      const reactions = { ...(m.reactions || {}) };
      const users = [...(reactions[emoji] || [])];
      const idx = users.indexOf(currentUserId);
      if (idx >= 0) users.splice(idx, 1); else users.push(currentUserId);
      if (users.length === 0) delete reactions[emoji]; else reactions[emoji] = users;
      return { ...m, reactions };
    }));
    setContextMenu(null);

    // API call
    try {
      const res = await clubMessagesAPI.react(club._id, postId, emoji);
      if (res.ok && res.data) {
        setMessages(prev => prev.map(m => m._id === postId ? { ...m, reactions: res.data! } : m));
      }
    } catch (err) { console.error('React failed:', err); }
  }, [club._id, currentUserId]);

  const handlePin = useCallback(async (post: ClubPost) => {
    try {
      const res = await clubMessagesAPI.pin(club._id, post._id);
      if (res.ok) {
        setMessages(prev => prev.map(m => {
          if (m._id === post._id) return { ...m, isPinned: !m.isPinned };
          if (m.isPinned) return { ...m, isPinned: false };
          return m;
        }));
      }
    } catch (err) { console.error(err); }
    setContextMenu(null);
  }, [club._id]);

  const handleReply = useCallback((post: ClubPost) => {
    setReplyTo(post); setEditingPost(null); setContextMenu(null);
    setTimeout(() => textareaRef.current?.focus(), 100);
  }, []);

  // ═══════════ REPORT ═══════════
  const handleReport = useCallback(async () => {
    if (!reportPost || !reportReason.trim()) return;
    setReporting(true);
    try {
      await clubMessagesAPI.report(club._id, reportPost._id, reportReason.trim());
      showToast(isRTL ? 'تم الإبلاغ' : 'Reported');
    } catch (err) { console.error(err); }
    finally { setReporting(false); setReportPost(null); setReportReason(''); }
  }, [reportPost, reportReason, club._id, isRTL, showToast]);

  // ═══════════ ATTACHMENT ═══════════
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setAttachLoading(true);
    try {
      let dataUrl: string;
      if (file.type.startsWith('image/')) {
        dataUrl = await compressImage(file, 800, 0.7);
      } else {
        if (file.size > MAX_FILE_SIZE) {
          showToast(isRTL ? `الملف كبير جداً (أقصى ${MAX_FILE_SIZE / 1024}KB)` : `File too large (max ${MAX_FILE_SIZE / 1024}KB)`);
          setAttachLoading(false);
          return;
        }
        dataUrl = await readFileAsDataUrl(file);
      }

      setAttachmentPreview({
        _isAttachment: true,
        mimeType: file.type || 'application/octet-stream',
        fileName: file.name,
        dataUrl,
      });
    } catch (err) {
      console.error('File read error:', err);
      showToast(isRTL ? 'فشل قراءة الملف' : 'Failed to read file');
    } finally { setAttachLoading(false); }
  }, [isRTL, showToast]);

  // ═══════════ LONG PRESS ═══════════
  const handleTouchStart = useCallback((post: ClubPost, e: React.TouchEvent) => {
    const touch = e.touches[0];
    longPressRef.current = setTimeout(() => setContextMenu({ post, x: touch.clientX, y: touch.clientY }), 500);
  }, []);
  const handleTouchEnd = useCallback(() => { if (longPressRef.current) { clearTimeout(longPressRef.current); longPressRef.current = null; } }, []);
  const handleTouchMove = useCallback(() => { if (longPressRef.current) { clearTimeout(longPressRef.current); longPressRef.current = null; } }, []);

  // ═══════════ SCROLL ═══════════
  const scrollToMessage = useCallback((messageId: string) => {
    const el = messageElsRef.current.get(messageId);
    if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); setHighlightedId(messageId); setTimeout(() => setHighlightedId(null), 2000); }
  }, []);
  const scrollToBottom = useCallback(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }), []);

  const handleCtxMenu = useCallback((post: ClubPost, e: React.MouseEvent) => { e.preventDefault(); setContextMenu({ post, x: e.clientX, y: e.clientY }); }, []);

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
      {/* HEADER */}
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

      {/* PINNED */}
      {pinnedMessage && (
        <button onClick={() => scrollToMessage(pinnedMessage._id)}
          className="flex items-center gap-2 px-4 py-2 bg-red-900/20 border-b border-red-900/30 shrink-0 text-start w-full hover:bg-red-900/30 transition-colors">
          <Pin size={14} className="text-red-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-[10px] text-red-500 font-black uppercase tracking-widest">{isRTL ? 'رسالة مثبتة' : 'PINNED'}</span>
            <p className="text-xs text-gray-400 truncate">{pinnedMessage.body}</p>
          </div>
        </button>
      )}

      {/* MESSAGES */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading ? (
          <div className="flex justify-center p-8"><Loader2 className="animate-spin text-red-600" size={32} /></div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-10 uppercase tracking-widest text-sm">{isRTL ? 'لا توجد رسائل بعد' : 'No messages yet'}</div>
        ) : (
          messages.map(msg => (
            <div key={msg._id} ref={el => { if (el) messageElsRef.current.set(msg._id, el); }}>
              <MessageBubble
                msg={msg}
                isMe={getPostAuthorId(msg) === currentUserId}
                isRTL={isRTL}
                highlighted={highlightedId === msg._id}
                currentUserId={currentUserId}
                messages={messages}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                onTouchMove={handleTouchMove}
                onContextMenu={handleCtxMenu}
                onReact={handleReact}
                onReplyClick={scrollToMessage}
                lang={lang}
              />
            </div>
          ))
        )}
      </div>

      {/* SCROLL TO BOTTOM */}
      <AnimatePresence>
        {showScrollBtn && (
          <MotionDiv initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
            className={`absolute ${isRTL ? 'left-4' : 'right-4'} z-20`} style={{ bottom: `${(keyboardHeight || 0) + 140}px` }}>
            <button onClick={scrollToBottom} className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center shadow-lg shadow-red-900/50 hover:bg-red-500 transition-colors">
              <ChevronDown size={20} />
            </button>
          </MotionDiv>
        )}
      </AnimatePresence>

      {/* CONTEXT MENU */}
      <AnimatePresence>
        {contextMenu && (
          <>
            <div className="fixed inset-0 z-[9000] bg-black/40" onClick={() => setContextMenu(null)} onTouchStart={() => setContextMenu(null)} />
            <MotionDiv initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="fixed z-[9001] bg-gray-900 border border-white/10 rounded-2xl shadow-2xl shadow-black/80 overflow-hidden min-w-[180px]"
              style={{
                top: Math.min(Math.max(contextMenu.y - 60, 60), window.innerHeight - 380),
                ...(isRTL ? { right: Math.min(Math.max(window.innerWidth - contextMenu.x, 10), window.innerWidth - 200) }
                         : { left: Math.min(Math.max(contextMenu.x - 90, 10), window.innerWidth - 200) }),
              }}>
              {/* Quick Reactions */}
              <div className="flex items-center justify-center gap-1 p-2 border-b border-white/5">
                {QUICK_EMOJIS.map(emoji => (
                  <button key={emoji} onClick={() => handleReact(contextMenu.post._id, emoji)}
                    className="text-lg p-1.5 rounded-lg hover:bg-white/10 active:scale-90 transition-all">{emoji}</button>
                ))}
              </div>
              <div className="py-1">
                <button onClick={() => handleReply(contextMenu.post)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 text-sm transition-colors">
                  <CornerUpLeft size={16} className="text-gray-400 shrink-0" /><span>{isRTL ? 'رد' : 'Reply'}</span>
                </button>
                <button onClick={() => handleCopy(contextMenu.post)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 text-sm transition-colors">
                  <Copy size={16} className="text-gray-400 shrink-0" /><span>{isRTL ? 'نسخ' : 'Copy'}</span>
                </button>
                {getPostAuthorId(contextMenu.post) === currentUserId && (
                  <button onClick={() => handleEdit(contextMenu.post)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 text-sm transition-colors">
                    <Edit3 size={16} className="text-gray-400 shrink-0" /><span>{isRTL ? 'تعديل' : 'Edit'}</span>
                  </button>
                )}
                {isAdmin && (
                  <button onClick={() => handlePin(contextMenu.post)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 text-sm transition-colors">
                    <Pin size={16} className={`shrink-0 ${contextMenu.post.isPinned ? 'text-yellow-500' : 'text-gray-400'}`} />
                    <span>{contextMenu.post.isPinned ? (isRTL ? 'إلغاء التثبيت' : 'Unpin') : (isRTL ? 'تثبيت' : 'Pin')}</span>
                  </button>
                )}
                {(getPostAuthorId(contextMenu.post) === currentUserId || isAdmin) && (
                  <button onClick={() => { setDeleteConfirm(contextMenu.post); setContextMenu(null); }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 text-sm text-red-500 transition-colors">
                    <Trash2 size={16} className="shrink-0" /><span>{isRTL ? 'حذف' : 'Delete'}</span>
                  </button>
                )}
                {getPostAuthorId(contextMenu.post) !== currentUserId && (
                  <button onClick={() => { setReportPost(contextMenu.post); setContextMenu(null); }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 text-sm text-orange-400 transition-colors">
                    <Flag size={16} className="shrink-0" /><span>{isRTL ? 'إبلاغ' : 'Report'}</span>
                  </button>
                )}
              </div>
            </MotionDiv>
          </>
        )}
      </AnimatePresence>

      {/* DELETE CONFIRM */}
      {deleteConfirm && (
        <ConfirmDialog lang={lang} kind="delete"
          title={isRTL ? 'حذف الرسالة؟' : 'Delete Message?'}
          operationLabel={isRTL ? 'حذف هذه الرسالة نهائياً' : 'Permanently delete this message'}
          consequencesLabel={isRTL ? 'لا يمكن استرجاع الرسالة بعد الحذف' : 'The message cannot be recovered'}
          permanenceLabel={isRTL ? 'لا يمكن التراجع' : 'This cannot be undone'}
          loading={deleting} onCancel={() => setDeleteConfirm(null)} onConfirm={handleDelete} />
      )}

      {/* REPORT DIALOG */}
      <AnimatePresence>
        {reportPost && (
          <>
            <div className="fixed inset-0 z-[11000] bg-black/80 backdrop-blur-sm" onClick={() => setReportPost(null)} />
            <MotionDiv initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="fixed inset-x-4 top-1/3 z-[11001] bg-[#0b140b] border border-red-900/40 rounded-2xl p-6 max-w-sm mx-auto shadow-2xl"
              dir={isRTL ? 'rtl' : 'ltr'}>
              <h3 className="font-black uppercase tracking-widest text-sm text-red-500 mb-4">{isRTL ? 'إبلاغ عن رسالة' : 'REPORT MESSAGE'}</h3>
              <p className="text-xs text-gray-400 mb-3 line-clamp-2">"{reportPost.body?.substring(0, 80)}"</p>
              <textarea
                value={reportReason} onChange={e => setReportReason(e.target.value)}
                className="w-full bg-gray-900 rounded-xl p-3 text-sm focus:outline-none focus:ring-1 focus:ring-red-600 resize-none mb-4"
                placeholder={isRTL ? 'اكتب سبب الإبلاغ...' : 'Reason for reporting...'} rows={3} dir={isRTL ? 'rtl' : 'ltr'} />
              <div className="flex gap-3">
                <button onClick={() => { setReportPost(null); setReportReason(''); }}
                  className="flex-1 py-3 bg-gray-800 rounded-xl text-sm font-black uppercase tracking-widest">{isRTL ? 'إلغاء' : 'Cancel'}</button>
                <button onClick={handleReport} disabled={!reportReason.trim() || reporting}
                  className="flex-1 py-3 bg-red-600 rounded-xl text-sm font-black uppercase tracking-widest disabled:opacity-50 flex items-center justify-center gap-2">
                  {reporting ? <Loader2 size={16} className="animate-spin" /> : <Flag size={16} />}
                  {isRTL ? 'إبلاغ' : 'Report'}
                </button>
              </div>
            </MotionDiv>
          </>
        )}
      </AnimatePresence>

      {/* TOAST */}
      <AnimatePresence>
        {copyToast && (
          <MotionDiv initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="absolute left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs font-bold px-4 py-2 rounded-full flex items-center gap-2 shadow-lg z-30"
            style={{ bottom: `${(keyboardHeight || 0) + 140}px` }}>
            <Check size={14} className="text-green-500" />
            {toastText || (isRTL ? 'تم' : 'Done')}
          </MotionDiv>
        )}
      </AnimatePresence>

      {/* INPUT AREA */}
      <div className="border-t border-red-900/30 bg-[#000a00] shrink-0">
        {/* Reply / Edit Preview */}
        {(replyTo || editingPost) && (
          <div className="flex items-center justify-between bg-gray-900/80 px-4 py-2 border-b border-red-900/20">
            <div className="flex-1 min-w-0">
              <span className={`text-[10px] font-black uppercase tracking-widest ${editingPost ? 'text-yellow-500' : 'text-red-500'}`}>
                {editingPost ? (isRTL ? 'تعديل الرسالة' : 'EDITING') : (isRTL ? `رد على ${getPostAuthorNickname(replyTo!)}` : `REPLY TO ${getPostAuthorNickname(replyTo!)}`)}
              </span>
              <p className="text-xs text-gray-400 truncate mt-0.5">{editingPost ? (editingPost.body || '').substring(0, 60) : (replyTo?.body || '').substring(0, 60)}</p>
            </div>
            <button onClick={() => { if (editingPost) handleCancelEdit(); else setReplyTo(null); }} className="text-gray-500 hover:text-white p-1 shrink-0"><X size={16} /></button>
          </div>
        )}

        {/* Attachment Preview */}
        {attachmentPreview && (
          <div className="flex items-center gap-3 bg-gray-900/80 px-4 py-2 border-b border-red-900/20">
            <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-800 flex items-center justify-center shrink-0">
              {attachmentPreview.mimeType.startsWith('image/') ? (
                <img src={attachmentPreview.dataUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <FileText size={20} className="text-red-500" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-black uppercase tracking-widest text-green-500">{isRTL ? 'مرفق' : 'ATTACHMENT'}</span>
              <p className="text-xs text-gray-400 truncate">{attachmentPreview.fileName}</p>
            </div>
            <button onClick={() => setAttachmentPreview(null)} className="text-gray-500 hover:text-white p-1 shrink-0"><X size={16} /></button>
          </div>
        )}

        {/* Type Selector */}
        {!editingPost && !attachmentPreview && (
          <div className="flex items-center gap-2 px-3 pt-2">
            {([{ t: 'thought', i: MessageCircle }, { t: 'question', i: HelpCircle }, { t: 'review', i: Star }, { t: 'quote', i: Quote }] as const).map(item => (
              <button key={item.t} onClick={() => setType(item.t as any)} className={`p-1.5 rounded-full ${type === item.t ? 'bg-red-600 text-white' : 'text-gray-500'}`}>
                <item.i size={16} />
              </button>
            ))}
            <div className="flex-1" />
            <button onClick={() => setSpoilerLevel(prev => (prev === 0 ? 1 : 0) as any)} className={`p-1.5 rounded-full ${spoilerLevel > 0 ? 'bg-yellow-600 text-white' : 'text-gray-500'}`}>
              <EyeOff size={16} />
            </button>
          </div>
        )}

        {/* Textarea + Attach + Send */}
        <div className="flex items-end gap-2 p-3">
          {!attachmentPreview && (
            <>
              <button onClick={() => fileInputRef.current?.click()} disabled={attachLoading}
                className="text-gray-500 hover:text-red-500 p-2 rounded-full transition-colors shrink-0 disabled:opacity-50">
                {attachLoading ? <Loader2 size={20} className="animate-spin" /> : <Paperclip size={20} />}
              </button>
              <input ref={fileInputRef} type="file" className="hidden" accept="image/*,video/*,.pdf,.zip,.rar" onChange={handleFileSelect} />
            </>
          )}
          {!attachmentPreview && (
            <textarea ref={textareaRef} value={body} onChange={handleBodyChange}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              className="flex-1 bg-gray-900 rounded-xl p-3 text-sm focus:outline-none focus:ring-1 focus:ring-red-600 resize-none max-h-[120px]"
              placeholder={editingPost ? (isRTL ? 'عدّل رسالتك...' : 'Edit your message...') : (isRTL ? 'اكتب رسالتك...' : 'Type a message...')}
              rows={1} dir={isRTL ? 'rtl' : 'ltr'} />
          )}
          <button onClick={handleSend} disabled={(!body.trim() && !attachmentPreview) || sending}
            className="bg-red-600 text-white p-3 rounded-xl disabled:opacity-50 shrink-0">
            {sending ? <Loader2 size={20} className="animate-spin" /> : editingPost ? <Check size={20} /> : <Send size={20} className={isRTL ? 'rotate-180' : ''} />}
          </button>
        </div>

        {/* Send Error */}
        {sendError && (
          <div className="bg-red-900/50 px-4 py-2 text-red-500 text-xs flex justify-between items-center">
            <span>{sendError}</span>
            <button onClick={handleRetry} className="underline uppercase tracking-widest font-black">{isRTL ? 'إعادة المحاولة' : 'Retry'}</button>
          </div>
        )}
      </div>
    </div>
  );
}
