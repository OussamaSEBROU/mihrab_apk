import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Language, Book, ChatMessage, Annotation } from '../types';
import { translations } from '../i18n/translations';
import { storageService } from '../services/storageService';
import { pdfStorage } from '../services/pdfStorage';
import { syncBridge } from '../services/syncBridge';
import { challengeService } from '../services/challengeService';
import ChallengeLeaderboard from './ChallengeLeaderboard';
import WisdomIndex from './WisdomIndex';
import AnnotationEditor, { type AnnotationPatch } from './AnnotationEditor';
import { 
  ChevronLeft, ChevronRight, Maximize2, Highlighter, 
  PenTool, MessageSquare, Trash2, X, MousePointer2, 
  ListOrdered, Volume2, CloudLightning, Waves, 
  Moon, Bird, Flame, VolumeX, Sparkles, Search, Droplets,
  Edit3, Sun, Clock, BoxSelect, Palette, Check, LayoutGrid,
  FileAudio, Users, Send, MessageCircle, Share2, Zap,
  Mic, MicOff, Hand, Ghost, BookOpen,
  PhoneOff, Video, VideoOff, MoreVertical, Monitor, ArrowLeft,
  Underline, Trophy
} from 'lucide-react';
import { Socket } from 'socket.io-client';
import Peer from 'simple-peer';
declare const pdfjsLib: any;
const MotionDiv = motion.div as any;
const MotionHeader = motion.header as any;
interface ReaderProps {
  book: Book;
  lang: Language;
  userId?: string;
  onBack: () => void;
  onStatsUpdate: (starReached?: number | null) => void;
  socket?: Socket | null;
  roomId?: string | null;
  roomData?: any;
}
interface RoomMember {
  id: string;
  name: string;
  currentPage: number;
  isMicActive?: boolean;
  isHandRaised?: boolean;
}
interface VoiceSignalPayload {
  from: string;
  signal: any;
}
interface MemberMovedPayload {
  id: string;
  page: number;
}
interface MemberCursorPayload {
  id: string;
  cursor: { x: number, y: number };
}
interface NewReactionPayload {
  id: string;
  reaction: string;
}
interface MicStatusPayload {
  id: string;
  active: boolean;
}
interface HandRaisedPayload {
  id: string;
  raised: boolean;
}
type Tool = 'view' | 'highlight' | 'underline' | 'box' | 'note';
const COLORS = [
  { name: 'Yellow', hex: '#fbbf24' },
  { name: 'Red', hex: '#ef4444' },
  { name: 'Green', hex: '#22c55e' },
  { name: 'Blue', hex: '#3b82f6' },
  { name: 'Purple', hex: '#a855f7' }
];
const SOUNDS = [
  { id: 'none', icon: VolumeX, url: '' },
  { id: 'rain', icon: CloudLightning, url: '/assets/sounds/rain.mp3' },
  { id: 'sea', icon: Waves, url: '/assets/sounds/sea.mp3' },
  { id: 'river', icon: Droplets, url: '/assets/sounds/river.mp3' },
  { id: 'night', icon: Moon, url: '/assets/sounds/night.mp3' },
  { id: 'birds', icon: Bird, url: '/assets/sounds/birds.mp3' },
  { id: 'fire', icon: Flame, url: '/assets/sounds/fire.mp3' }
];
const TOOL_ICONS = {
  view: MousePointer2,
  highlight: Highlighter,
  underline: Underline,
  box: BoxSelect,
  note: MessageSquare
};
const Reader: React.FC<ReaderProps> = ({ book, lang, userId, onBack, onStatsUpdate, socket, roomId, roomData }) => {
  const [isZenMode, setIsZenMode] = useState(false);
  const [isNightMode, setIsNightMode] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [pages, setPages] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(book.lastPage || 0);
  const [isLoading, setIsLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(0);
  
  const [activeTool, setActiveTool] = useState<Tool>('view');
  const [activeColor, setActiveColor] = useState(COLORS[0].hex);
  const [annotations, setAnnotations] = useState<Annotation[]>(book.annotations || []);
  const annotationsRef = useRef<Annotation[]>(annotations);
  const applyAnnotations = (next: Annotation[], persist: boolean) => {
    annotationsRef.current = next;
    setAnnotations(next);
    if (persist) storageService.updateBookAnnotations(book.id, next);
  };
  const [isDrawing, setIsDrawing] = useState(false);
  // Zen edit: شريط الأدوات يلتصق بالجهة المقابلة لمنطقة التحديد (لا يحجب النص) ويتلاشى أثناء الرسم/التكبير بالقرص
  const [toolDock, setToolDock] = useState<'top' | 'bottom'>('bottom');
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentRect, setCurrentRect] = useState<{ x: number, y: number, w: number, h: number } | null>(null);
  
  const [editingAnnoId, setEditingAnnoId] = useState<string | null>(null);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [isGoToPageOpen, setIsGoToPageOpen] = useState(false);
  const [isSoundPickerOpen, setIsSoundPickerOpen] = useState(false);
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [isThumbnailsOpen, setIsThumbnailsOpen] = useState(false);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [pdfRequestSent, setPdfRequestSent] = useState(false);
  const [activeSoundId, setActiveSoundId] = useState('none');
  const [volume, setVolume] = useState(0.5);
  const [customSoundName, setCustomSoundName] = useState('');
  const [targetPageInput, setTargetPageInput] = useState('');
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [zoomScale, setZoomScale] = useState(1);
  const [isPinching, setIsPinching] = useState(false);
  const [direction, setDirection] = useState(0); 
  const [thumbCache, setThumbCache] = useState<Record<number, string>>({});
  const [thumbRange, setThumbRange] = useState({ start: 0, end: 20 });
  const thumbInitialScrollDone = useRef(false);
  const pdfDocRef = useRef<any>(null);
  const PAGE_CACHE_MAX = 8;
  const [isFlashcardMode, setIsFlashcardMode] = useState(false);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [members, setMembers] = useState<any[]>([]);
  const [memberCursors, setMemberCursors] = useState<Record<string, { x: number, y: number, name: string }>>({});
  const [activeReactions, setActiveReactions] = useState<any[]>([]);
  const [isMembersListOpen, setIsMembersListOpen] = useState(false);
  const [isMicActive, setIsMicActive] = useState(false);
  const [isSpeakerActive, setIsSpeakerActive] = useState(true);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [remoteScreenStream, setRemoteScreenStream] = useState<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const [showCopySuccess, setShowCopySuccess] = useState(false);
  const [speakingMembers, setSpeakingMembers] = useState<Set<string>>(new Set());
  const [isChallengeOpen, setIsChallengeOpen] = useState(false);
  // حالة بدل استدعاء الخدمة في كل render (القارئ يُعاد رسمه كل ثانية ومع كل حرف)
  const [hasActiveChallenge, setHasActiveChallenge] = useState(() => !!challengeService.getChallengeForBook(book.id));
  useEffect(() => {
    setHasActiveChallenge(!!challengeService.getChallengeForBook(book.id));
  }, [book.id, isChallengeOpen]);
  const challengeSyncRef = useRef<number>(0); // tracks last challenge sync time
  const [peers, setPeers] = useState<Record<string, Peer.Instance>>({});
  const streamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Record<string, Peer.Instance>>({});
  const isAdmin = socket && roomData?.adminId === userId;
  
  const initialPinchDistance = useRef<number | null>(null);
  const initialScaleOnPinch = useRef<number>(1);
  const timerRef = useRef<number | null>(null);
  const sessionSecondsRef = useRef<number>(0);
  const lastSyncedSecondsRef = useRef<number>(0);
  const onStatsUpdateRef = useRef(onStatsUpdate);
  const onBackRef = useRef(onBack);
  onStatsUpdateRef.current = onStatsUpdate;
  onBackRef.current = onBack;
  const pageRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const controlsTimeoutRef = useRef<number | null>(null);
  const enqueueWindowRef = useRef<any>(null);
  const pageReadyRef = useRef(false);
  // قيم حيّة لاستخدامها داخل المؤقّت (الـ closure القديم كان يرسل الصفحة 0 والإنجاز 0% للمنافسة)
  const currentPageRef = useRef(currentPage);
  const totalPagesRef = useRef(totalPages);
  currentPageRef.current = currentPage;
  totalPagesRef.current = totalPages;
  const getLiveStars = () => {
    try { return storageService.getBooks().find(b => b.id === book.id)?.stars || book.stars || 0; } catch { return book.stars || 0; }
  };
  const t = translations[lang];
  const isRTL = lang === 'ar';
  const fontClass = isRTL ? 'font-ar' : 'font-en';
  // TRUE-READING TIMER: Only counts when PDF page is loaded AND visible.
  // Uses pageReadyRef to gate counting — zero phantom seconds during PDF loading.
  // Uses timerRef for immediate suspension on back-button click.
  // Periodic sync every 30s ensures Dashboard/Notifications always reflect real-time reading.
  useEffect(() => {
    const syncDelta = () => {
      const total = sessionSecondsRef.current;
      const delta = total - lastSyncedSecondsRef.current;
      if (delta > 0) {
        const result = storageService.updateBookStats(book.id, delta);
        lastSyncedSecondsRef.current = total;
        onStatsUpdateRef.current(result.starReached);
      }
    };
    const startTimer = () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = window.setInterval(() => {
        if (document.visibilityState === 'visible' && pageReadyRef.current) {
          setSessionSeconds(prev => {
            const next = prev + 1;
            sessionSecondsRef.current = next;
            // Sync to storage every 30 seconds
            if (next % 30 === 0) {
              syncDelta();
              syncBridge.recordActivity(); // Track activity for re-engagement system
              // Sync challenge progress every 60 seconds
              if (next % 60 === 0 && challengeService.getChallengeForBook(book.id)) {
                challengeService.syncProgress(
                  book.id,
                  currentPageRef.current,
                  totalPagesRef.current,
                  Math.floor(next / 60),
                  getLiveStars()
                );
              }
            }
            return next;
          });
        }
      }, 1000);
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        startTimer();
      } else {
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
        syncDelta(); // Save when app goes background
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    startTimer();
    return () => {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      syncDelta(); // Final save on unmount
    };
  }, [book.id]);
  const formatSessionTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hrs > 0 ? hrs + ':' : ''}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  useEffect(() => {
    if (!socket || !roomId) return;
    socket.on("pdf-requested", async ({ bookId, requesterId }: { bookId: string, requesterId: string }) => {
      if (isAdmin && bookId === book.id) {
        const data = await pdfStorage.getFile(bookId);
        if (data) socket.emit("send-pdf", { roomId, bookId, requesterId, pdfData: data });
      }
    });
    socket.on("pdf-received", async ({ bookId, pdfData }: { bookId: string, pdfData: ArrayBuffer }) => {
      if (bookId === book.id) {
        await pdfStorage.saveFile(bookId, pdfData);
        setPdfRequestSent(false);
      }
    });
    const setupVoice = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        streamRef.current = stream;
        stream.getAudioTracks().forEach(track => track.enabled = isMicActive);
      } catch (err) { console.error("Voice error", err); }
    };
    setupVoice();
    socket.on("room-updated", (data: { members: RoomMember[] }) => {
      setMembers(data.members);
      if (streamRef.current) {
        data.members.forEach((member: RoomMember) => {
          if (member.id !== userId && !peersRef.current[member.id]) createPeer(member.id, streamRef.current!);
        });
      }
    });
    socket.on("voice-signal", ({ from, signal }: VoiceSignalPayload) => {
      const peer = peersRef.current[from];
      if (peer) peer.signal(signal);
      else if (streamRef.current) addPeer(signal, from, streamRef.current!);
    });
    const createPeer = (userToSignal: string, stream: MediaStream) => {
      const combinedStream = new MediaStream([...stream.getTracks()]);
      if (screenStreamRef.current) screenStreamRef.current.getTracks().forEach(track => combinedStream.addTrack(track));
      const peer = new Peer({ initiator: true, trickle: false, stream: combinedStream });
      peer.on("signal", (signal: any) => socket.emit("voice-signal", { signal, to: userToSignal, from: userId }));
      peer.on("stream", (stream: MediaStream) => {
        if (stream.getAudioTracks().length > 0) {
          const audio = document.createElement("audio");
          audio.srcObject = stream; audio.autoplay = true; audio.id = `audio-${userToSignal}`;
          document.body.appendChild(audio);
        }
      });
      peersRef.current[userToSignal] = peer;
      setPeers(prev => ({ ...prev, [userToSignal]: peer }));
    };
    const addPeer = (incomingSignal: any, callerId: string, stream: MediaStream) => {
      const combinedStream = new MediaStream([...stream.getTracks()]);
      const peer = new Peer({ initiator: false, trickle: false, stream: combinedStream });
      peer.on("signal", (signal: any) => socket.emit("voice-signal", { signal, to: callerId, from: userId }));
      peer.on("stream", (stream: MediaStream) => {
        if (stream.getAudioTracks().length > 0) {
          const audio = document.createElement("audio");
          audio.srcObject = stream; audio.autoplay = true; audio.id = `audio-${callerId}`;
          document.body.appendChild(audio);
        }
      });
      peer.signal(incomingSignal);
      peersRef.current[callerId] = peer;
      setPeers(prev => ({ ...prev, [callerId]: peer }));
    };
    return () => {
      socket.off("pdf-requested"); socket.off("pdf-received"); socket.off("room-updated"); socket.off("voice-signal");
      Object.values(peersRef.current).forEach(peer => peer.destroy());
      peersRef.current = {};
      if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
    };
  }, [socket, roomId, isAdmin, book.id, userId, isMicActive]);
  const handleUserActivity = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) window.clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = window.setTimeout(() => {
      if (!isToolsOpen && !isArchiveOpen && !isGoToPageOpen && !isSoundPickerOpen && !isThumbnailsOpen && !editingAnnoId) {
        setShowControls(false);
      }
    }, 4000);
  }, [isToolsOpen, isArchiveOpen, isGoToPageOpen, isSoundPickerOpen, isThumbnailsOpen, editingAnnoId]);
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handlePageChange(currentPage - 1);
      else if (e.key === 'ArrowRight') handlePageChange(currentPage + 1);
      else if (e.key === 'Escape') { setIsToolsOpen(false); setIsArchiveOpen(false); setIsGoToPageOpen(false); setIsSoundPickerOpen(false); setIsThumbnailsOpen(false); setEditingAnnoId(null); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, totalPages]);
  const toggleZenMode = () => {
    setIsZenMode(!isZenMode);
    if (!isZenMode) {
      setIsZenMode(true); setZoomScale(1); setIsToolsOpen(false); setIsThumbnailsOpen(false);
    }
  };
  useEffect(() => {
    // ─── YIELD HELPER: real main-thread release, prevents UI freeze ──────────
    const yieldToMain = (): Promise<void> =>
      typeof (scheduler as any)?.yield === 'function'
        ? (scheduler as any).yield()
        : new Promise(r => setTimeout(r, 4)); // 4ms = one frame budget
    const loadPdf = async () => {
      setIsLoading(true); setIsPdfLoading(true);
      try {
        let data = await pdfStorage.getFile(book.id);
        if (!data && socket && roomId && !isAdmin) {
          socket.emit("request-pdf", { roomId, bookId: book.id, requesterId: userId });
          setPdfRequestSent(true); return;
        }
        if (!data) { setIsLoading(false); setIsPdfLoading(false); return; }
        const pdf = await pdfjsLib.getDocument({ data }).promise;
        const numPages = pdf.numPages; setTotalPages(numPages);
        const pageSlots: (string | null)[] = new Array(numPages).fill(null);
        let rendering = false; const queue: number[] = [];
        let thumbRendering = false; const thumbQueue: number[] = [];
        const thumbSlots: Record<number, string> = {};
        pdfDocRef.current = pdf;
        // ── HIGH-RES PAGE RENDERER (scale 1.5) ──
        const flushQueue = async () => {
          if (rendering || queue.length === 0) return;
          rendering = true;
          while (queue.length > 0) {
            const idx = queue.shift()!;
            if (pageSlots[idx]) continue;
            try {
              const p = await pdf.getPage(idx + 1);
              const vp = p.getViewport({ scale: 1.5 });
              const cv = document.createElement('canvas');
              cv.width = vp.width; cv.height = vp.height;
              const ctx = cv.getContext('2d', { alpha: false })!;
              await p.render({ canvasContext: ctx, viewport: vp }).promise;
              pageSlots[idx] = cv.toDataURL('image/jpeg', 0.82);
              cv.width = 0; cv.height = 0;
              setPages([...pageSlots]);
              await yieldToMain();
            } catch {}
          }
          rendering = false;
        };
        // ── MICRO-THUMBNAIL RENDERER (100px wide, JPEG 0.45 ≈ 5KB each) ──
        const flushThumbQueue = async () => {
          if (thumbRendering || thumbQueue.length === 0) return;
          thumbRendering = true;
          let batchCount = 0;
          while (thumbQueue.length > 0) {
            const idx = thumbQueue.shift()!;
            if (thumbSlots[idx]) continue;
            try {
              const p = await pdf.getPage(idx + 1);
              const baseW = p.getViewport({ scale: 1 }).width;
              const vp = p.getViewport({ scale: 100 / baseW });
              const cv = document.createElement('canvas');
              cv.width = vp.width; cv.height = vp.height;
              const ctx = cv.getContext('2d', { alpha: false })!;
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(0, 0, cv.width, cv.height);
              await p.render({ canvasContext: ctx, viewport: vp }).promise;
              thumbSlots[idx] = cv.toDataURL('image/jpeg', 0.45);
              cv.width = 0; cv.height = 0;
              batchCount++;
              if (batchCount % 8 === 0 || thumbQueue.length === 0) {
                setThumbCache(prev => ({ ...prev, ...thumbSlots }));
              }
              await yieldToMain();
            } catch {}
          }
          thumbRendering = false;
          setThumbCache(prev => ({ ...prev, ...thumbSlots }));
        };
        const WINDOW = 2;
        const enqueueWindow = (center: number, isThumbnailRequest = false) => {
          // Evict high-res pages far from current to cap memory
          for (let i = 0; i < numPages; i++) {
            if (Math.abs(i - center) > WINDOW + 1 && pageSlots[i]) pageSlots[i] = null;
          }
          // Queue high-res pages around current reading position
          const priority = [center, center+1, center-1, center+2, center-2]
            .filter(i => i >= 0 && i < numPages && !pageSlots[i]);
          for (const p of priority.reverse()) {
            const existingIdx = queue.indexOf(p);
            if (existingIdx > -1) queue.splice(existingIdx, 1);
            queue.unshift(p);
          }
          flushQueue();
          // For thumbnails: queue MICRO-THUMBNAIL renders (not high-res)
          if (isThumbnailRequest) {
            for (let i = 0; i < numPages; i++) {
              if (!thumbSlots[i] && !thumbQueue.includes(i)) thumbQueue.push(i);
            }
            flushThumbQueue();
          }
        };
        (window as any).__pdfEnqueueWindow = enqueueWindow;
        enqueueWindow(currentPage);
        enqueueWindowRef.current = enqueueWindow;
        setIsLoading(false); setIsPdfLoading(false);
        pageReadyRef.current = true; // PDF loaded — timer may now count
      } catch (err) { setIsLoading(false); setIsPdfLoading(false); }
    };
    pageReadyRef.current = false; // Reset on new load cycle
    loadPdf();
    return () => {
      pageReadyRef.current = false;
      if (pdfDocRef.current) { pdfDocRef.current.destroy(); pdfDocRef.current = null; }
    };
  }, [book.id, roomId, socket, pdfRequestSent]);
  const handlePageChange = (newPage: number) => {
    if (newPage < 0 || newPage >= totalPages || newPage === currentPage) return;
    setDirection(newPage > currentPage ? 1 : -1);
    setCurrentPage(newPage); setZoomScale(1);
    if (socket && roomId) socket.emit("move-page", { roomId, page: newPage });
    if ((window as any).__pdfEnqueueWindow) (window as any).__pdfEnqueueWindow(newPage);
    storageService.updateBookPage(book.id, newPage);
  };
  const jumpToPage = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseInt(targetPageInput) - 1;
    if (!isNaN(p)) handlePageChange(p);
    setIsGoToPageOpen(false); setTargetPageInput('');
  };
  const getRelativeCoords = (clientX: number, clientY: number) => {
    if (!pageRef.current) return { x: 0, y: 0 };
    const rect = pageRef.current.getBoundingClientRect();
    const rawX = ((clientX - rect.left) / rect.width) * 100;
    const rawY = ((clientY - rect.top) / rect.height) * 100;
    return { x: Math.max(0, Math.min(100, rawX)), y: Math.max(0, Math.min(100, rawY)) };
  };
  const handleTouchStart = (e: React.TouchEvent) => {
    handleUserActivity();
    if (e.touches.length === 2) {
      const dist = Math.hypot(e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY);
      initialPinchDistance.current = dist; initialScaleOnPinch.current = zoomScale; setIsPinching(true); setIsDrawing(false); 
      return;
    }
    if (activeTool !== 'view' && e.touches.length === 1) handleStart(e.touches[0].clientX, e.touches[0].clientY);
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && initialPinchDistance.current !== null) {
      const dist = Math.hypot(e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY);
      const newScale = (dist / initialPinchDistance.current) * initialScaleOnPinch.current;
      setZoomScale(Math.max(1, Math.min(newScale, 4))); return;
    }
    if (isDrawing && e.touches.length === 1) handleMove(e.touches[0].clientX, e.touches[0].clientY);
  };
  const handleStart = (clientX: number, clientY: number) => {
    handleUserActivity();
    if (activeTool === 'view' || isPinching) return;
    // إحداثيات الشاشة الفعلية (clientY) تعمل مع التكبير أيضاً: التحديد في النصف السفلي → الشريط أعلى، والعكس
    const nextDock = clientY > window.innerHeight * 0.5 ? 'top' : 'bottom';
    setToolDock(prev => (prev === nextDock ? prev : nextDock));
    const { x, y } = getRelativeCoords(clientX, clientY);
    if (activeTool === 'note') {
      const newNote: Annotation = { id: Math.random().toString(36).substr(2, 9), type: 'note', pageIndex: currentPage, x, y, text: '', title: '', color: activeColor };
      applyAnnotations([...annotationsRef.current, newNote], false); setEditingAnnoId(newNote.id); return;
    }
    setIsDrawing(true); setStartPos({ x, y }); setCurrentRect({ x, y, w: 0, h: 0 });
  };
  const handleMove = (clientX: number, clientY: number) => {
    if (!isDrawing || isPinching) return;
    const { x: currentX, y: currentY } = getRelativeCoords(clientX, clientY);
    setCurrentRect({ x: Math.min(startPos.x, currentX), y: Math.min(startPos.y, currentY), w: Math.abs(currentX - startPos.x), h: Math.abs(currentY - startPos.y) });
  };
  const handleEnd = () => {
    if (isPinching) {
      setIsPinching(false);
      initialPinchDistance.current = null;
    }
    if (!isDrawing) return;
    if (currentRect && currentRect.w > 0.5) {
      const newAnno: Annotation = { 
        id: Math.random().toString(36).substr(2, 9), 
        type: activeTool as any, 
        pageIndex: currentPage, 
        x: currentRect.x, 
        y: currentRect.y, 
        width: currentRect.w, 
        height: activeTool === 'underline' ? 2 : currentRect.h, 
        color: activeColor, 
        text: '', title: '' 
      };
      applyAnnotations([...annotationsRef.current, newAnno], true);
      setEditingAnnoId(newAnno.id);
    }
    setIsDrawing(false); setCurrentRect(null);
  };
  // ── ZERO-LAG ANNOTATIONS ──
  // • الكتابة نفسها تتم داخل <AnnotationEditor/> بحالة محلية معزولة (لا يُعاد رسم القارئ مع كل حرف).
  // • إلى القارئ/التخزين يصل التعديل مرة واحدة بعد توقف الكتابة أو عند الإغلاق.
  // • مرجع annotationsRef يمنع قراءة نسخة قديمة داخل الـ closures.
  const currentEditingAnno = useMemo(
    () => (editingAnnoId ? annotations.find(a => a.id === editingAnnoId) : undefined),
    [annotations, editingAnnoId]
  );
  const annotationsForPage = useMemo(
    () => annotations.filter(a => a.pageIndex === currentPage),
    [annotations, currentPage]
  );
  const commitAnnotationPatch = useCallback((id: string, patch: AnnotationPatch) => {
    const next = annotationsRef.current.map(a => a.id === id ? { ...a, ...patch } : a);
    applyAnnotations(next, true);
  }, [book.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const deleteAnnotation = useCallback((id: string) => {
    applyAnnotations(annotationsRef.current.filter(a => a.id !== id), true);
    setEditingAnnoId(null);
  }, [book.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const closeEditor = useCallback((saved: boolean) => {
    setEditingAnnoId(null);
    if (saved) setActiveTool('view');
  }, []);
  const goToAnnotationFromIndex = useCallback((pageIndex: number) => {
    handlePageChange(pageIndex);
    setIsArchiveOpen(false);
  }, [currentPage, totalPages]); // eslint-disable-line react-hooks/exhaustive-deps
  const editAnnotationFromIndex = useCallback((id: string) => {
    setEditingAnnoId(id);
    setIsArchiveOpen(false);
  }, []);
  // عند فتح لوحة الصدارة: ادفع تقدّمك الحالي فوراً (محلياً أولاً) كي يظهر صفّك مباشرة
  useEffect(() => {
    if (!isChallengeOpen) return;
    challengeService.syncProgress(
      book.id, currentPageRef.current, totalPagesRef.current,
      Math.floor(sessionSecondsRef.current / 60), getLiveStars()
    );
  }, [isChallengeOpen]); // eslint-disable-line react-hooks/exhaustive-deps
  // Removed periodic 60s auto-save to prevent double counting and ensure 
  // that we only save once on exit with the full accurate session time.
  // This also fixes the "0m" notification bug by ensuring the full session 
  // is committed to storage before the notification manager reads it.
  return (
    <div className={`fixed inset-0 z-[1000] bg-black flex flex-col ${fontClass} select-none overflow-hidden`} onMouseMove={handleUserActivity} onTouchStart={handleUserActivity}>
      <AnimatePresence>
        {showControls && (
          <MotionHeader key="header" initial={{ y: -100, opacity: 0 }} animate={{ y: 0, opacity: isDrawing || isPinching ? 0 : 1 }} exit={{ y: -100, opacity: 0 }} transition={{ duration: 0.12 }} style={{ pointerEvents: isDrawing || isPinching ? 'none' : 'auto' }} className="fixed top-0 left-0 right-0 px-3 py-2.5 md:p-6 flex items-center justify-between z-[1100] bg-black/80 backdrop-blur-2xl border-b border-white/10 pointer-events-auto">
            <div className="flex items-center gap-2 md:gap-3">
              <button onClick={() => {
                // IMMEDIATE timer kill — zero phantom seconds
                if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
                // Sync remaining unsaved seconds BEFORE navigating back
                const delta = sessionSecondsRef.current - lastSyncedSecondsRef.current;
                if (delta > 0) {
                  storageService.updateBookStats(book.id, delta);
                  lastSyncedSecondsRef.current = sessionSecondsRef.current;
                }
                // Final challenge progress sync on exit
                if (challengeService.getChallengeForBook(book.id)) {
                  challengeService.syncProgress(
                    book.id,
                    currentPageRef.current,
                    totalPagesRef.current,
                    Math.floor(sessionSecondsRef.current / 60),
                    getLiveStars()
                  );
                }
                onBackRef.current();
              }} className="flex items-center gap-1.5 px-3 py-2 md:px-5 md:py-2.5 bg-white/5 text-white rounded-full hover:bg-red-600/20 transition-all border border-white/10">
                <ArrowLeft size={16} className={isRTL ? "rotate-180" : ""} />
                <span className="text-[9px] md:text-xs font-black uppercase tracking-widest hidden mini:inline">{isRTL ? 'المحراب' : 'Sanctuary'}</span>
              </button>
              <button onClick={() => setIsArchiveOpen(true)} className="w-9 h-9 md:w-11 md:h-11 flex items-center justify-center bg-white/5 rounded-full text-white/40 hover:bg-white/10 border border-white/[0.06]"><ListOrdered size={16}/></button>
              <button onClick={() => setIsNightMode(!isNightMode)} className={`w-9 h-9 md:w-11 md:h-11 flex items-center justify-center rounded-full transition-all border border-white/[0.06] ${isNightMode ? 'bg-red-600 text-white border-red-600' : 'bg-white/5 text-white/40'}`}>{isNightMode ? <Sun size={16}/> : <Moon size={16}/>}</button>
            </div>
            <div className="flex items-center gap-2">
              {hasActiveChallenge && <button onClick={() => setIsChallengeOpen(!isChallengeOpen)} className={`w-9 h-9 md:w-11 md:h-11 flex items-center justify-center rounded-full transition-all border ${isChallengeOpen ? 'bg-amber-600 text-white border-amber-600 shadow-[0_0_12px_rgba(245,158,11,0.5)]' : 'bg-white/5 text-amber-500/60 border-white/[0.06] hover:bg-amber-600/20'}`}><Trophy size={16}/></button>}
              <button onClick={() => setIsToolsOpen(!isToolsOpen)} className={`w-9 h-9 md:w-11 md:h-11 flex items-center justify-center rounded-full transition-all border border-white/[0.06] ${isToolsOpen ? 'bg-white text-black border-white' : 'bg-white/5 text-white/40'}`}><Palette size={16}/></button>
              <button onClick={toggleZenMode} className={`w-9 h-9 md:w-11 md:h-11 flex items-center justify-center rounded-full border transition-all ${isZenMode ? 'bg-red-600 border-red-600 text-white' : 'bg-white/5 border-white/10 text-white/40'}`}><Maximize2 size={16}/></button>
            </div>
          </MotionHeader>
        )}
      </AnimatePresence>
      <main className="flex-1 flex items-center justify-center bg-black relative overflow-hidden" ref={containerRef}>
        <AnimatePresence>
          {isThumbnailsOpen && (
            <MotionDiv key="thumbnails" initial={{ x: -100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -100, opacity: 0 }} onAnimationComplete={() => { thumbInitialScrollDone.current = false; }} className="fixed left-0 top-0 bottom-0 w-24 md:w-32 bg-black/80 backdrop-blur-2xl z-[1500] border-r border-white/5 flex flex-col pt-24 pb-8 overflow-hidden">
              <div
                className="flex-1 overflow-y-auto no-scrollbar"
                onScroll={(e) => {
                  const el = e.currentTarget;
                  const ITEM_H = 120;
                  const s = Math.max(0, Math.floor(el.scrollTop / ITEM_H) - 4);
                  const end = Math.min(totalPages, Math.ceil((el.scrollTop + el.clientHeight) / ITEM_H) + 4);
                  if (s !== thumbRange.start || end !== thumbRange.end) setThumbRange({ start: s, end });
                  for (let i = s; i < end; i++) {
                    if (!thumbCache[i] && enqueueWindowRef.current) enqueueWindowRef.current(i, true);
                  }
                }}
                ref={(el) => {
                  if (!el || thumbInitialScrollDone.current) return;
                  thumbInitialScrollDone.current = true;
                  requestAnimationFrame(() => {
                    el.scrollTop = Math.max(0, (currentPage - 2) * 120);
                    const viewH = el.clientHeight;
                    const s = Math.max(0, currentPage - 4);
                    const end = Math.min(totalPages, currentPage + Math.ceil(viewH / 120) + 4);
                    setThumbRange({ start: s, end });
                    if (enqueueWindowRef.current) enqueueWindowRef.current(currentPage, true);
                  });
                }}
              >
                {/* VIRTUALIZED: Only render visible thumbnails + buffer */}
                <div style={{ height: `${totalPages * 120}px`, position: 'relative' }}>
                  {Array.from({ length: Math.min(thumbRange.end, totalPages) - thumbRange.start }, (_, i) => {
                    const idx = thumbRange.start + i;
                    if (idx < 0 || idx >= totalPages) return null;
                    const thumb = thumbCache[idx] || pages[idx];
                    return (
                      <button key={idx} onClick={() => handlePageChange(idx)} className={`absolute left-0 right-0 p-2 md:p-3 transition-all ${currentPage === idx ? 'scale-110 brightness-125' : 'opacity-40 hover:opacity-100 grayscale hover:grayscale-0'}`} style={{ top: `${idx * 120}px`, height: '120px' }}>
                        <div className={`relative w-full h-full bg-white rounded-lg overflow-hidden border-2 ${currentPage === idx ? 'border-red-600 shadow-[0_0_15px_rgba(255,0,0,0.5)]' : 'border-transparent'}`}>
                          {thumb ? <img src={thumb} className="w-full h-full object-cover" alt={`Page ${idx + 1}`} /> : <div className="w-full h-full flex items-center justify-center bg-white/5"><div className="w-4 h-4 border border-white/10 border-t-red-600 rounded-full animate-spin" /></div>}
                          <div className="absolute bottom-0 left-0 right-0 bg-black/60 py-0.5 text-[7px] font-black text-white text-center">{idx + 1}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </MotionDiv>
          )}
        </AnimatePresence>
        <div className={`w-full h-full flex items-center justify-center ${isZenMode ? 'p-0' : 'p-4 md:p-12'}`} onClick={() => isZenMode && handleUserActivity()}>
          <MotionDiv 
            ref={pageRef}
            drag={activeTool === 'view' ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={(e: any, info: any) => {
              if (activeTool !== 'view' || isPinching) return;
              const threshold = 50;
              if (info.offset.x < -threshold) handlePageChange(currentPage + 1);
              else if (info.offset.x > threshold) handlePageChange(currentPage - 1);
            }}
            onMouseDown={(e:any) => handleStart(e.clientX, e.clientY)} 
            onMouseMove={(e:any) => handleMove(e.clientX, e.clientY)} 
            onMouseUp={handleEnd} 
            onTouchStart={handleTouchStart} 
            onTouchMove={handleTouchMove} 
            onTouchEnd={handleEnd} 
            animate={{ scale: zoomScale }} className={`relative shadow-[0_0_100px_rgba(0,0,0,1)] overflow-hidden touch-none ${isZenMode ? 'h-full w-full rounded-none' : 'max-h-[85vh] w-auto aspect-[1/1.41] rounded-2xl md:rounded-3xl'}`} style={{ backgroundColor: isNightMode ? '#000000' : '#ffffff', transformOrigin: 'center center' }}
          >
            <AnimatePresence mode="wait">
              <MotionDiv key={currentPage} initial={{ x: direction * (isRTL ? -40 : 40), opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: direction * (isRTL ? 40 : -40), opacity: 0 }} transition={{ duration: 0.25 }} className="w-full h-full flex items-center justify-center">
                {pages[currentPage] ? <img src={pages[currentPage]} className="w-full h-full object-contain pointer-events-none" style={{ filter: isNightMode ? 'invert(1) hue-rotate(180deg)' : 'none' }} alt={`Page ${currentPage + 1}`} /> : <div className="absolute inset-0 flex items-center justify-center"><div className="w-10 h-10 rounded-full border-[2.5px] border-white/[0.06] border-t-red-600 animate-spin" style={{ animationDuration: '0.8s' }} /></div>}
              </MotionDiv>
            </AnimatePresence>
            <div className="absolute inset-0 pointer-events-none">
              {annotationsForPage.map(anno => (
                <div key={anno.id} className="absolute pointer-events-auto cursor-pointer" onClick={() => setEditingAnnoId(anno.id)} style={{
                  left: `${anno.x}%`,
                  top: `${anno.y}%`,
                  width: anno.width ? `${anno.width}%` : '0%',
                  height: anno.type === 'underline' ? '4px' : (anno.height ? `${anno.height}%` : '0%'),
                  backgroundColor: anno.type === 'highlight' ? `${anno.color}44` : (anno.type === 'underline' ? anno.color : 'transparent'),
                  borderRadius: anno.type === 'underline' ? '2px' : undefined,
                  boxShadow: anno.type === 'underline' ? `0 0 6px ${anno.color}88` : undefined,
                  border: anno.type === 'box' ? `2px solid ${anno.color}` : 'none'
                }}>
                  {anno.type === 'note' && <div className="w-7 h-7 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-2xl border-2 border-white flex items-center justify-center" style={{ backgroundColor: anno.color }}><MessageSquare size={12} className="text-white" /></div>}
                </div>
              ))}
              {currentRect && <div className="absolute border-2 border-dashed pointer-events-none" style={{ left: `${currentRect.x}%`, top: `${currentRect.y}%`, width: `${currentRect.w}%`, height: activeTool === 'underline' ? '4px' : `${currentRect.h}%`, borderColor: activeColor, backgroundColor: activeTool === 'highlight' ? `${activeColor}22` : (activeTool === 'underline' ? activeColor : 'transparent') }} />}
            </div>
          </MotionDiv>
        </div>
      </main>
      <div className="fixed bottom-6 left-0 right-0 z-[2000] pointer-events-none px-6 flex flex-col items-center gap-4">
        <AnimatePresence>
          {showControls && (
            <MotionDiv key="bottom-controls" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: isDrawing || isPinching ? 0 : 1 }} exit={{ y: 20, opacity: 0 }} transition={{ duration: 0.12 }} style={{ pointerEvents: isDrawing || isPinching ? 'none' : 'auto' }} className="flex flex-col items-center gap-4 pointer-events-auto">
              
              <div className="bg-red-600/10 border border-red-600/30 px-5 py-1.5 rounded-full backdrop-blur-xl flex items-center gap-2 shadow-2xl">
                 <Clock size={12} className="text-red-600 animate-pulse" />
                 <span className="text-[10px] md:text-xs font-black text-red-600 tracking-widest">{Math.floor(sessionSeconds/60)}m</span>
              </div>
              <div className="bg-black/60 backdrop-blur-3xl border border-white/10 rounded-full p-2 flex items-center gap-2 shadow-4xl">
                 <button onClick={() => setIsThumbnailsOpen(!isThumbnailsOpen)} className={`w-9 h-9 flex items-center justify-center rounded-full transition-all ${isThumbnailsOpen ? 'bg-white text-black shadow-xl' : 'text-white/40 hover:bg-white/5'}`}><LayoutGrid size={16}/></button>
                 <div className="flex items-center gap-1 bg-white/5 rounded-full px-4 py-1.5 border border-white/5">
                   <button onClick={() => handlePageChange(currentPage-1)} className="text-white/30 hover:text-white transition-colors"><ChevronLeft size={16}/></button>
                   <span className="text-[10px] font-black text-white px-2 min-w-[40px] text-center">{currentPage+1}/{totalPages}</span>
                   <button onClick={() => handlePageChange(currentPage+1)} className="text-white/30 hover:text-white transition-colors"><ChevronRight size={16}/></button>
                 </div>
                 <button onClick={() => setIsGoToPageOpen(true)} className="w-9 h-9 flex items-center justify-center rounded-full text-white/40 hover:bg-white/5 transition-colors"><Search size={16}/></button>
              </div>
            </MotionDiv>
          )}
        </AnimatePresence>
      </div>
      {/* ZEN EDIT TOOLBAR — شريط واحد مدمج (أدوات + ألوان) يلتصق بعيداً عن منطقة التحديد */}
      <AnimatePresence>
        {showControls && isToolsOpen && !editingAnnoId && (
          <MotionDiv
            key="tools"
            initial={{ opacity: 0, y: toolDock === 'top' ? -14 : 14 }}
            animate={{ opacity: isDrawing || isPinching ? 0 : 1, y: 0 }}
            exit={{ opacity: 0, y: toolDock === 'top' ? -14 : 14 }}
            transition={{ duration: 0.15 }}
            className={`fixed left-0 right-0 z-[2100] flex justify-center px-4 pointer-events-none ${toolDock === 'top' ? 'top-[72px] md:top-[104px]' : 'bottom-[150px]'}`}
            style={{ transition: 'top .2s ease, bottom .2s ease' }}
          >
            <div
              className="bg-black/70 backdrop-blur-2xl border border-white/10 rounded-[1.75rem] px-3 py-2 shadow-[0_10px_40px_rgba(0,0,0,0.6)] flex flex-col items-center gap-2"
              style={{ pointerEvents: isDrawing || isPinching ? 'none' : 'auto' }}
            >
              <div className="flex items-center gap-2.5">
                {(Object.keys(TOOL_ICONS) as Tool[]).map(tool => {
                  const Icon = TOOL_ICONS[tool];
                  const isActive = activeTool === tool;
                  return (
                    <button key={tool} onClick={() => setActiveTool(activeTool === tool ? 'view' : tool)} className={`w-9 h-9 flex items-center justify-center rounded-full transition-all duration-200 ${isActive ? 'bg-red-600 text-white shadow-xl scale-105' : 'text-white/35 hover:bg-white/5'}`}><Icon size={15}/></button>
                  );
                })}
              </div>
              {activeTool !== 'view' && (
                <div className="flex items-center gap-3 pt-2 border-t border-white/10 w-full justify-center">
                  {COLORS.map(c => (
                    <button key={c.hex} aria-label={c.name} onClick={() => setActiveColor(c.hex)} className={`w-6 h-6 rounded-full border-2 transition-all ${activeColor === c.hex ? 'border-white scale-110 shadow-[0_0_8px_rgba(255,255,255,0.7)]' : 'border-transparent opacity-60'}`} style={{ backgroundColor: c.hex }} />
                  ))}
                </div>
              )}
            </div>
          </MotionDiv>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isArchiveOpen && (
          <WisdomIndex
            key="archive"
            lang={lang}
            annotations={annotations}
            currentPage={currentPage}
            totalPages={totalPages}
            onClose={() => setIsArchiveOpen(false)}
            onGoTo={goToAnnotationFromIndex}
            onEdit={editAnnotationFromIndex}
          />
        )}
        {editingAnnoId && currentEditingAnno && (
          <AnnotationEditor
            key={`editing-${editingAnnoId}`}
            lang={lang}
            annotation={currentEditingAnno}
            colors={COLORS}
            onCommit={commitAnnotationPatch}
            onDelete={deleteAnnotation}
            onClose={closeEditor}
          />
        )}
        {isGoToPageOpen && (
          <MotionDiv key="goto-page" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[3000] bg-black/60 backdrop-blur-[40px] flex items-center justify-center p-6 pointer-events-auto">
            <MotionDiv initial={{ scale: 0.9, y: 30 }} animate={{ scale: 1, y: 0 }} className="bg-[#0b140b]/95 backdrop-blur-3xl border border-white/10 p-6 rounded-[2rem] w-full max-w-[280px] shadow-[0_0_80px_rgba(255,0,0,0.1)] flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-widest text-white/80">{t.goToPage}</h3>
                <button onClick={() => { setIsGoToPageOpen(false); setTargetPageInput(''); }} className="p-1.5 rounded-full bg-white/5 text-white/30 hover:text-white transition-colors"><X size={14}/></button>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={1}
                  max={totalPages}
                  value={targetPageInput}
                  onChange={(e: any) => setTargetPageInput(e.target.value)}
                  onKeyDown={(e: any) => { if (e.key === 'Enter') { e.preventDefault(); const p = parseInt(targetPageInput) - 1; if (!isNaN(p)) handlePageChange(p); setIsGoToPageOpen(false); setTargetPageInput(''); } }}
                  placeholder={`1 - ${totalPages}`}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl p-3 text-sm font-black text-white text-center outline-none focus:border-red-600/50 transition-colors placeholder:text-white/15 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  autoFocus
                />
              </div>
              <button
                onClick={() => { const p = parseInt(targetPageInput) - 1; if (!isNaN(p)) handlePageChange(p); setIsGoToPageOpen(false); setTargetPageInput(''); }}
                className="w-full bg-red-600 py-3 rounded-xl font-black uppercase text-[9px] tracking-[0.3em] text-white hover:bg-red-500 active:scale-95 transition-all shadow-xl shadow-red-600/20 flex items-center justify-center gap-2"
              >
                <Search size={12}/>
                {t.jump}
              </button>
              <p className="text-[8px] text-white/15 text-center font-bold uppercase tracking-widest">{isRTL ? `صفحة ${currentPage + 1} من ${totalPages}` : `Page ${currentPage + 1} of ${totalPages}`}</p>
            </MotionDiv>
          </MotionDiv>
        )}
      </AnimatePresence>
      {/* Challenge Leaderboard Dropdown */}
      {hasActiveChallenge && (
        <ChallengeLeaderboard
          bookId={book.id}
          lang={lang}
          isOpen={isChallengeOpen}
          onToggle={() => setIsChallengeOpen(!isChallengeOpen)}
        />
      )}
    </div>
  );
};
export default Reader;
