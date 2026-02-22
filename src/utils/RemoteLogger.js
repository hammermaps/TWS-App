// RemoteLogger: fängt console-Methoden, window.onerror und unhandledrejection ab
// und sendet Logs asynchron an das Backend (/api.php/logs/send)

const RemoteLogger = (function() {
  // Allow overriding base URL via env
  const configuredBase = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_REMOTE_LOG_URL)
    ? import.meta.env.VITE_REMOTE_LOG_URL
    : 'https://wls.dk-automation.de';

  // Enable remote logging only when explicitly enabled via env (default: false in dev)
  const remoteEnabled = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_REMOTE_LOG_ENABLE) === 'true';

  // In development use the Vite proxy path '/api/logs' so the dev server
  // forwards the request to the real backend (/logs). In production POST directly
  // to the controller path '/logs'.
  const isDev = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV;
  // Use trailing slash to avoid backend redirect to a slash-appended location
  // Use '/logs/send/' — backend expects the send action at /logs/send
  const endpoint = isDev ? '/api/logs/send' : configuredBase.replace(/\/$/, '') + '/logs/send';

  // Optional API key coming from Vite env: set VITE_REMOTE_LOG_API_KEY in .env to include header
  const apiKey = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_REMOTE_LOG_API_KEY)
    ? import.meta.env.VITE_REMOTE_LOG_API_KEY
    : null;

  // Simple 403 backoff: if the server returns repeated 403s, pause sending to avoid flood
  let consecutive403 = 0;
  const MAX_403_BEFORE_PAUSE = 5;
  const PAUSE_AFTER_403_MS = 5 * 60 * 1000; // 5 minutes
  let pausedUntil = 0;

  // Retry / Queue limits to avoid endless loops
  const MAX_RETRY = 3; // number of attempts per entry before dropping
  const BACKOFF_BASE_MS = 1000; // base backoff in ms
  const MAX_QUEUE = 1000; // max queued entries - drop oldest beyond this

  // Einfaches Rate-Limit / Queue
  const queue = [];
  let sending = false;
  const MAX_BATCH = 50;
  const INTERVAL_MS = 1000; // Batch-Intervall

  // Simple rate limiter / circuit-breaker: limit number of send attempts in a time window
  const SEND_WINDOW_MS = 60 * 1000; // 1 minute
  const MAX_SENDS_PER_WINDOW = 15; // if exceeded, pause sending for PAUSE_AFTER_403_MS
  const sendTimestamps = [];

  function pruneSendTimestamps() {
    const cutoff = Date.now() - SEND_WINDOW_MS;
    while (sendTimestamps.length && sendTimestamps[0] < cutoff) sendTimestamps.shift();
  }

  function scheduleRetry(entry) {
    try {
      entry.__retryCount = (entry.__retryCount || 0) + 1;
      if (entry.__retryCount > MAX_RETRY) {
        originalConsole.warn && originalConsole.warn('RemoteLogger: dropping entry after max retries', { message: entry.message, retryCount: entry.__retryCount });
        return;
      }
      const delay = BACKOFF_BASE_MS * Math.pow(2, entry.__retryCount - 1);
      setTimeout(() => {
        try {
          if (queue.length >= MAX_QUEUE) {
            // drop oldest to make room
            queue.shift();
          }
          queue.push(entry);
        } catch (e) { /* ignore */ }
      }, delay);
    } catch (e) { /* ignore */ }
  }

  function sendBatch() {
    if (!remoteEnabled) return; // remote logging disabled via env
    if (Date.now() < pausedUntil) {
      // still paused due to repeated 403s or circuit-breaker
      return;
    }
    // circuit-breaker: limit sends per window
    pruneSendTimestamps();
    if (sendTimestamps.length >= MAX_SENDS_PER_WINDOW) {
      // too many sends in short time -> pause to avoid flood/loop
      pausedUntil = Date.now() + PAUSE_AFTER_403_MS;
      originalConsole.warn && originalConsole.warn('RemoteLogger: too many send attempts, pausing remote logging temporarily');
      return;
    }

    if (sending || queue.length === 0) return;
    sending = true;
    // record this send attempt
    sendTimestamps.push(Date.now());

    const batch = queue.splice(0, MAX_BATCH);
    // Use redirect: 'manual' to avoid the browser following cross-origin redirects.
    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) headers['X-LOG-API-KEY'] = apiKey;

    // Use originalConsole to avoid retriggering the proxies
    originalConsole.debug && originalConsole.debug('RemoteLogger: sending batch', { endpoint, batchLength: batch.length, headers: !!apiKey });

    fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({ level: 'info', message: 'client-batch', context: { entries: batch, source: 'client-batch' }, timestamp: Date.now() }),
    }).then(response => {
      if (response.status >= 200 && response.status < 300) {
        // success
        consecutive403 = 0;
      } else if (response.status >= 300 && response.status < 400) {
        originalConsole.warn && originalConsole.warn('RemoteLogger: backend returned redirect for batch, not following (handled by proxy)');
      } else if (response.status === 403) {
        // Forbidden — likely missing/invalid API key or server-side restriction.
        consecutive403++;
        originalConsole.error && originalConsole.error('RemoteLogger: 403 Forbidden from logging endpoint — dropping batch (check API key/server access).', { consecutive403 });
        if (consecutive403 >= MAX_403_BEFORE_PAUSE) {
          pausedUntil = Date.now() + PAUSE_AFTER_403_MS;
          originalConsole.warn && originalConsole.warn(`RemoteLogger: pausing remote logging until ${new Date(pausedUntil).toISOString()} due to repeated 403 responses`);
        }
        // do NOT requeue to avoid infinite retry loop on 403
      } else {
        // Non-OK -> schedule retries with backoff instead of immediate requeue
        originalConsole.warn && originalConsole.warn('RemoteLogger: non-ok response, scheduling retries', response.status);
        batch.forEach(entry => scheduleRetry(entry));
      }
    }).catch((err) => {
      // Network or other error -> schedule retries with backoff
      originalConsole.warn && originalConsole.warn('RemoteLogger: fetch error, scheduling retries', err && err.message);
      batch.forEach(entry => scheduleRetry(entry));
    }).finally(() => { sending = false; });
  }

  setInterval(sendBatch, INTERVAL_MS);

  function enqueue(entry) {
    try {
      // initialize internal retry counter
      entry.__retryCount = entry.__retryCount || 0;
      if (queue.length >= MAX_QUEUE) {
        // drop oldest to prevent unbounded growth
        queue.shift();
      }
      queue.push(entry);
      if (queue.length >= MAX_BATCH) sendBatch();
    } catch (e) {
      // ignore
    }
  }

  function safeStringify(obj) {
    try { return JSON.stringify(obj); }
    catch (e) {
      try { return JSON.stringify(Object.getOwnPropertyNames(obj)); } catch (e2) { return String(obj); }
    }
  }

  // wrapper für console
  const levels = {
    log: 'info',
    info: 'info',
    warn: 'warning',
    error: 'error',
    debug: 'debug'
  };

  const originalConsole = {
    log: console.log.bind(console),
    info: console.info.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
    debug: console.debug ? console.debug.bind(console) : console.log.bind(console)
  };

  function createProxy(method) {
    return function(...args) {
      try {
        originalConsole[method](...args);
      } catch (e) {}
      const message = args.map(a => {
        if (typeof a === 'string') return a;
        return safeStringify(a);
      }).join(' ');
      const entry = { level: levels[method] || 'info', message, context: { args }, timestamp: Date.now() };
      // If it's an error, enqueue and try to send immediately (but do not unshift)
      if (entry.level === 'error') {
        enqueue(entry);
        // attempt immediate send
        try { sendBatch(); } catch (e) { /* ignore */ }
      } else {
        enqueue(entry);
      }
    }
  }

  // override console methods
  console.log = createProxy('log');
  console.info = createProxy('info');
  console.warn = createProxy('warn');
  console.error = createProxy('error');
  console.debug = createProxy('debug');

  // global error handler
  window.addEventListener('error', function(ev) {
    try {
      const err = ev.error || {};
      const message = ev.message || (err && err.message) || 'window.error';
      enqueue({ level: 'error', message, context: { filename: ev.filename, lineno: ev.lineno, colno: ev.colno, stack: err.stack || null }, timestamp: Date.now() });
    } catch (e) {}
  });

  // unhandled promise rejections
  window.addEventListener('unhandledrejection', function(ev) {
    try {
      const reason = ev.reason;
      enqueue({ level: 'error', message: 'unhandledrejection', context: { reason }, timestamp: Date.now() });
    } catch (e) {}
  });

  // manual logging API
  return {
    log(level, message, context = {}) {
      enqueue({ level, message, context, timestamp: Date.now() });
    },
    flush() {
      return new Promise((resolve) => {
        // trigger immediate send
        const attempt = () => {
          if (sending) {
            setTimeout(attempt, 200);
            return;
          }
          if (queue.length === 0) return resolve();
          sendBatch();
          setTimeout(resolve, 500);
        }
        attempt();
      });
    }
  }
})();

export default RemoteLogger;

