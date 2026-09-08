// ══════════════════════════════════════════════════════════════
// READING CLUB AUTH — Device ID + Recovery Code Authentication
// ══════════════════════════════════════════════════════════════

import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { syncBridge } from './syncBridge';
import type { ClubUserProfile } from '../types/readingClub';

const CLUBS_API = 'https://mihrab-clubs-backend.onrender.com/api';
const TOKEN_KEY = 'sanctuary_club_auth_token';
const PROFILE_KEY = 'sanctuary_club_profile';
const RECOVERY_KEY = 'sanctuary_club_recovery_shown';

// ===== FRIENDLY ERROR MAPPING (no technical details leak) =====
const friendlyNetworkError = (lang: 'ar' | 'en' = 'ar'): string =>
  lang === 'ar' ? 'تعذر الاتصال بالخادم. تحقق من اتصالك بالإنترنت وحاول مرة أخرى.' : 'Could not reach the server. Check your connection and try again.';

const friendlyTimeoutError = (lang: 'ar' | 'en' = 'ar'): string =>
  lang === 'ar' ? 'استغرق الاتصال وقتاً طويلاً. حاول مرة أخرى.' : 'The connection took too long. Please try again.';

const mapNetworkError = (e: any): string => {
  const msg = e?.message || '';
  if (e?.name === 'AbortError' || msg.includes('abort') || msg.includes('timeout') || msg.includes('Timeout')) return friendlyTimeoutError();
  return friendlyNetworkError();
};

// ===== NATIVE TRANSPORT (bypasses WebView CORS on device) =====
const isNative = () => Capacitor.isNativePlatform();

const nativeRequest = async <T>(
  endpoint: string,
  options: RequestInit,
  headers: Record<string, string>,
  timeoutMs: number
): Promise<{ status: number; data: T }> => {
  const method = (options.method || 'GET') as any;
  let bodyData: any;
  if (typeof options.body === 'string' && options.body) {
    try { bodyData = JSON.parse(options.body); } catch { bodyData = options.body; }
  }
  let timer: any = null;
  try {
    const request = CapacitorHttp.request({
      url: `${CLUBS_API}${endpoint}`,
      method,
      headers,
      data: bodyData,
      readTimeout: timeoutMs,
      connectTimeout: timeoutMs
    });
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(Object.assign(new Error('timeout'), { name: 'AbortError' })), timeoutMs);
    });
    const resp: any = await Promise.race([request, timeout]);
    let parsed: any = resp.data;
    if (typeof parsed === 'string') {
      try { parsed = JSON.parse(parsed); } catch { /* keep raw string */ }
    }
    return { status: resp.status, data: parsed as T };
  } finally {
    if (timer) clearTimeout(timer);
  }
};

// ===== SERVER WAKE-UP (same pattern as syncBridge) =====
let _serverAwake = false;
const wakeUpServer = async (): Promise<boolean> => {
  if (_serverAwake) return true;
  try {
    if (isNative()) {
      const resp = await nativeRequest<any>('/health', {}, {}, 50000);
      if (resp.status >= 200 && resp.status < 300) {
        _serverAwake = true;
        setTimeout(() => { _serverAwake = false; }, 5 * 60 * 1000);
        return true;
      }
      return false;
    }
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 50000);
    const resp = await fetch(`${CLUBS_API}/health`, { signal: ctrl.signal });
    clearTimeout(tid);
    if (resp.ok) {
      _serverAwake = true;
      setTimeout(() => { _serverAwake = false; }, 5 * 60 * 1000);
      return true;
    }
  } catch { }
  return false;
};

// ===== API CALL WITH RETRY =====
const apiCall = async <T>(
  endpoint: string,
  options: RequestInit = {},
  retries = 2
): Promise<{ ok: boolean; data?: T; error?: string }> => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await wakeUpServer();
      const token = getToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string> || {})
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      let resp: Response;
      if (isNative()) {
        const { status, data } = await nativeRequest<T>(endpoint, options, headers, 30000);
        resp = new Response(JSON.stringify(data ?? {}), { status });
      } else {
        const ctrl = new AbortController();
        const tid = setTimeout(() => ctrl.abort(), 30000);
        resp = await fetch(`${CLUBS_API}${endpoint}`, {
          ...options,
          headers,
          signal: ctrl.signal
        });
        clearTimeout(tid);
      }

      const data = await resp.json().catch(() => ({}));
      if (resp.ok) return { ok: true, data: data as T };
      return { ok: false, error: data.error || `HTTP ${resp.status}` };
    } catch (e: any) {
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, attempt * 3000));
        continue;
      }
      return { ok: false, error: mapNetworkError(e) };
    }
  }
  return { ok: false, error: mapNetworkError({ message: 'network' }) };
};

// ===== TOKEN MANAGEMENT =====
const getToken = (): string | null => localStorage.getItem(TOKEN_KEY);
const setToken = (token: string) => localStorage.setItem(TOKEN_KEY, token);
const clearToken = () => localStorage.removeItem(TOKEN_KEY);

