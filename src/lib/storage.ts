// Storage module for config and logs

const CONFIG_KEY = 'forward-web-share-config';
const LOGS_KEY = 'forward-web-share-logs';
const MAX_LOGS = 50;
const SHARE_TARGET_STORE = 'share-target-store';

// Types
export interface ForwardConfig {
  forwardUrl: string;
}

export interface LogEntry {
  id: string;
  timestamp: number;
  status: 'success' | 'error' | 'pending';
  payload: {
    title: string;
    text: string;
    url: string;
    filesCount: number;
  };
  response?: string;
  error?: string;
}

export interface ShareData {
  title: string;
  text: string;
  url: string;
  files: Array<{ name: string; type: string; data: string }>;
  timestamp: number;
}

// Config functions
export function getForwardUrl(): string {
  try {
    const config = localStorage.getItem(CONFIG_KEY);
    if (config) {
      const parsed = JSON.parse(config) as ForwardConfig;
      return parsed.forwardUrl || '';
    }
  } catch (e) {
    console.error('Error reading config:', e);
  }
  return '';
}

export function setForwardUrl(url: string): void {
  const config: ForwardConfig = { forwardUrl: url };
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

// Logs functions
export function getLogs(): LogEntry[] {
  try {
    const logs = localStorage.getItem(LOGS_KEY);
    if (logs) {
      return JSON.parse(logs) as LogEntry[];
    }
  } catch (e) {
    console.error('Error reading logs:', e);
  }
  return [];
}

export function addLog(entry: Omit<LogEntry, 'id'>): LogEntry {
  const logs = getLogs();
  const newEntry: LogEntry = {
    ...entry,
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  };
  
  // Add to beginning and cap at MAX_LOGS
  logs.unshift(newEntry);
  if (logs.length > MAX_LOGS) {
    logs.length = MAX_LOGS;
  }
  
  localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
  return newEntry;
}

export function clearLogs(): void {
  localStorage.removeItem(LOGS_KEY);
}

// IndexedDB functions for share target data
function openShareDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('share-target-db', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(SHARE_TARGET_STORE)) {
        db.createObjectStore(SHARE_TARGET_STORE);
      }
    };
  });
}

export async function getPendingShareData(): Promise<ShareData | null> {
  try {
    const db = await openShareDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(SHARE_TARGET_STORE, 'readonly');
      const store = tx.objectStore(SHARE_TARGET_STORE);
      const request = store.get('pending');
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  } catch (e) {
    console.error('Error getting pending share data:', e);
    return null;
  }
}

export async function clearPendingShareData(): Promise<void> {
  try {
    const db = await openShareDB();
    const tx = db.transaction(SHARE_TARGET_STORE, 'readwrite');
    const store = tx.objectStore(SHARE_TARGET_STORE);
    store.delete('pending');
  } catch (e) {
    console.error('Error clearing pending share data:', e);
  }
}
