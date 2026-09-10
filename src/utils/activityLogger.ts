export type LogCategory =
  | 'system'
  | 'security'
  | 'webrtc'
  | 'media'
  | 'chat'
  | 'singles';

export type LogLevel = 'info' | 'success' | 'warn' | 'secure';

export interface ActivityLogItem {
  id: string;
  timestamp: number;
  category: LogCategory;
  level: LogLevel;
  title: string;
  details?: string;
  metadata?: Record<string, any>;
}

const STORAGE_KEY = 'haven_activity_logs_v1';
const MAX_LOGS = 300;

class ActivityLogger {
  private logs: ActivityLogItem[] = [];
  private listeners: Set<(logs: ActivityLogItem[]) => void> = new Set();

  constructor() {
    this.loadInitialLogs();
  }

  private loadInitialLogs() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.logs = JSON.parse(stored);
      }
    } catch {
      this.logs = [];
    }

    // If empty, seed with initial system start log
    if (this.logs.length === 0) {
      this.log({
        category: 'system',
        level: 'secure',
        title: 'Haven Client Initialized',
        details: 'Security protocols active. WebRTC ICE candidates configured & local encrypted keystore ready.',
      });
    }
  }

  private persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.logs.slice(-MAX_LOGS)));
    } catch {
      // ignore storage quota errors
    }
  }

  public log(entry: Omit<ActivityLogItem, 'id' | 'timestamp'>) {
    const item: ActivityLogItem = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
      ...entry,
    };

    this.logs.unshift(item);
    if (this.logs.length > MAX_LOGS) {
      this.logs = this.logs.slice(0, MAX_LOGS);
    }

    this.persist();
    this.notify();
    return item;
  }

  public getLogs(): ActivityLogItem[] {
    return [...this.logs];
  }

  public clear() {
    this.logs = [
      {
        id: `log-${Date.now()}`,
        timestamp: Date.now(),
        category: 'system',
        level: 'info',
        title: 'Logs Cleared',
        details: 'Audit log entries were cleared by user.',
      },
    ];
    this.persist();
    this.notify();
  }

  public subscribe(callback: (logs: ActivityLogItem[]) => void): () => void {
    this.listeners.add(callback);
    callback(this.getLogs());
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notify() {
    const current = this.getLogs();
    this.listeners.forEach((cb) => cb(current));
  }

  public exportAsJSON(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  public exportAsText(): string {
    return this.logs
      .map((l) => {
        const time = new Date(l.timestamp).toISOString();
        return `[${time}] [${l.level.toUpperCase()}] [${l.category.toUpperCase()}] ${l.title} ${
          l.details ? `\n   Details: ${l.details}` : ''
        }`;
      })
      .join('\n\n');
  }
}

export const logger = new ActivityLogger();