// ===== PROFILE MANAGEMENT =====
const getLocalProfile = (): ClubUserProfile | null => {
  try {
    const data = localStorage.getItem(PROFILE_KEY);
    return data ? JSON.parse(data) : null;
  } catch { return null; }
};

const saveLocalProfile = (profile: ClubUserProfile) => {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
};

const clearLocalProfile = () => localStorage.removeItem(PROFILE_KEY);

// ══════════════════════════════════════════════════════════════
// EXPORTED AUTH SERVICE
// ══════════════════════════════════════════════════════════════
export const readingClubAuth = {
  getToken,
  getLocalProfile,
  isLoggedIn: (): boolean => !!getToken() && !!getLocalProfile(),

  register: async (nickname: string, avatarIndex: number): Promise<{
    success: boolean;
    profile?: ClubUserProfile;
    recoveryCode?: string;
    error?: string;
  }> => {
    try {
      const deviceId = await syncBridge.getDeviceId();

      const result = await apiCall<{
        token: string;
        user: { _id: string; nickname: string; avatarIndex: number; createdAt: string };
        recoveryCode?: string;
      }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ deviceId, nickname, avatarIndex })
      });

      if (!result.ok || !result.data) {
        return { success: false, error: result.error || 'Registration failed' };
      }

      const { token, user, recoveryCode } = result.data;

      setToken(token);

      const profile: ClubUserProfile = {
        id: user._id,
        deviceId,
        nickname: user.nickname,
        avatarIndex: user.avatarIndex,
        token,
        recoveryCode,
        serverUserId: user._id,
        createdAt: new Date(user.createdAt).getTime()
      };

      saveLocalProfile(profile);

      return { success: true, profile, recoveryCode };
    } catch (e: any) {
      return { success: false, error: mapNetworkError(e) };
    }
  },

  verify: async (): Promise<boolean> => {
    const token = getToken();
    if (!token) return false;
    const result = await apiCall<{ valid: boolean }>('/auth/verify', { method: 'POST' });
    return result.ok && result.data?.valid === true;
  },

  recover: async (deviceId: string, recoveryCode: string): Promise<{
    success: boolean;
    profile?: ClubUserProfile;
    error?: string;
  }> => {
    const result = await apiCall<{
      token: string;
      user: { _id: string; nickname: string; avatarIndex: number; createdAt: string };
    }>('/auth/recover', {
      method: 'POST',
      body: JSON.stringify({ deviceId, recoveryCode })
    });

    if (!result.ok || !result.data) {
      return { success: false, error: result.error || 'Recovery failed' };
    }

    const { token, user } = result.data;
    setToken(token);

    const profile: ClubUserProfile = {
      id: user._id,
      deviceId,
      nickname: user.nickname,
      avatarIndex: user.avatarIndex,
      token,
      serverUserId: user._id,
      createdAt: new Date(user.createdAt).getTime()
    };

    saveLocalProfile(profile);
    return { success: true, profile };
  },

  updateProfile: async (updates: { nickname?: string; avatarIndex?: number }): Promise<boolean> => {
    const result = await apiCall('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(updates)
    });

    if (result.ok) {
      const profile = getLocalProfile();
      if (profile) {
        if (updates.nickname) profile.nickname = updates.nickname;
        if (updates.avatarIndex !== undefined) profile.avatarIndex = updates.avatarIndex;
        saveLocalProfile(profile);
      }
    }

    return result.ok;
  },

  /**
   * Logout — clear local data + disconnect socket + clear recovery_shown
   */
  logout: () => {
    clearToken();
    clearLocalProfile();
    localStorage.removeItem(RECOVERY_KEY);
    // Socket disconnect is handled by readingClubSync.disconnect() at component level
  },

  apiCall,

  publicGet: async <T>(path: string, timeoutMs = 30000): Promise<{ ok: boolean; data?: T; error?: string }> => {
    try {
      if (isNative()) {
        const { status, data } = await nativeRequest<T>(path, {}, {}, timeoutMs);
        if (status >= 200 && status < 300) return { ok: true, data };
        return { ok: false, error: `HTTP ${status}` };
      }
      // Use AbortController instead of AbortSignal.timeout for wider compatibility
      const ctrl = new AbortController();
      const tid = setTimeout(() => ctrl.abort(), timeoutMs);
      const resp = await fetch(`${CLUBS_API}${path}`, { signal: ctrl.signal });
      clearTimeout(tid);
      const data = await resp.json().catch(() => ({}));
      if (resp.ok) return { ok: true, data: data as T };
      return { ok: false, error: (data as any).error || `HTTP ${resp.status}` };
    } catch (e: any) {
      return { ok: false, error: mapNetworkError(e) };
    }
  },

  wakeUpServer,

  wasRecoveryShown: (): boolean => localStorage.getItem(RECOVERY_KEY) === 'true',
  markRecoveryShown: () => localStorage.setItem(RECOVERY_KEY, 'true'),

  API_BASE: CLUBS_API
};
