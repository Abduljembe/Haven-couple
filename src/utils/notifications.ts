// Push & Background Notification Management for Haven
// Supports Lock Screen, System Tray, Mobile Status Bar, and Service Worker Background notifications

export type NotificationPermissionState = 'granted' | 'denied' | 'default' | 'unsupported';

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
  renotify?: boolean;
  vibrate?: number[];
  actions?: { action: string; title: string }[];
}

// Check current notification capability and permission
export function getNotificationPermission(): NotificationPermissionState {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission as NotificationPermissionState;
}

// Request permission from the user
export async function requestPushPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    console.warn('[Push] Notifications not supported in this browser environment');
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    const isGranted = permission === 'granted';
    if (isGranted) {
      localStorage.setItem('haven_push_notifications_enabled', 'true');
    } else {
      localStorage.setItem('haven_push_notifications_enabled', 'false');
    }
    return isGranted;
  } catch (err) {
    console.error('[Push] Error requesting notification permission:', err);
    return false;
  }
}

// Check if user has explicitly enabled push in settings
export function isPushNotificationEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  const pref = localStorage.getItem('haven_push_notifications_enabled');
  return pref === 'true' && getNotificationPermission() === 'granted';
}

// Send a background / lock-screen notification
export async function sendPushNotification(payload: PushNotificationPayload): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  // If permission is not granted, skip
  if (Notification.permission !== 'granted') {
    return false;
  }

  const title = payload.title;
  const options: any = {
    body: payload.body,
    icon: payload.icon || '/pwa-192x192.png',
    badge: payload.badge || '/apple-touch-icon.png',
    tag: payload.tag || 'haven-general',
    renotify: payload.renotify ?? true,
    data: payload.data || { url: window.location.href },
    // Vibration pattern for mobile lock screens
    vibrate: payload.vibrate || [200, 100, 200],
  };

  if (payload.actions && payload.actions.length > 0) {
    options.actions = payload.actions;
  }

  try {
    // Priority 1: Service Worker Registration showNotification (works in background & lock screen)
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        if (registration && registration.showNotification) {
          await registration.showNotification(title, options);
          return true;
        }
      } catch (swErr) {
        console.warn('[Push] SW showNotification failed, trying fallback:', swErr);
      }
    }

    // Priority 2: Standard Desktop / In-tab Notification API
    const notification = new Notification(title, options);
    notification.onclick = (event) => {
      event.preventDefault();
      window.focus();
      notification.close();
    };
    return true;
  } catch (err) {
    console.error('[Push] Failed to show notification:', err);
    return false;
  }
}

// Helper to trigger call ringing push notification with lock-screen alerts
export async function sendIncomingCallPushNotification(callerName: string, callType: 'video' | 'audio'): Promise<boolean> {
  return sendPushNotification({
    title: `📞 Incoming ${callType === 'video' ? 'Video' : 'Audio'} Call`,
    body: `${callerName} is calling you in your private sanctuary 💕`,
    tag: 'haven-incoming-call',
    renotify: true,
    vibrate: [300, 150, 300, 150, 300],
    data: {
      type: 'incoming-call',
      callType,
      url: window.location.href,
    },
    actions: [
      { action: 'answer', title: 'Answer Call' },
      { action: 'dismiss', title: 'Decline' },
    ],
  });
}

// Helper to trigger chat message push notification
export async function sendMessagePushNotification(senderName: string, text: string, roomId?: string): Promise<boolean> {
  // Only trigger if document is hidden / screen is locked or window not focused
  if (typeof document !== 'undefined' && document.visibilityState === 'visible' && document.hasFocus()) {
    return false;
  }

  return sendPushNotification({
    title: `💌 ${senderName}`,
    body: text.length > 90 ? text.slice(0, 87) + '...' : text,
    tag: `haven-message-${senderName}`,
    renotify: true,
    vibrate: [150, 80, 150],
    data: {
      type: 'chat-message',
      senderName,
      roomId,
      url: window.location.href,
    },
  });
}

// Helper for Voicemail / Greeting received
export async function sendVoicemailPushNotification(senderName: string, type: 'video' | 'audio', caption?: string): Promise<boolean> {
  return sendPushNotification({
    title: `${type === 'video' ? '🎥' : '🎙️'} New Voicemail from ${senderName}`,
    body: caption ? `"${caption}"` : `${senderName} left you a private ${type} greeting in Haven 💕`,
    tag: 'haven-voicemail',
    renotify: true,
    vibrate: [250, 100, 250],
    data: {
      type: 'voicemail',
      url: window.location.href,
    },
  });
}

// Backward-compatible helper for notifications
export function sendBrowserNotification(title: string, options?: { body?: string; icon?: string; tag?: string }) {
  sendPushNotification({
    title,
    body: options?.body || '',
    icon: options?.icon,
    tag: options?.tag,
  }).catch(() => {});
}
