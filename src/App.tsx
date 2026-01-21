import { Component, createSignal, createEffect, onMount, Show, For } from 'solid-js';
import styles from './App.module.css';
import {
  getConfig,
  setConfig,
  getLogs,
  clearLogs,
  getPendingShareData,
  clearPendingShareData,
  type LogEntry,
  type ShareData,
} from './lib/storage';
import { forwardShare, type ForwardResult } from './lib/forwarder';

type View = 'config' | 'share' | 'logs';

const App: Component = () => {
  const [activeView, setActiveView] = createSignal<View>('config');
  const [relayUrl, setRelayUrl] = createSignal('');
  const [autoRelay, setAutoRelay] = createSignal(false);
  const [saved, setSaved] = createSignal(false);
  const [logs, setLogs] = createSignal<LogEntry[]>([]);
  const [pendingShare, setPendingShare] = createSignal<ShareData | null>(null);
  const [forwardStatus, setForwardStatus] = createSignal<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [forwardResult, setForwardResult] = createSignal<ForwardResult | null>(null);

  // Load initial data
  onMount(async () => {
    const config = getConfig();
    setRelayUrl(config.relayUrl);
    setAutoRelay(config.autoRelay);
    setLogs(getLogs());
    
    // Check for pending share data from URL
    const params = new URLSearchParams(window.location.search);
    if (params.get('share-target') === 'pending') {
      const shareData = await getPendingShareData();
      if (shareData) {
        setPendingShare(shareData);
        setActiveView('share');
        
        // Auto-relay if enabled and URL is configured
        if (config.autoRelay && config.relayUrl) {
          await performRelay(shareData, config.relayUrl);
        }
      }
      // Clean up URL
      window.history.replaceState({}, '', '/');
    }
  });

  // Refresh logs when switching to logs view
  createEffect(() => {
    if (activeView() === 'logs') {
      setLogs(getLogs());
    }
  });

  const handleSaveConfig = () => {
    setConfig({ relayUrl: relayUrl(), autoRelay: autoRelay() });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const performRelay = async (share: ShareData, url: string) => {
    setForwardStatus('pending');
    const result = await forwardShare(share, url);
    setForwardResult(result);
    setForwardStatus(result.success ? 'success' : 'error');
    
    // Clear pending share data
    await clearPendingShareData();
  };

  const handleForward = async () => {
    const share = pendingShare();
    const url = relayUrl();
    
    if (!share || !url) return;
    
    await performRelay(share, url);
  };

  const handleClearShare = async () => {
    await clearPendingShareData();
    setPendingShare(null);
    setForwardStatus('idle');
    setForwardResult(null);
  };

  const handleClearLogs = () => {
    clearLogs();
    setLogs([]);
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const truncate = (str: string, len: number) => {
    if (!str) return '';
    return str.length > len ? str.slice(0, len) + '...' : str;
  };

  return (
    <div class={styles.app}>
      <header class={styles.header}>
        <h1>WebShare Relay</h1>
        <p>Relay shared content to your API</p>
      </header>

      <nav class={styles.tabs}>
        <button
          class={`${styles.tab} ${activeView() === 'config' ? styles.tabActive : ''}`}
          onClick={() => setActiveView('config')}
        >
          Config
        </button>
        <button
          class={`${styles.tab} ${activeView() === 'share' ? styles.tabActive : ''}`}
          onClick={() => setActiveView('share')}
        >
          Share
          <Show when={pendingShare()}>
            {' '}•
          </Show>
        </button>
        <button
          class={`${styles.tab} ${activeView() === 'logs' ? styles.tabActive : ''}`}
          onClick={() => setActiveView('logs')}
        >
          Logs
        </button>
      </nav>

      <main class={styles.content}>
        {/* Config View */}
        <Show when={activeView() === 'config'}>
          <div class={styles.configView}>
            <div class={styles.inputGroup}>
              <label for="relayUrl">Relay URL</label>
              <input
                id="relayUrl"
                type="url"
                class={styles.input}
                placeholder="https://your-api.com/webhook"
                value={relayUrl()}
                onInput={(e) => setRelayUrl(e.currentTarget.value)}
              />
            </div>
            <div class={styles.checkboxGroup}>
              <input
                id="autoRelay"
                type="checkbox"
                class={styles.checkbox}
                checked={autoRelay()}
                onChange={(e) => setAutoRelay(e.currentTarget.checked)}
              />
              <label for="autoRelay">Auto-relay (skip confirmation)</label>
            </div>
            <button class={styles.button} onClick={handleSaveConfig}>
              Save Configuration
            </button>
            <Show when={saved()}>
              <p class={styles.savedMessage}>Configuration saved!</p>
            </Show>
            <Show when={!relayUrl()}>
              <p style={{ color: '#f59e0b', 'font-size': '0.875rem', 'text-align': 'center' }}>
                Configure a relay URL to enable sharing
              </p>
            </Show>
          </div>
        </Show>

        {/* Share Handler View */}
        <Show when={activeView() === 'share'}>
          <div class={styles.shareView}>
            <Show
              when={pendingShare()}
              fallback={
                <div class={styles.noShare}>
                  <p>No pending share</p>
                  <p style={{ 'font-size': '0.75rem' }}>
                    Share content from another app to see it here
                  </p>
                </div>
              }
            >
              {(share) => (
                <>
                  <div class={styles.shareCard}>
                    <h3>Shared Content</h3>
                    
                    <div class={styles.shareField}>
                      <div class={styles.shareLabel}>Title</div>
                      <div class={`${styles.shareValue} ${!share().title ? styles.shareValueEmpty : ''}`}>
                        {share().title || 'No title'}
                      </div>
                    </div>
                    
                    <div class={styles.shareField}>
                      <div class={styles.shareLabel}>Text</div>
                      <div class={`${styles.shareValue} ${!share().text ? styles.shareValueEmpty : ''}`}>
                        {share().text || 'No text'}
                      </div>
                    </div>
                    
                    <div class={styles.shareField}>
                      <div class={styles.shareLabel}>URL</div>
                      <div class={`${styles.shareValue} ${!share().url ? styles.shareValueEmpty : ''}`}>
                        {share().url || 'No URL'}
                      </div>
                    </div>
                    
                    <Show when={share().files && share().files.length > 0}>
                      <div class={styles.shareField}>
                        <div class={styles.shareLabel}>Files ({share().files.length})</div>
                        <div class={styles.filesList}>
                          <For each={share().files}>
                            {(file) => (
                              <div class={styles.fileItem}>
                                <span class={styles.fileIcon}>📎</span>
                                <span class={styles.fileName}>{file.name}</span>
                                <span class={styles.fileType}>{file.type}</span>
                              </div>
                            )}
                          </For>
                        </div>
                      </div>
                    </Show>
                  </div>

                  <Show when={forwardStatus() !== 'idle'}>
                    <div
                      class={`${styles.statusMessage} ${
                        forwardStatus() === 'success'
                          ? styles.statusSuccess
                          : forwardStatus() === 'error'
                          ? styles.statusError
                          : styles.statusPending
                      }`}
                    >
                      <Show when={forwardStatus() === 'pending'}>Forwarding...</Show>
                      <Show when={forwardStatus() === 'success'}>
                        Successfully forwarded!
                        <Show when={forwardResult()?.response}>
                          <br />
                          <small>Response: {truncate(forwardResult()?.response || '', 100)}</small>
                        </Show>
                      </Show>
                      <Show when={forwardStatus() === 'error'}>
                        Error: {forwardResult()?.error}
                      </Show>
                    </div>
                  </Show>

                  <Show when={!relayUrl()}>
                    <div class={`${styles.statusMessage} ${styles.statusError}`}>
                      No relay URL configured. Go to Config tab to set one.
                    </div>
                  </Show>

                  <Show when={forwardStatus() === 'idle'}>
                    <button
                      class={styles.button}
                      onClick={handleForward}
                      disabled={!relayUrl()}
                    >
                      Relay to {relayUrl() ? new URL(relayUrl()).hostname : 'API'}
                    </button>
                  </Show>

                  <button
                    class={`${styles.button} ${styles.buttonSecondary}`}
                    onClick={handleClearShare}
                  >
                    {forwardStatus() === 'idle' ? 'Discard' : 'Clear'}
                  </button>
                </>
              )}
            </Show>
          </div>
        </Show>

        {/* Logs View */}
        <Show when={activeView() === 'logs'}>
          <div class={styles.logsView}>
            <div class={styles.logsHeader}>
              <h2>Forward History</h2>
              <Show when={logs().length > 0}>
                <button
                  class={`${styles.button} ${styles.buttonDanger}`}
                  style={{ padding: '0.5rem 0.75rem', 'font-size': '0.75rem' }}
                  onClick={handleClearLogs}
                >
                  Clear
                </button>
              </Show>
            </div>

            <Show
              when={logs().length > 0}
              fallback={<div class={styles.noLogs}>No forwarding history yet</div>}
            >
              <div class={styles.logsList}>
                <For each={logs()}>
                  {(log) => (
                    <div
                      class={`${styles.logEntry} ${
                        log.status === 'success'
                          ? styles.logEntrySuccess
                          : log.status === 'error'
                          ? styles.logEntryError
                          : styles.logEntryPending
                      }`}
                    >
                      <div class={styles.logHeader}>
                        <span
                          class={`${styles.logStatus} ${
                            log.status === 'success'
                              ? styles.logStatusSuccess
                              : log.status === 'error'
                              ? styles.logStatusError
                              : styles.logStatusPending
                          }`}
                        >
                          {log.status}
                        </span>
                        <span class={styles.logTime}>{formatTime(log.timestamp)}</span>
                      </div>
                      <div class={styles.logPayload}>
                        <Show when={log.payload.title}>
                          <p><strong>Title:</strong> {truncate(log.payload.title, 50)}</p>
                        </Show>
                        <Show when={log.payload.text}>
                          <p><strong>Text:</strong> {truncate(log.payload.text, 100)}</p>
                        </Show>
                        <Show when={log.payload.url}>
                          <p><strong>URL:</strong> {truncate(log.payload.url, 50)}</p>
                        </Show>
                        <Show when={log.payload.filesCount > 0}>
                          <p><strong>Files:</strong> {log.payload.filesCount}</p>
                        </Show>
                      </div>
                      <Show when={log.error}>
                        <div class={styles.logResponse} style={{ color: '#f87171' }}>
                          Error: {log.error}
                        </div>
                      </Show>
                      <Show when={log.response && !log.error}>
                        <div class={styles.logResponse}>
                          Response: {truncate(log.response || '', 150)}
                        </div>
                      </Show>
                    </div>
                  )}
                </For>
              </div>
            </Show>
          </div>
        </Show>
      </main>
    </div>
  );
};

export default App;
