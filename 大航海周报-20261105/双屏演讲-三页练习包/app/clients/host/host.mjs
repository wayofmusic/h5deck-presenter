import { PresentationLink, api, $, esc, mmss } from '../shared.mjs';
import { elapsed } from '/core/state.mjs';
const link = new PresentationLink({ local: true });
let hostInfo;
let hostRequest = 0;
const error = e => { $('#error').textContent = e.message; };
async function loadHost() {
  const request = ++hostRequest;
  const info = await api(`/api/host${$('#network').value ? '?address=' + encodeURIComponent($('#network').value) : ''}`);
  if (request !== hostRequest) return;
  hostInfo = info;
  const selected = hostInfo.address;
  $('#network').innerHTML = hostInfo.networks.length ? hostInfo.networks.map(n => `<option value="${esc(n.address)}">${esc(n.name)} · ${esc(n.address)}${n.virtual ? '（虚拟网卡）' : ''}</option>`).join('') : '<option value="127.0.0.1">未发现局域网网卡 · 仅本机</option>';
  $('#network').value = selected;
  $('#deck').innerHTML = hostInfo.decks.map(d => `<option value="${esc(d.id)}">${esc(d.title)}${d.source==='package'?' · v'+esc(d.revision):''}</option>`).join('');
  $('#deck').value = link.manifest.libraryKey||link.manifest.deckId;
  $('#library-count').textContent=`课件库共 ${hostInfo.decks.length} 套，其中 ${hostInfo.decks.filter(d=>d.source==='package').length} 套来自内容包`;
  $('#library-warning').hidden=!hostInfo.warnings?.length;$('#library-warning').textContent=(hostInfo.warnings||[]).join('；');
  $('#preview-title').textContent = link.manifest.title;
  $('#preview-meta').textContent = `${link.manifest.speaker.name} / ${link.manifest.slides.length} 页 / 16:9`;
  $('#qr').innerHTML = hostInfo.qr || '<p class="hint">手机已配对。<br>更换手机请点重新配对。</p>';
  $('#pair-link').textContent = hostInfo.link || '';
  $('#pair-link').href = hostInfo.link || '#';
  $('#copy-link').disabled = !hostInfo.link;
  $('#network-hint').textContent = hostInfo.networks.some(n => n.address === selected && n.virtual) ? '当前选择了虚拟网卡，手机通常无法访问。建议切换到 Wi-Fi 或热点网卡。' : '不会自动修改电脑防火墙或网络设置。';
  render();
}
function render() {
  const s = link.state; if (!s) return;
  const index = link.manifest.slides.findIndex(p => p.id === s.slideId);
  $('#connection').textContent = link.ready ? '本地服务已连接' : '正在重新连接';
  $('#connection').className = `pill ${link.ready ? 'online' : 'offline'}`;
  $('#current-slide').textContent = `当前第 ${index+1} / ${link.manifest.slides.length} 页 · ${s.revealStep} / ${link.manifest.slides[index].steps} 步`;
  $('#blackout').textContent = s.blackout ? '恢复画面' : '黑屏';
  $('#timer-toggle').textContent = s.presentationTimer.startedAt === null ? '开始计时' : '暂停计时';
  document.querySelectorAll('[data-command],#blackout,#timer-toggle').forEach(b => b.disabled = !link.ready || link.busy);
  if (s.controllerPaired) $('#pair-status').textContent = s.controllerOnline ? '主控手机已连接 · 可以开始演讲' : '手机已配对 · 等待重新连接';
  else $('#pair-status').textContent = hostInfo?.link ? (Date.now() < hostInfo.expiresAt ? `配对码剩余 ${Math.max(0,Math.ceil((hostInfo.expiresAt-Date.now())/1000))} 秒` : '配对码已过期，请点重新配对') : '遥控已结束，可重新配对';
}
link.addEventListener('state', () => { render(); if (link.state.controllerPaired && hostInfo?.link) loadHost().catch(error); });
link.addEventListener('connection', render); link.addEventListener('busy', render); link.addEventListener('error', e => error(e.detail));
document.querySelectorAll('[data-command]').forEach(b => b.onclick = () => link.command(b.dataset.command));
$('#blackout').onclick = () => link.command('SET_BLACKOUT', { value: !link.state.blackout });
$('#timer-toggle').onclick = () => link.command(link.state.presentationTimer.startedAt === null ? 'TIMER_START' : 'TIMER_PAUSE');
$('#network').onchange = () => loadHost().catch(error);
$('#refresh-pair').onclick = async () => { try { await api('/api/host/pair', {}); await loadHost(); } catch(e) { error(e); } };
$('#copy-link').onclick = async () => { try { await navigator.clipboard.writeText(hostInfo.link); $('#error').textContent = '配对地址已复制。'; } catch { $('#error').textContent = '请手动复制二维码下方的配对地址。'; } };
$('#deck').onchange = async () => { if ($('#deck').value === (link.manifest.libraryKey||link.manifest.deckId)) return; try { await api('/api/host/deck', { deckId: $('#deck').value }); } catch(e) { error(e); } };
$('#import-button').onclick=()=>$('#import-input').click();
$('#import-input').onchange=async event=>{
  const file=event.target.files?.[0];if(!file)return;
  $('#import-button').disabled=true;$('#import-status').textContent='正在检查并导入内容包…';
  try {
    const response=await fetch('/api/host/import',{method:'POST',headers:{'Content-Type':'application/octet-stream'},body:file,signal:AbortSignal.timeout(60000)});
    const result=await response.json();if(!response.ok)throw Error(result.error||'导入失败');
    await loadHost();$('#import-status').textContent=`已导入「${result.title}」${result.slides} 页，请在当前课件中选择。`;
  }catch(e){$('#import-status').textContent=`导入未完成：${e.message}`;}
  finally{$('#import-button').disabled=false;event.target.value='';}
};
$('#end-session').onclick = async () => { try { await api('/api/host/end', {}); await loadHost(); } catch(e) { error(e); } };
setInterval(() => { render(); if (link.state) $('#timer').textContent = mmss(elapsed(link.state.presentationTimer, link.now())); }, 500);
try { await link.start(); await loadHost(); } catch(e) { error(e); }
