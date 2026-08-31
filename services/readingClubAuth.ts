// ══════════════════════════════════════════════════════════════
// READING CLUB AUTH — Device ID + Recovery Code Authentication
// ══════════════════════════════════════════════════════════════

import { syncBridge } from './syncBridge';
import type { ClubUserProfile } from '../types/readingClub';

const CLUBS_API = 'https://mihrab-clubs-backend.onrender.com/api';
const TOKEN_KEY = 'sanctuary_club_auth_token';
const PROFILE_KEY = 'sanctuary_club_profile';
const RECOVERY_KEY = 'sanctuary_club_recovery_shown';

// ===== SERVER WAKE-UP (same pattern as syncBridge) =====
let _serverAwake = false;
const wakeUpServer = async (): Promise<boolean> => {
  if (_serverAwake) return true;
  try {
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

      const ctrl = new AbortController();
      const tid = setTimeout(() => ctrl.abort(), 30000);
      const resp = await fetch(`${CLUBS_API}${endpoint}`, {
        ...options,
        headers,
        signal: ctrl.signal
      });
      clearTimeout(tid);

      const data = await resp.json().catch(() => ({}));
      if (resp.ok) return { ok: true, data: data as T };
      return { ok: false, error: data.error || `HTTP ${resp.status}` };
    } catch (e: any) {
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, attempt * 3000));
        continue;
      }
      return { ok: false, error: e.message || 'Network error' };
    }
  }
  return { ok: false, error: 'Max retries reached' };
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

  /**
   * Register or re-login with deviceId + nickname + avatarIndex
   * Returns recoveryCode ONLY on first registration
   */
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
      return { success: false, error: e.message };
    }
  },

  /**
   * Verify the current token is still valid
   */
  verify: async (): Promise<boolean> => {
    const token = getToken();
    if (!token) return false;

    const result = await apiCall<{ valid: boolean }>('/auth/verify', { method: 'POST' });
    return result.ok && result.data?.valid === true;
  },

  /**
   * Recover account with deviceId + recoveryCode
   */
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

  /**
   * Update profile (nickname, avatar)
   */
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
   * Logout — clear local data only
   */
  logout: () => {
    clearToken();
    clearLocalProfile();
  },

  /**
   * Generic authenticated API call — used by other services
   */
  apiCall,

  /**
   * Wake up the server
   */
  wakeUpServer,

  /**
   * Check if recovery code was shown to user
   */
  wasRecoveryShown: (): boolean => localStorage.getItem(RECOVERY_KEY) === 'true',
  markRecoveryShown: () => localStorage.setItem(RECOVERY_KEY, 'true'),

  /**
   * API base URL
   */
  API_BASE: CLUBS_API
};
