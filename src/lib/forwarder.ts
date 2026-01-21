// Forwarder module to POST shared content to user's endpoint

import { addLog, type ShareData } from './storage';

export interface ForwardPayload {
  title: string | null;
  text: string | null;
  url: string | null;
  files: Array<{ name: string; type: string; data: string }>;
}

export interface ForwardResult {
  success: boolean;
  response?: string;
  error?: string;
}

export async function forwardShare(
  data: ShareData,
  forwardUrl: string
): Promise<ForwardResult> {
  const payload: ForwardPayload = {
    title: data.title || null,
    text: data.text || null,
    url: data.url || null,
    files: data.files || [],
  };

  // Log as pending
  const logEntry = addLog({
    timestamp: Date.now(),
    status: 'pending',
    payload: {
      title: data.title || '',
      text: data.text || '',
      url: data.url || '',
      filesCount: data.files?.length || 0,
    },
  });

  try {
    const response = await fetch(forwardUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();

    if (!response.ok) {
      // Update log with error
      updateLogStatus(logEntry.id, 'error', undefined, `HTTP ${response.status}: ${responseText}`);
      return {
        success: false,
        error: `HTTP ${response.status}: ${responseText}`,
      };
    }

    // Update log with success
    updateLogStatus(logEntry.id, 'success', responseText);
    return {
      success: true,
      response: responseText,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    // Update log with error
    updateLogStatus(logEntry.id, 'error', undefined, errorMessage);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

function updateLogStatus(
  id: string,
  status: 'success' | 'error',
  response?: string,
  error?: string
): void {
  try {
    const logsJson = localStorage.getItem('forward-web-share-logs');
    if (!logsJson) return;
    
    const logs = JSON.parse(logsJson);
    const index = logs.findIndex((log: { id: string }) => log.id === id);
    if (index !== -1) {
      logs[index].status = status;
      if (response !== undefined) logs[index].response = response;
      if (error !== undefined) logs[index].error = error;
      localStorage.setItem('forward-web-share-logs', JSON.stringify(logs));
    }
  } catch (e) {
    console.error('Error updating log status:', e);
  }
}
