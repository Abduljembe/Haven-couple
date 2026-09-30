import { CoupleSpaceConfig, SavedSpaceRecord, SpaceType } from '../types';

const SAVED_SPACES_KEY = 'haven_saved_spaces_registry';

/**
 * Get all previously joined spaces from local storage, sorted by most recently visited.
 */
export function getSavedSpaces(): SavedSpaceRecord[] {
  try {
    const raw = localStorage.getItem(SAVED_SPACES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.sort((a, b) => (b.lastVisitedAt || 0) - (a.lastVisitedAt || 0));
  } catch (err) {
    console.error('Failed to read saved spaces registry:', err);
    return [];
  }
}

/**
 * Save or update a space in the registry when created, joined, or visited.
 */
export function recordSpaceVisit(config: CoupleSpaceConfig): SavedSpaceRecord[] {
  try {
    const current = getSavedSpaces();
    const isFriends = config.spaceType === 'friends';
    const title = isFriends
      ? (config.groupName || 'Squad Room')
      : (config.partnerName || 'Couple Sanctuary');
    
    const partnerOrGroupName = isFriends
      ? (config.groupName || 'Friends Squad')
      : (config.partnerName || 'Partner');
      
    const partnerOrGroupAvatar = isFriends
      ? (config.groupEmoji || '🎉')
      : (config.partnerAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80');

    const updatedRecord: SavedSpaceRecord = {
      roomId: config.roomId.trim().toLowerCase(),
      passkey: config.passkey.trim(),
      spaceType: (config.spaceType || 'couple') as SpaceType,
      title,
      partnerOrGroupName,
      partnerOrGroupAvatar,
      myRole: config.userRole || 'partner1',
      myName: config.userName || 'You',
      myAvatar: config.userAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      lastVisitedAt: Date.now(),
    };

    // Filter out existing record with same roomId (case-insensitive)
    const filtered = current.filter(
      (s) => s.roomId.toLowerCase() !== updatedRecord.roomId.toLowerCase()
    );

    const newList = [updatedRecord, ...filtered];
    localStorage.setItem(SAVED_SPACES_KEY, JSON.stringify(newList));
    return newList;
  } catch (err) {
    console.error('Failed to record space visit:', err);
    return getSavedSpaces();
  }
}

/**
 * Remove a space from the registry if user explicitly deletes it from their list.
 */
export function removeSavedSpace(roomId: string): SavedSpaceRecord[] {
  try {
    const current = getSavedSpaces();
    const updated = current.filter((s) => s.roomId.toLowerCase() !== roomId.toLowerCase());
    localStorage.setItem(SAVED_SPACES_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('Failed to remove space from registry:', err);
    return getSavedSpaces();
  }
}

/**
 * Clear all saved spaces from device local storage.
 */
export function clearAllSavedSpaces(): SavedSpaceRecord[] {
  try {
    localStorage.removeItem(SAVED_SPACES_KEY);
    return [];
  } catch (err) {
    console.error('Failed to clear saved spaces:', err);
    return [];
  }
}

/**
 * Convert a SavedSpaceRecord back into an active CoupleSpaceConfig.
 */
export function spaceRecordToConfig(record: SavedSpaceRecord): CoupleSpaceConfig {
  return {
    roomId: record.roomId,
    passkey: record.passkey,
    spaceType: record.spaceType,
    groupName: record.spaceType === 'friends' ? record.title : undefined,
    groupEmoji: record.spaceType === 'friends' ? record.partnerOrGroupAvatar : '💖',
    userRole: record.myRole,
    userName: record.myName,
    userAvatar: record.myAvatar,
    partnerName: record.partnerOrGroupName,
    partnerAvatar: record.partnerOrGroupAvatar,
    autoDeleteTimer: 0,
    isVerified: false,
  };
}

/**
 * Update the last message snippet and timestamp for a saved space.
 */
export function updateSpaceLastMessage(
  roomId: string,
  lastMessageText: string,
  lastMessageTime: number = Date.now()
): SavedSpaceRecord[] {
  try {
    const spaces = getSavedSpaces();
    const updated = spaces.map((s) => {
      if (s.roomId.toLowerCase() === roomId.toLowerCase()) {
        return {
          ...s,
          lastMessageText: lastMessageText.slice(0, 100),
          lastMessageTime,
          lastVisitedAt: Date.now(),
        };
      }
      return s;
    });
    localStorage.setItem(SAVED_SPACES_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('Failed to update last message for space:', err);
    return getSavedSpaces();
  }
}

/**
 * Save chat messages for a specific space in local storage.
 */
export function saveMessagesForSpace(roomId: string, messages: any[]): void {
  if (!roomId) return;
  try {
    localStorage.setItem(`haven_messages_${roomId.toLowerCase()}`, JSON.stringify(messages));
    localStorage.setItem('haven_messages_history', JSON.stringify(messages));
  } catch (e) {
    console.warn('Could not cache messages for room:', roomId, e);
  }
}

/**
 * Retrieve saved chat messages for a space.
 */
export function getMessagesForSpace(roomId: string): any[] {
  if (!roomId) return [];
  try {
    const raw = localStorage.getItem(`haven_messages_${roomId.toLowerCase()}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('Could not parse cached messages for room:', roomId, e);
  }
  return [];
}

/**
 * Export all saved chats across all spaces as a JSON backup payload.
 */
export function exportAllChatsData(): {
  exportedAt: string;
  spaces: Array<SavedSpaceRecord & { messages: any[] }>;
} {
  const spaces = getSavedSpaces();
  const fullData = spaces.map((space) => {
    const msgs = getMessagesForSpace(space.roomId);
    return {
      ...space,
      messages: msgs,
    };
  });
  return {
    exportedAt: new Date().toISOString(),
    spaces: fullData,
  };
}
