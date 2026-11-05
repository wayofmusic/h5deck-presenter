export const $ = selector => document.querySelector(selector);
export const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const mmss = ms => { const seconds = Math.max(0, Math.floor(ms / 1000)); return `${String(Math.floor(seconds / 60)).padStart(2,'0')}:${String(seconds % 60).padStart(2,'0')}`; };
export const readLocal = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
export const writeLocal = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} };
export async function api(url, data, headers = {}) {
  const response = await fetch(url, { cache: 'no-store', ...(data === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(data) }), ...(data === undefined ? { headers } : {}), signal: AbortSignal.timeout(5000) });
  const result = await response.json();
  if (!response.ok) throw Object.assign(Error(result.error || '连接失败'), { status: response.status });
  return result;
}

export class PresentationLink extends EventTarget {
  constructor({ local = false, preserveOnRestart = false } = {}) {
    super(); this.local = local; this.preserveOnRestart = preserveOnRestart; this.clientId = crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;
    this.sequence = 0; this.ready = false; this.busy = false; this.offset = 0; this.restarting = false; this.lastMessage = 0;
  }
  emit(type, detail) { this.dispatchEvent(new CustomEvent(type, { detail })); }
  async start() {
    this.manifest = await api('/api/manifest');
    if (this.local) this.capability = (await api('/api/local')).capability;
    this.receive(await api('/api/state'));
    this.events = new EventSource('/api/events');
    this.events.onmessage = event => { this.lastMessage = Date.now(); this.ready = !document.hidden; this.receive(JSON.parse(event.data)); };
    this.events.onerror = () => { this.ready = false; this.emit('connection', false); };
    document.addEventListener('visibilitychange', () => { this.ready = false; this.emit('connection', false); if (!document.hidden) this.refresh(); });
    window.addEventListener('offline', () => { this.ready = false; this.emit('connection', false); });
    window.addEventListener('online', () => this.refresh());
    setInterval(() => { if (Date.now() - this.lastMessage > 9000 && this.ready) { this.ready = false; this.emit('connection', false); } }, 1000);
  }
  receive(snapshot) {
    if (snapshot.deckId !== this.manifest.deckId || snapshot.deckRevision !== this.manifest.revision || (snapshot.libraryKey&&snapshot.libraryKey!==this.manifest.libraryKey)) { if (!this.reloading) { this.reloading = true; location.reload(); } return; }
    if (this.state && snapshot.serverEpoch !== this.state.serverEpoch && this.preserveOnRestart) {
      this.pendingState = snapshot; this.restarting = true; this.ready = false; this.emit('restart', snapshot); return;
    }
    if (this.state?.serverEpoch === snapshot.serverEpoch && this.state?.sessionId === snapshot.sessionId && snapshot.stateVersion < this.state.stateVersion) return;
    this.offset = snapshot.serverNow - Date.now(); this.state = snapshot;
    this.emit('state', snapshot); this.emit('connection', this.ready);
  }
  async refresh() {
    try { this.ready = this.events?.readyState === EventSource.OPEN; this.receive(await api('/api/state')); }
    catch { this.ready = false; this.emit('connection', false); }
  }
  async command(action, params = {}) {
    if (this.busy || !this.ready || this.restarting || document.hidden) return false;
    this.busy = true; this.emit('busy', true);
    const payload = { ...params, action, id: `${this.clientId}-${++this.sequence}`, clientId: this.clientId, sequence: this.sequence,
      sessionId: this.state.sessionId, serverEpoch: this.state.serverEpoch, deckRevision: this.state.deckRevision, sentAt: Date.now() + this.offset };
    try {
      const result = await api('/api/command', payload, this.capability ? { 'X-Local-Capability': this.capability } : {});
      this.receive(result.state); return true;
    } catch (error) {
      this.ready = false; this.emit('error', error); this.emit('connection', false);
      this.refresh(); return false;
    } finally { this.busy = false; this.emit('busy', false); }
  }
  async restore(snapshot) {
    this.capability = (await api('/api/local')).capability;
    const remote = await api('/api/state');
    this.state = remote; this.restarting = false; this.ready = true;
    return this.command('RESTORE_DISPLAY', { snapshot });
  }
  now() { return Date.now() + this.offset; }
}
