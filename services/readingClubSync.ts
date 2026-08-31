// ══════════════════════════════════════════════════════════════
// READING CLUB SYNC — Real-time Socket.IO connection
// ══════════════════════════════════════════════════════════════

import { io as SocketIO, Socket } from 'socket.io-client';
import { readingClubAuth } from './readingClubAuth';
import type { ClubPost, ClubMember, ReadingClub } from '../types/readingClub';

const SOCKET_URL = 'https://mihrab-clubs-backend.onrender.com';

let socket: Socket | null = null;
let _isConnecting = false;

// Event listeners registry
type EventHandler = (...args: any[]) => void;
const _listeners: Map<string, Set<EventHandler>> = new Map();

// ══════════════════════════════════════════════════════════════
// CONNECTION MANAGEMENT
// ══════════════════════════════════════════════════════════════
const connect = (): Socket | null => {
  if (socket?.connected) return socket;
  if (_isConnecting) return socket;

  const token = readingClubAuth.getToken();
  if (!token) {
    console.log('[ClubSync] No auth token — skipping connection');
    return null;
  }

  _isConnecting = true;

  socket = SocketIO(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 3000,
    reconnectionAttempts: 10,
    timeout: 30000,
  });

  socket.on('connect', () => {
    console.log('🔌 [ClubSync] Connected to clubs server');
    _isConnecting = false;
  });

  socket.on('disconnect', (reason) => {
    console.log(`🔌 [ClubSync] Disconnected: ${reason}`);
    _isConnecting = false;
  });

  socket.on('connect_error', (err) => {
    console.warn(`⚠️ [ClubSync] Connection error: ${err.message}`);
    _isConnecting = false;
  });

  // Re-attach all registered event listeners
  _listeners.forEach((handlers, event) => {
    handlers.forEach(handler => {
      socket?.on(event, handler);
    });
  });

  return socket;
};

const disconnect = () => {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
  _isConnecting = false;
};

const ensureConnected = (): Socket | null => {
  if (!socket?.connected) {
    return connect();
  }
  return socket;
};

// ══════════════════════════════════════════════════════════════
// ROOM MANAGEMENT
// ══════════════════════════════════════════════════════════════
const joinRoom = (groupId: string) => {
  const s = ensureConnected();
  if (s) s.emit('club:join_room', groupId);
};

const leaveRoom = (groupId: string) => {
  if (socket?.connected) socket.emit('club:leave_room', groupId);
};

const sendTyping = (groupId: string) => {
  if (socket?.connected) socket.emit('club:typing', groupId);
};

// ══════════════════════════════════════════════════════════════
// EVENT SUBSCRIPTION
// ══════════════════════════════════════════════════════════════
const on = (event: string, handler: EventHandler) => {
  if (!_listeners.has(event)) _listeners.set(event, new Set());
  _listeners.get(event)!.add(handler);
  if (socket) socket.on(event, handler);
};

const off = (event: string, handler: EventHandler) => {
  _listeners.get(event)?.delete(handler);
  if (socket) socket.off(event, handler);
};

const offAll = (event: string) => {
  _listeners.delete(event);
  if (socket) socket.removeAllListeners(event);
};

// ══════════════════════════════════════════════════════════════
// AUTO-CONNECT ON VISIBILITY CHANGE
// ══════════════════════════════════════════════════════════════
if (typeof window !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && readingClubAuth.isLoggedIn()) {
      ensureConnected();
    }
  });
}

// ══════════════════════════════════════════════════════════════
// EXPORTED SYNC SERVICE
// ══════════════════════════════════════════════════════════════
export const readingClubSync = {
  connect,
  disconnect,
  ensureConnected,
  joinRoom,
  leaveRoom,
  sendTyping,
  on,
  off,
  offAll,
  getSocket: () => socket,
  isConnected: () => socket?.connected ?? false,

  // Convenience event listeners
  onNewMessage: (handler: (message: ClubPost) => void) => on('club:new_message', handler),
  onMessageUpdated: (handler: (message: ClubPost) => void) => on('club:message_updated', handler),
  onMessageDeleted: (handler: (data: { messageId: string }) => void) => on('club:message_deleted', handler),
  onMessagePinned: (handler: (message: ClubPost) => void) => on('club:message_pinned', handler),
  onMemberJoined: (handler: (member: ClubMember) => void) => on('club:member_joined', handler),
  onMemberLeft: (handler: (data: { userId: string }) => void) => on('club:member_left', handler),
  onMemberRemoved: (handler: (data: { userId: string }) => void) => on('club:member_removed', handler),
  onGroupUpdated: (handler: (group: ReadingClub) => void) => on('club:group_updated', handler),
  onBookChanged: (handler: (data: any) => void) => on('club:book_changed', handler),
  onUserTyping: (handler: (data: { userId: string; nickname: string; groupId: string }) => void) =>
    on('club:user_typing', handler),
};
