import { PresentationLink, api, $, esc, mmss, readLocal, writeLocal } from '../shared.mjs';
import { elapsed } from '/core/state.mjs';
const link = new PresentationLink({ local: location.hostname === 'localhost' || location.hostname === '127.0.0.1' });
let script, pageId, fontSize = readLocal('presenter:fontSize', 22), autoScroll = false, lastFrame = 0, scrollYFloat = 0;
let wakeLock, wantWake = false;
const key = id => `presenter:read:${link.manifest.deckId}:${link.manifest.revision}:${id}`;
const toast = message => { $('#toast').textContent = message; $('#toast').hidden = false; clearTimeout(toast.id); toast.id = setTimeout(() => $('#toast').hidden = true, 3500); };
function setAuto(value) { autoScroll = value; scrollYFloat = window.scrollY; $('#auto-scroll').textContent = value ? '暂停滚动' : '自动滚动'; $('#auto-scroll').classList.toggle('primary', value); }
function controls() {
  const authorized = link.local || link.state?.canControl;
  const usable = link.ready && authorized;
  $('#connection').textContent = usable ? '已同步' : authorized ? '重连中' : '未配对';
  $('#connection').className = `pill ${usable ? 'online' : 'offline'}`;
  $('#disconnect').hidden = usable || !authorized;
  $('#disconnect').textContent = link.busy ? '正在确认操作…' : '连接中断，翻页已暂停。恢复后自动同步当前页。';
  document.querySelectorAll('[data-command],#blackout,#timer-toggle,#exercise-toggle,.jump').forEach(b => b.disabled = !usable || link.busy);
  if (!usable) setAuto(false);
  if (link.state && !authorized) {
    script = null; $('#script').textContent = ''; $('#cue').textContent = ''; $('#slide-title').textContent = '';
    $('#reading').hidden = true; $('#controls').hidden = true; $('#pair-empty').hidden = false;
    $('#pair-message').textContent = '请扫描电脑设置页上的配对二维码。若已撤销配对，请使用新二维码连接。';
    document.querySelectorAll('dialog[open]').forEach(d => d.close());
  }
}
function render(state) {
  controls(); if (!script) return;
  renderClocks();
  const index = link.manifest.slides.findIndex(p => p.id === state.slideId), slide = link.manifest.slides[index];
  $('#deck-title').textContent = link.manifest.title;
  $('#page').textContent = `${String(index+1).padStart(2,'0')} / ${link.manifest.slides.length}`;
  $('#chapter').textContent = link.manifest.chapters[slide.chapter][0];
  $('#step').textContent = `${state.revealStep} / ${slide.steps} 步`;
  $('#blackout').textContent = state.blackout ? '恢复画面' : '黑屏';
  $('#timer-toggle').textContent = state.presentationTimer.startedAt === null ? '开始计时' : '暂停计时';
  $('#exercise-toggle').textContent = state.exerciseTimer.startedAt === null ? '开始练习' : '暂停练习';
  document.querySelectorAll('.jump').forEach(b => b.classList.toggle('current', b.dataset.id === state.slideId));
  if (pageId === state.slideId) return;
  if (pageId) writeLocal(key(pageId), window.scrollY);
  pageId = state.slideId; setAuto(false);
  const notes = script.slides[pageId];
  $('#slide-title').textContent = slide.title; $('#cue').textContent = notes.cue;
  $('#script').innerHTML = notes.paragraphs.map(p => `<p data-paragraph="${esc(p.id)}">${esc(p.text)}</p>`).join('');
  $('#page-duration').textContent = `本页计划 ${mmss(slide.seconds * 1000)} · 按实际讲述节奏控制`;
  $('#next-title').textContent = link.manifest.slides[index+1]?.title.replaceAll('\n',' ') || '本场演讲结束';
  requestAnimationFrame(() => window.scrollTo({ top: readLocal(key(pageId), 0), behavior: 'instant' }));
}
async function loadScript() {
  script = await api('/api/script', undefined, link.capability ? { 'X-Local-Capability': link.capability } : {});
  if (script.deckId !== link.manifest.deckId || script.revision !== link.manifest.revision) throw Error('讲稿版本与课件不一致');
  $('#pair-empty').hidden = true; $('#reading').hidden = false; $('#controls').hidden = false;
  $('#chapter-list').innerHTML = link.manifest.chapters.map((c,i) => `<section class="chapter-group"><h3>${esc(c[0])}</h3>${link.manifest.slides.map((s,n) => s.chapter === i ? `<button class="jump" data-id="${esc(s.id)}"><span>${String(n+1).padStart(2,'0')}</span> ${esc(s.title.replaceAll('\n',' '))}</button>` : '').join('')}</section>`).join('');
  document.querySelectorAll('.jump').forEach(b => b.onclick = async () => { if (await link.command('GOTO_SLIDE', { slideId: b.dataset.id })) $('#chapters').close(); });
  render(link.state);
}
link.addEventListener('state', event => render(event.detail));
link.addEventListener('connection', controls); link.addEventListener('busy', controls);
link.addEventListener('error', e => toast(e.detail.message));
document.querySelectorAll('[data-command]').forEach(b => b.onclick = () => link.command(b.dataset.command));
$('#blackout').onclick = () => link.command('SET_BLACKOUT', { value: !link.state.blackout });
$('#timer-toggle').onclick = () => link.command(link.state.presentationTimer.startedAt === null ? 'TIMER_START' : 'TIMER_PAUSE');
$('#exercise-toggle').onclick = () => link.command(link.state.exerciseTimer.startedAt === null ? 'EXERCISE_START' : 'EXERCISE_PAUSE');
$('#chapters-open').onclick = () => $('#chapters').showModal(); $('#tools-open').onclick = () => $('#tools').showModal();
document.querySelectorAll('[data-close]').forEach(b => b.onclick = () => b.closest('dialog').close());
const applyFont = () => { fontSize = Math.min(34,Math.max(16,fontSize)); $('#script').style.fontSize = `${fontSize}px`; writeLocal('presenter:fontSize',fontSize); };
$('#font-minus').onclick = () => { fontSize -= 2; applyFont(); }; $('#font-plus').onclick = () => { fontSize += 2; applyFont(); }; applyFont();
$('#auto-scroll').onclick = () => setAuto(!autoScroll);
$('#scroll-speed').oninput = () => $('#speed-label').textContent = `${$('#scroll-speed').value} px/s`;
for (const name of ['touchstart','wheel','pointerdown']) document.addEventListener(name, e => { if (!e.target.closest('#auto-scroll')) setAuto(false); }, { passive:true });
document.addEventListener('keydown', e => { if (['ArrowDown','ArrowUp','PageDown','PageUp',' '].includes(e.key)) setAuto(false); });
window.addEventListener('scroll', () => { if (pageId) writeLocal(key(pageId),window.scrollY); }, { passive:true });
function frame(time) {
  if (autoScroll && link.ready && !document.hidden && !document.querySelector('dialog[open]')) {
    scrollYFloat += Math.min(100,time-lastFrame)/1000 * Number($('#scroll-speed').value); window.scrollTo(0,scrollYFloat);
    if (window.scrollY + innerHeight >= document.documentElement.scrollHeight - 2) setAuto(false);
  }
  lastFrame = time; requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
async function requestWake() {
  if (!navigator.wakeLock) { toast('当前浏览器连接不支持常亮，请在手机设置中延长自动锁屏。'); return; }
  try { wakeLock = await navigator.wakeLock.request('screen'); $('#wake-lock').textContent = '屏幕常亮已开启'; wakeLock.addEventListener('release', () => $('#wake-lock').textContent = '常亮已释放，点此恢复'); }
  catch { toast('系统未允许常亮，可以继续看稿与翻页。'); }
}
$('#wake-lock').onclick = () => { wantWake = true; requestWake(); };
document.addEventListener('visibilitychange', () => { if (!document.hidden && wantWake) requestWake(); });
$('#fullscreen').onclick = async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); } catch { toast('浏览器未允许全屏，可以继续使用。'); } };
$('#retry').onclick = () => location.reload();
window.addEventListener('hashchange', () => { if (new URLSearchParams(location.hash.slice(1)).has('pair')) location.reload(); });
function renderClocks() { if (link.state) { $('#timer').textContent = mmss(elapsed(link.state.presentationTimer,link.now())); $('#exercise-clock').textContent = mmss(300000-elapsed(link.state.exerciseTimer,link.now())); } }
setInterval(renderClocks, 250);
try {
  const ticket = new URLSearchParams(location.hash.slice(1)).get('pair');
  if (ticket) { history.replaceState(null,'',location.pathname); await api('/api/pair', { ticket }); }
  await link.start();
  if (link.local || link.state.canControl) await loadScript(); else controls();
} catch (error) { $('#pair-empty').hidden = false; $('#pair-message').textContent = error.message; $('#reading').hidden = true; $('#controls').hidden = true; }
