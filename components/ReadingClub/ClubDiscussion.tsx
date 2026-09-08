import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Send, MessageCircle, HelpCircle, Star, Quote, EyeOff, Loader2, Pin, Edit3, CornerUpLeft, X } from 'lucide-react';
import { ReadingClub, ClubUserProfile, ClubPost, getPostAuthorNickname, getPostAuthorAvatar, getPostAuthorId } from '../../types/readingClub';
import { clubMessagesAPI } from '../../services/readingClubAPI';
import { readingClubSync } from '../../services/readingClubSync';
import SpoilerGuard from './shared/SpoilerGuard';

const MotionDiv = motion.div as any;

const AVATARS = ['📖','🌙','⭐','🔥','🌿','💎','🦋','🌸','🏔️','🌊','🎭','🕌'];

interface Props {
  lang: 'ar' | 'en';
  club: ReadingClub;
  userProfile: ClubUserProfile;
  onBack: () => void;
}

export default function ClubDiscussion({ lang, club, userProfile, onBack }: Props) {
  const isRTL = lang === 'ar';
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

  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<any>(null);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await clubMessagesAPI.list(club._id);
        if (res.ok && res.data?.messages) {
          setMessages(res.data.messages.reverse());
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchMessages();
    readingClubSync.joinRoom(club._id);

    readingClubSync.onNewMessage((msg: ClubPost) => {
      setMessages(prev => [...prev, msg]);
      setTimeout(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
      }, 100);
    });

    readingClubSync.onMessageUpdated((updated: ClubPost) => {
      setMessages(prev => prev.map(m => m._id === updated._id ? updated : m));
    });

    readingClubSync.onMessageDeleted((data: { messageId: string }) => {
      setMessages(prev => prev.filter(m => m._id !== data.messageId));
    });

    readingClubSync.onUserTyping((data: { userId: string; nickname: string; groupId: string }) => {
      if (data.userId === (userProfile.id || userProfile.serverUserId)) return;
      setTypingUsers(prev => [...new Set([...prev, data.nickname])]);
      setTimeout(() => {
        setTypingUsers(prev => prev.filter(n => n !== data.nickname));
      }, 3000);
    });

    return () => {
      readingClubSync.leaveRoom(club._id);
      readingClubSync.offAll();
    };
  }, [club._id, userProfile.id, userProfile.serverUserId]);

  useEffect(() => {
    if (!isLoading) {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'auto' });
    }
  }, [isLoading]);

  const handleBodyChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setBody(e.target.value);
    readingClubSync.sendTyping(club._id, true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      readingClubSync.sendTyping(club._id, false);
    }, 2000);
  };

  const handleSend = async () => {
    if (!body.trim() || sending) return;
    const msgBody = body;
    const msgReplyTo = replyTo;
    const msgType = type;
    const msgSpoiler = spoilerLevel;
    const opId = crypto.randomUUID();
    
    setSending(true);
    setSendError(null);
    setBody('');
    setReplyTo(null);
    setSpoilerLevel(0);
    readingClubSync.sendTyping(club._id, false);
    
    try {
      const res = await clubMessagesAPI.send(club._id, {
        body: msgBody,
        type: msgType,
        spoilerLevel: msgSpoiler,
        replyToMessageId: msgReplyTo?._id,
        clientOperationId: opId,
      });
      if (!res.ok) {
        setSendError(res.error || 'Failed');
        setPendingBody(msgBody);
      }
    } catch (err) {
      setSendError('Network error');
      setPendingBody(msgBody);
    } finally {
      setSending(false);
    }
  };

  const handleRetry = () => {
    if (pendingBody) {
      setBody(pendingBody);
      setPendingBody(null);
      setSendError(null);
    }
  };

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="flex flex-col h-full bg-[#000a00] text-white">
      <div className="flex items-center justify-between p-4 border-b border-red-900/30">
        <button onClick={onBack} className="text-red-600 p-2 hover:bg-red-900/20 rounded-full">
          {isRTL ? <ArrowRight size={24} /> : <ArrowLeft size={24} />}
        </button>
        <h1 className="font-black uppercase tracking-widest text-lg">{club.name}</h1>
        <div className="w-10"></div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="flex justify-center p-8"><Loader2 className="animate-spin text-red-600" size={32} /></div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-10 uppercase tracking-widest text-sm">
            {lang === 'ar' ? 'لا توجد رسائل بعد' : 'No messages yet'}
          </div>
        ) : (
          messages.map(msg => {
            const isMe = getPostAuthorId(msg) === (userProfile.id || userProfile.serverUserId);
            return (
              <MotionDiv
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={msg._id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div className={`max-w-[85%] rounded-2xl p-3 ${isMe ? 'bg-red-900/30 border border-red-600/30' : 'bg-gray-900 border border-gray-800'}`}>
                  {!isMe && (
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center bg-gray-800 text-xs">
                        {AVATARS[getPostAuthorAvatar(msg)] || '📖'}
                      </div>
                      <span className="text-xs text-red-500 font-black uppercase tracking-widest">{getPostAuthorNickname(msg)}</span>
                    </div>
                  )}
                  {(msg as any).replyToId && (
                    <div className="text-xs bg-black/30 p-2 rounded mb-2 border-l-2 border-red-600 text-gray-400">
                      {isRTL ? 'رد على رسالة' : 'Replying to a message'}
                    </div>
                  )}
                  {msg.spoilerLevel > 0 ? (
                    <SpoilerGuard lang={lang}>
                      <p className="text-sm">{msg.body}</p>
                    </SpoilerGuard>
                  ) : (
                    <p className="text-sm">{msg.body}</p>
                  )}
                  <div className="flex justify-between items-center mt-2 opacity-50 text-[10px]">
                    <span>{new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    <button onClick={() => setReplyTo(msg)} className="hover:text-red-500"><CornerUpLeft size={12} /></button>
                  </div>
                </div>
              </MotionDiv>
            );
          })
        )}
        {typingUsers.length > 0 && (
          <div className="text-xs text-red-600 animate-pulse font-black uppercase tracking-widest">
            {typingUsers.join(', ')} {lang === 'ar' ? 'يكتبون...' : 'typing...'}
          </div>
        )}
      </div>

      <div className="p-3 border-t border-red-900/30 bg-[#000a00]">
        {replyTo && (
          <div className="flex items-center justify-between bg-gray-900 p-2 rounded-t-xl mb-1 border-b border-red-900">
            <span className="text-xs text-gray-400 truncate">{replyTo.body}</span>
            <button onClick={() => setReplyTo(null)} className="text-red-500"><X size={14} /></button>
          </div>
        )}
        <div className="flex items-center gap-2 mb-2">
          {[{t: 'thought', i: MessageCircle}, {t: 'question', i: HelpCircle}, {t: 'review', i: Star}, {t: 'quote', i: Quote}].map(item => (
            <button key={item.t} onClick={() => setType(item.t as any)} className={`p-1.5 rounded-full ${type === item.t ? 'bg-red-600 text-white' : 'text-gray-500'}`}>
              <item.i size={16} />
            </button>
          ))}
          <div className="flex-1"></div>
          <button onClick={() => setSpoilerLevel(prev => prev === 0 ? 1 : 0 as any)} className={`p-1.5 rounded-full ${spoilerLevel > 0 ? 'bg-yellow-600 text-white' : 'text-gray-500'}`}>
            <EyeOff size={16} />
          </button>
        </div>
        <div className="flex items-end gap-2">
          <textarea
            value={body}
            onChange={handleBodyChange}
            className="flex-1 bg-gray-900 rounded-xl p-3 text-sm focus:outline-none focus:ring-1 focus:ring-red-600 resize-none"
            placeholder={lang === 'ar' ? 'اكتب رسالتك...' : 'Type a message...'}
            rows={1}
            dir={isRTL ? 'rtl' : 'ltr'}
          />
          <button onClick={handleSend} disabled={!body.trim() || sending} className="bg-red-600 text-white p-3 rounded-xl disabled:opacity-50">
            {sending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} className={isRTL ? 'rotate-180' : ''} />}
          </button>
        </div>
        {sendError && (
          <div className="bg-red-900/50 p-2 text-red-500 text-xs flex justify-between items-center rounded mt-2">
            <span>{sendError}</span>
            <button onClick={handleRetry} className="underline uppercase tracking-widest font-black">{lang === 'ar' ? 'إعادة المحاولة' : 'Retry'}</button>
          </div>
        )}
      </div>
    </div>
  );
}
