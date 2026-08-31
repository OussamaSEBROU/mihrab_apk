import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Send, MessageCircle, HelpCircle, Star, Quote, EyeOff, Loader2, Pin, Edit3, CornerUpLeft, X } from 'lucide-react';
import { ReadingClub, ClubUserProfile, ClubMessage, getPostAuthorNickname, getPostAuthorAvatar, getPostAuthorId } from '../../types/readingClub';
import { clubMessagesAPI } from '../../services/readingClubAPI';
import { readingClubSync } from '../../services/readingClubSync';

const MotionDiv = motion.div as any;

interface Props {
  lang: 'ar' | 'en';
  club: ReadingClub;
  userProfile: ClubUserProfile;
  onBack: () => void;
}

export default function ClubDiscussion({ lang, club, userProfile, onBack }: Props) {
  const isRTL = lang === 'ar';
  const [messages, setMessages] = useState<ClubMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [body, setBody] = useState('');
  const [type, setType] = useState<'thought'|'question'|'review'|'quote'>('thought');
  const [spoilerLevel, setSpoilerLevel] = useState<0|1|2>(0);
  const [replyTo, setReplyTo] = useState<ClubMessage | null>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await clubMessagesAPI.list(club._id);
        setMessages(res.data.reverse());
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchMessages();
    readingClubSync.joinRoom(club._id);

    readingClubSync.onNewMessage((msg: ClubMessage) => {
      setMessages(prev => [...prev, msg]);
      setTimeout(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
      }, 100);
    });

    readingClubSync.onMessageUpdated((updated: ClubMessage) => {
      setMessages(prev => prev.map(m => m._id === updated._id ? updated : m));
    });

    readingClubSync.onMessageDeleted((msgId: string) => {
      setMessages(prev => prev.filter(m => m._id !== msgId));
    });

    readingClubSync.onUserTyping((data: { userId: string; nickname: string; isTyping: boolean }) => {
      setTypingUsers(prev => {
        if (data.isTyping) {
          return [...new Set([...prev, data.nickname])];
        }
        return prev.filter(n => n !== data.nickname);
      });
    });

    return () => {
      readingClubSync.leaveRoom(club._id);
      readingClubSync.offAll();
    };
  }, [club._id]);

  useEffect(() => {
    if (!isLoading) {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'auto' });
    }
  }, [isLoading]);

  let typingTimeout: any;
  const handleBodyChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setBody(e.target.value);
    readingClubSync.sendTyping(club._id, true);
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      readingClubSync.sendTyping(club._id, false);
    }, 2000);
  };

  const handleSend = async () => {
    if (!body.trim()) return;
    
    const newMsgBody = body;
    setBody('');
    setReplyTo(null);
    setSpoilerLevel(0);
    readingClubSync.sendTyping(club._id, false);
    
    try {
      await clubMessagesAPI.create(club._id, {
        body: newMsgBody,
        type,
        spoilerLevel,
        replyToId: replyTo?._id,
      });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className={`flex flex-col h-full bg-[#000a00] text-white ${isRTL ? 'dir-rtl' : 'dir-ltr'}`}>
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
            const isMe = getPostAuthorId(msg) === userProfile.userId;
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
                      <img src={getPostAuthorAvatar(msg) || '/default-avatar.png'} alt="" className="w-5 h-5 rounded-full" />
                      <span className="text-xs text-red-500 font-black uppercase tracking-widest">{getPostAuthorNickname(msg)}</span>
                    </div>
                  )}
                  {msg.replyToId && (
                    <div className="text-xs bg-black/30 p-2 rounded mb-2 border-l-2 border-red-600 text-gray-400">
                      {isRTL ? 'رد على رسالة' : 'Replying to a message'}
                    </div>
                  )}
                  {msg.spoilerLevel > 0 ? (
                    <div className="flex items-center gap-2 text-yellow-500 bg-yellow-500/10 p-2 rounded">
                      <EyeOff size={16} />
                      <span className="text-sm font-bold">{isRTL ? 'حرق أحداث' : 'Spoiler'}</span>
                    </div>
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
          <button onClick={handleSend} disabled={!body.trim()} className="bg-red-600 text-white p-3 rounded-xl disabled:opacity-50">
            <Send size={20} className={isRTL ? 'rotate-180' : ''} />
          </button>
        </div>
      </div>
    </div>
  );
}
