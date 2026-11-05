export function validateDeck(manifest, script) {
  if (manifest.schemaVersion !== 1 || !manifest.deckId || !manifest.revision || !manifest.slides?.length) throw Error('课件格式或版本无效');
  const ids = new Set();
  for (const slide of manifest.slides) {
    if (!slide.id || ids.has(slide.id)) throw Error('页面 ID 缺失或重复');
    ids.add(slide.id);
    if (!Number.isInteger(slide.steps) || slide.steps < 1 || !slide.title) throw Error('页面标题或步骤无效');
    if (!script[slide.id]?.paragraphs?.length || !script[slide.id].paragraphs.every(p => p.id && typeof p.text === 'string')) throw Error('缺少逐页讲稿');
  }
  return true;
}

export const initialState = (manifest, sessionId, serverEpoch) => ({
  sessionId, serverEpoch, stateVersion: 0, deckId: manifest.deckId, deckRevision: manifest.revision,
  slideId: manifest.slides[0].id, revealStep: 1, blackout: false,
  presentationTimer: { elapsedMs: 0, startedAt: null },
  exerciseTimer: { elapsedMs: 0, startedAt: null }, publicWidgetState: Object.fromEntries(Object.entries(manifest.widgets || {}).filter(([,rule])=>Object.hasOwn(rule,'initial')).map(([key,rule]) => [key,rule.initial]))
});

export function validWidgetValue(rule, value) {
  if (!rule || !['integer','number','boolean','string'].includes(rule.type)) return false;
  if (rule.type === 'integer' ? !Number.isSafeInteger(value) : typeof value !== rule.type) return false;
  if (typeof value === 'number' && (!Number.isFinite(value) || (rule.min !== undefined && value < rule.min) || (rule.max !== undefined && value > rule.max))) return false;
  if (typeof value === 'string' && value.length > (rule.maxLength || 2000)) return false;
  return !rule.enum || rule.enum.includes(value);
}

export function elapsed(timer, now = Date.now()) {
  return timer.elapsedMs + (timer.startedAt === null ? 0 : Math.max(0, now - timer.startedAt));
}

export function transition(previous, command, manifest, now = Date.now()) {
  const state = structuredClone(previous);
  const index = manifest.slides.findIndex(s => s.id === state.slideId);
  const slide = manifest.slides[index];
  const go = (n, end = false) => {
    const target = manifest.slides[Math.max(0, Math.min(manifest.slides.length - 1, n))];
    if (target.id !== state.slideId) { state.slideId = target.id; state.revealStep = end ? target.steps : 1; }
  };
  switch (command.action) {
    case 'NEXT_STEP': if (state.revealStep < slide.steps) state.revealStep++; else go(index + 1); break;
    case 'PREV_STEP': if (state.revealStep > 1) state.revealStep--; else go(index - 1, true); break;
    case 'NEXT_SLIDE': go(index + 1); break;
    case 'PREV_SLIDE': go(index - 1); break;
    case 'GOTO_SLIDE': {
      const n = manifest.slides.findIndex(s => s.id === command.slideId);
      if (n < 0) throw Error('页面不存在');
      go(n); state.revealStep = 1; break;
    }
    case 'REPLAY': state.revealStep = 1; break;
    case 'SET_BLACKOUT': if (typeof command.value !== 'boolean') throw Error('黑屏参数无效'); state.blackout = command.value; break;
    case 'TIMER_START': case 'TIMER_PAUSE': case 'TIMER_RESET':
    case 'EXERCISE_START': case 'EXERCISE_PAUSE': case 'EXERCISE_RESET': {
      const key = command.action.startsWith('TIMER_') ? 'presentationTimer' : 'exerciseTimer';
      const timer = state[key];
      const action = command.action.split('_')[1];
      if (action === 'START' && timer.startedAt === null) timer.startedAt = now;
      if (action === 'PAUSE') { timer.elapsedMs = elapsed(timer, now); timer.startedAt = null; }
      if (action === 'RESET') { timer.elapsedMs = 0; timer.startedAt = null; }
      break;
    }
    case 'WIDGET_ACTION': {
      if (!Object.hasOwn(manifest.widgets || {},command.key) || !validWidgetValue(manifest.widgets[command.key],command.value)) throw Error('组件动作无效');
      state.publicWidgetState[command.key] = command.value;
      break;
    }
    case 'RESTORE_DISPLAY': {
      const snapshot = command.snapshot;
      const target = manifest.slides.find(s => s.id === snapshot?.slideId);
      if (!target || !Number.isInteger(snapshot.revealStep) || snapshot.revealStep < 1 || snapshot.revealStep > target.steps) throw Error('接管状态无效');
      state.slideId = target.id; state.revealStep = snapshot.revealStep; state.blackout = !!snapshot.blackout;
      for (const key of ['presentationTimer', 'exerciseTimer']) {
        const ms = elapsed(snapshot[key] || { elapsedMs: 0, startedAt: null }, now);
        if (!Number.isFinite(ms) || ms < 0 || ms > 86400000 * 365) throw Error('计时状态无效');
        state[key] = { elapsedMs: ms, startedAt: snapshot[key]?.startedAt == null ? null : now };
      }
      for (const [key, value] of Object.entries(snapshot.publicWidgetState || {})) {
        if (Object.hasOwn(manifest.widgets || {},key) && validWidgetValue(manifest.widgets[key],value)) state.publicWidgetState[key] = value;
      }
      break;
    }
    default: throw Error('未知演示命令');
  }
  state.stateVersion++;
  return state;
}
