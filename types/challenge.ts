// ══════════════════════════════════════════════════════════════
// BOOK CHALLENGE TYPES — PIN-based competitive reading
// ══════════════════════════════════════════════════════════════

export interface ChallengeIdentity {
  name: string;
  country: string;
}

export interface ChallengeParticipant {
  userId: string;
  name: string;
  country: string;
  currentPage: number;
  totalPages: number;
  percentComplete: number;
  readingMinutes: number;
  stars: number;
  lastUpdated: number;
  // Computed score: combines reading time + progress
  score: number;
}

export interface BookChallenge {
  id: string;                    // Group ID from server
  pin: string;                   // 6-digit PIN for sharing
  bookId: string;
  bookTitle: string;
  bookAuthor: string;
  creatorName: string;
  creatorCountry: string;
  createdAt: number;
  participants: ChallengeParticipant[];
  isOwner: boolean;
  inviteToken?: string;          // Full invite token for API
  lastSyncedAt: number;
}

export interface ChallengeProgress {
  bookId: string;
  currentPage: number;
  totalPages: number;
  readingMinutes: number;
  stars: number;
  timestamp: number;
}

// Progress update message format (sent as group messages)
export interface ChallengeProgressMessage {
  _isChallengeProgress: true;
  name: string;
  country: string;
  currentPage: number;
  totalPages: number;
  percentComplete: number;
  readingMinutes: number;
  stars: number;
  timestamp: number;
}
