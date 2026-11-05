import { PresentationLink } from '../shared.mjs';
import { elapsed, transition } from '/core/state.mjs';
// The original renderer remains the content adapter. Every control enters the shared command path.
const link = new PresentationLink({ local: true, preserveOnRestart: true });
let viewState, offlineState, restoring = false, lastWidget = '';
function bindWidgets() {
  for (const [selector,key] of [['data-system','systemMode'],['data-cause','selectedCause'],['data-growth','selectedGrowth'],['data-scene','selectedScene']]) {
    document.querySelectorAll(`[${selector}]`).forEach(button => button.onclick = () => window.presenterDispatch('WIDGET_ACTION', { key, value: Number(button.getAttribute(selector)) }));
  }
}
function apply(state) {
  const index = SLIDES.findIndex(s => s.id === state.slideId);
  const widget = JSON.stringify(state.publicWidgetState);
  const redraw = !viewState || index !== current || widget !== lastWidget;
  const changedSlide = !viewState || state.slideId !== viewState.slideId;
  current = index;
  const w = state.publicWidgetState;
  systemMode = w.systemMode ?? 0; selectedCause = w.selectedCause ?? 0; selectedGrowth = w.selectedGrowth ?? 2; selectedScene = w.selectedScene ?? 0;
  if (changedSlide) { activePreset = SLIDES[index].preset || activePreset; activeStep = 0; }
  if (redraw) render(false);
  revealed = state.revealStep; updateReveal();
  bindWidgets();
  if (SLIDES[index].kind === 'causes' && w.selectedCause !== undefined) {
    $('#cause-popup').textContent = causeDetails[selectedCause]; $('#cause-popup').hidden = false;
  }
  $('#blackout').hidden = !state.blackout;
  timerElapsed = elapsed(state.presentationTimer, link.now()); timerStarted = performance.now(); timerRunning = state.presentationTimer.startedAt !== null;
  exerciseElapsed = elapsed(state.exerciseTimer, link.now()); exerciseStarted = performance.now(); exerciseRunning = state.exerciseTimer.startedAt !== null;
  tick(); viewState = structuredClone(state); lastWidget = widget;
  document.body.dataset.slideId = state.slideId; document.body.dataset.step = state.revealStep;
  window.presentationSnapshot = structuredClone(state);
}
window.presenterDispatch = async (action, params = {}) => {
  if (link.busy) return;
  if (link.ready && !offlineState && !link.restarting) return link.command(action, params);
  if (!viewState || !link.manifest) return;
  offlineState = transition(offlineState || viewState, { action, ...params }, link.manifest, link.now());
  apply(offlineState); toast('已进入单机接管。连接恢复后，按 C 以当前画面恢复遥控。');
};
async function resume() {
  if (!offlineState) return;
  const previous = structuredClone(offlineState);
  restoring = true;
  try {
    if (await link.restore(previous)) { offlineState = null; apply(link.state); toast('已以电脑当前画面恢复遥控。'); }
    else { offlineState = previous; apply(previous); }
  } catch { toast('尚未连接到本地服务，请稍后按 C 重试。'); }
  finally { restoring = false; }
}
link.addEventListener('state', e => { if (!offlineState || restoring) apply(e.detail); });
link.addEventListener('restart', () => { offlineState ||= structuredClone(viewState); });
link.addEventListener('error', e => toast(e.detail.message));
document.addEventListener('keydown', event => {
  if (document.querySelector('dialog[open]') || /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName) || event.ctrlKey || event.altKey || event.metaKey) return;
  const key = event.key.toLowerCase();
  let action, params = {};
  if (key === 'c') { event.preventDefault(); event.stopImmediatePropagation(); resume(); return; }
  if (viewState?.blackout) { action = 'SET_BLACKOUT'; params.value = false; }
  else if ([' ','arrowright','arrowdown','pagedown'].includes(key)) action = event.shiftKey ? 'NEXT_SLIDE' : 'NEXT_STEP';
  else if (['arrowleft','arrowup','pageup'].includes(key)) action = event.shiftKey ? 'PREV_SLIDE' : 'PREV_STEP';
  else if (key === 'home' || key === 'end') { action = 'GOTO_SLIDE'; params.slideId = key === 'home' ? SLIDES[0].id : SLIDES.at(-1).id; }
  else if (key === 'r') action = 'REPLAY';
  else if (key === 'b') { action = 'SET_BLACKOUT'; params.value = true; }
  else if (key === 't') action = viewState?.presentationTimer.startedAt === null ? 'TIMER_START' : 'TIMER_PAUSE';
  if (action) { event.preventDefault(); event.stopImmediatePropagation(); window.presenterDispatch(action,params); }
},true);
$('#blackout').onclick = () => window.presenterDispatch('SET_BLACKOUT',{value:false});
// Rebinding is also needed after local canvas edits redraw the slide.
const originalBindSlide = bindSlide;
bindSlide = function() { originalBindSlide(); bindWidgets(); };
try { await link.start(); apply(link.state); } catch { toast('连接服务失败。请保留此窗口，检查电脑设置页。'); }
