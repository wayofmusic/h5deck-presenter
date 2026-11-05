import { PresentationLink, $, esc } from '../shared.mjs';
import { transition } from '/core/state.mjs';
const link = new PresentationLink({ local:true, preserveOnRestart:true });
let shown, offline;
function render(s) {
  shown = s; const slide = link.manifest.slides.find(p => p.id === s.slideId);
  $('#speaker').textContent = link.manifest.speaker.name; $('#title').textContent = slide.title;
  $('#items').innerHTML = (slide.items || []).map((text,i) => `<p class="item" ${i >= s.revealStep ? 'hidden' : ''}>${esc(text)}</p>`).join('');
  $('#blackout').hidden = !s.blackout;
  document.body.dataset.slideId = s.slideId; document.body.dataset.step = s.revealStep;
  window.presentationSnapshot = structuredClone(s);
}
function dispatch(action,params = {}) {
  if (link.busy) return;
  if (link.ready && !offline) return link.command(action,params);
  if (shown) { offline = transition(offline || shown,{action,...params},link.manifest,link.now()); render(offline); }
}
link.addEventListener('state',e => { if (!offline) render(e.detail); });
link.addEventListener('restart',() => offline ||= structuredClone(shown));
document.addEventListener('keydown',async e => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key.toLowerCase() === 'c' && offline) { const snapshot = offline; if (await link.restore(snapshot)) { offline = null; render(link.state); } return; }
  if (e.key.toLowerCase() === 'f') { try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); } catch {} return; }
  if (shown?.blackout) { e.preventDefault(); dispatch('SET_BLACKOUT',{value:false}); return; }
  if (['ArrowRight','ArrowDown','PageDown',' '].includes(e.key)) { e.preventDefault(); dispatch(e.shiftKey?'NEXT_SLIDE':'NEXT_STEP'); }
  if (['ArrowLeft','ArrowUp','PageUp'].includes(e.key)) { e.preventDefault(); dispatch(e.shiftKey?'PREV_SLIDE':'PREV_STEP'); }
  if (e.key.toLowerCase() === 'b') dispatch('SET_BLACKOUT',{value:true});
});
$('#blackout').onclick = () => dispatch('SET_BLACKOUT',{value:false});
await link.start(); render(link.state);
