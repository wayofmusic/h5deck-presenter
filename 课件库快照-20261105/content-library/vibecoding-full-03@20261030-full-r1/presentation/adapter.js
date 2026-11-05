(()=>{
'use strict';
const {slides,star=[]}=window.COURSE,esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const quadButtons=mode=>star.map(q=>'<button class="'+(mode==='examples'?'example':'quadrant')+' q-'+q.id+'" data-widget="quadrant" data-value="'+q.id+'"><span class="q-letter">'+q.id+'</span><span class="q-body"><b>'+esc(q.title)+'</b><small>'+esc(q.name)+' · '+esc(q.tag)+'</small>'+(mode==='examples'?'<p>'+esc(q.example)+'</p>':'')+'</span></button>').join('');
const rows=s=>'<div class="rows">'+s.items.map((x,i)=>'<article data-step="'+(i+1)+'"><b>0'+(i+1)+'</b><div><h3>'+esc(x[0])+'</h3><p>'+esc(x[1])+'</p></div></article>').join('')+'</div>';
function render(s){
if(s.type==='hero')return '<h1>'+esc(s.headline[0])+'<br><span>'+esc(s.headline[1])+'</span></h1><p class="subtitle">'+esc(s.subtitle)+'</p>';
if(s.type==='rows')return rows(s);
if(s.type==='split')return '<div class="columns">'+[s.left,s.right].map((a,i)=>'<article class="panel" data-step="'+(i+1)+'"><h3>'+esc(a[0])+'</h3><p>'+esc(a[1])+'</p><strong>'+esc(a[2])+'</strong></article>').join('')+'</div>';
if(s.type==='star')return '<div class="star-layout"><div class="matrix"><span class="axis top">上限 · 面向期待</span><div class="quad-grid">'+quadButtons('matrix')+'</div><span class="axis bottom-axis">下限 · 改善既有问题</span><div class="axis horizontal"><span>个人 ←</span><span>→ 组织</span></div></div><aside class="selection"><span class="eyebrow">点击任一象限</span><h3 id="star-question"></h3><p id="star-detail" aria-live="polite"></p><small>象限帮助换角度，需求仍要验证。</small></aside></div>';
if(s.type==='examples')return '<div class="examples">'+quadButtons('examples')+'</div><p class="micro" id="example-reflection" aria-live="polite"></p><p class="micro">四例均为虚拟教学场景，尚未证明业务效果。</p>';
if(s.type==='practice')return '<div class="practice"><div class="practice-time"><b>'+esc(s.minutes)+'</b><span>分钟 · 建议练习时间</span></div><div><h3>'+esc(s.task)+'</h3><ol>'+s.items.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ol></div></div>';
if(s.type==='card')return '<dl class="scene-card">'+s.fields.map((a,i)=>'<div><dt><span>0'+(i+1)+'</span>'+esc(a[0])+'</dt><dd>'+esc(a[1])+'</dd></div>').join('')+'</dl>';
if(s.type==='prototype')return '<div class="prototype-layout"><div class="timer-preview"><p class="eyebrow">课堂环节计时器</p><div class="fake-input">设置秒数 <strong>60</strong><small>1—3600</small></div><b class="clock">01:00</b><div class="fake-actions"><span>开始</span><span>暂停</span><span>重置</span></div><p>准备好了，开始这一轮。</p></div><aside><h3>先看行为，<br>再改体验。</h3><p>打开随包HTML：<br>设置3秒 → 真实等待 → 检查提示</p><p>再检查暂停、重置和异常输入。</p></aside></div>';
if(s.type==='checklist')return '<div class="checklist">'+s.checks.map(([key,text])=>'<button class="check" data-widget="'+key+'" data-toggle="true"><span class="box" aria-hidden="true"></span><span>'+esc(text)+'</span></button>').join('')+'</div><p class="feedback" id="review-result" aria-live="polite"></p>';
 if(s.type==='flow')return '<div class="pill-row"><button class="choice" data-widget="scenario" data-value="success">成功</button><button class="choice" data-widget="scenario" data-value="empty">空列表</button><button class="choice" data-widget="scenario" data-value="denied">未登录</button><span class="micro">教学仿真 · 不发送业务请求</span></div><div class="rail">'+[['前端操作','查看收藏'],['API 约定','GET /favorites'],['后端检查','确认当前身份'],['数据查询','读取相应记录'],['前端反馈','呈现结果']].map((a,i)=>'<div data-step="'+(i+1)+'" data-rail="'+(i+1)+'"><b>0'+(i+1)+' '+a[0]+'</b><small>'+a[1]+'</small></div>').join('')+'</div><div class="flow-bottom"><div class="flow-status"><h3 id="flow-title"></h3><p id="flow-detail"></p></div><pre id="flow-receipt" aria-live="polite"></pre></div><p class="micro">按“下一步”沿链路展开；切换场景可以观察分支。</p>';

if(s.type==='quiz')return '<p class="question">'+esc(s.question)+'</p><div class="answers">'+s.answers.map(([value,text])=>'<button class="answer" data-widget="'+s.widget+'" data-value="'+value+'"><b>'+value.toUpperCase()+'</b><span>'+esc(text)+'</span></button>').join('')+'</div><p class="feedback" data-feedback="'+s.widget+'" aria-live="polite"></p>';
if(s.type==='grid')return '<div class="generic-grid">'+s.items.map((x,i)=>'<article data-step="'+Math.min(i+1,s.steps)+'"><span class="eyebrow">0'+(i+1)+'</span><h3>'+esc(x[0])+'</h3><p>'+esc(x[1])+'</p></article>').join('')+'</div>';
if(s.type==='prompt')return '<pre class="prompt-code">'+esc(s.prompt)+'</pre>';
if(s.type==='closing'&&s.items)return '<div class="rows">'+s.items.map((x,i)=>'<article><b>0'+(i+1)+'</b><div><h3>'+esc(x[0])+'</h3><p>'+esc(x[1])+'</p></div></article>').join('')+'</div>';
if(s.type==='closing')return '<div class="handoff"><span>场景卡与启动说明</span><b>＋</b><span>作品或具体卡点</span><b>＋</b><span>验证与修订记录</span></div><p class="bridge">下一节，从你的作品拆开<br><strong>前端 / API / 后端 / 数据</strong></p>';
throw Error('未实现的页面类型 '+s.type);
}
document.querySelector('#slides').innerHTML=slides.map((s,i)=>'<section class="slide '+(s.type==='hero'?'hero':'')+'" data-slide="'+s.id+'"'+(i?' hidden':'')+'><p class="label">VIBE CODING · 场景选择与最小项目 / '+String(i+1).padStart(2,'0')+'</p>'+(s.type==='hero'?'':'<h2>'+esc(s.title)+'</h2>')+'<div class="content">'+render(s)+'</div>'+(s.footer?'<p class="micro footnote">'+esc(s.footer)+'</p>':'')+'</section>').join('');
let current;
function updateFlow(state){
 const mode=state.publicWidgetState.scenario||'success',step=state.revealStep;
 document.querySelector('[data-rail="4"] small').textContent=mode==='denied'?'跳过：身份未通过':'读取相应记录';
 const titles=['用户请求查看收藏','按约定发起查询','服务端确认身份',mode==='denied'?'身份未通过：不查询私人记录':'读取当前用户的数据',mode==='denied'?'请先登录':mode==='empty'?'还没有收藏':'收藏列表已显示'];
 const details=['这里先接收一次操作，不预设请求一定成功。','本例按 GET /favorites 约定交流；这段交互只做仿真。',mode==='denied'?'未登录分支应返回明确失败，不相信浏览器自行声明的身份。':'通过身份检查后，按业务权限继续。',mode==='denied'?'本场景在检查阶段终止，不应去读取私人收藏。':mode==='empty'?'查询成功，结果是空列表。':'查询成功，找到示例记录。','成功、空结果与失败，各自有可理解的界面。'];
 document.querySelector('#flow-title').textContent=titles[step-1]||titles[0];
 document.querySelector('#flow-detail').textContent=details[step-1]||details[0];
 const result=mode==='denied'?'401\n{ "code": "LOGIN_REQUIRED" }':mode==='empty'?'200\n{ "items": [] }':'200\n{ "items": [{ "title": "调研清单" }] }';
 document.querySelector('#flow-receipt').textContent=step<5?'Mock 流程仿真\n当前展开到第 '+step+' / 5 步\n尚未呈现最终响应':result.replaceAll('\n','\n')+'\n（教学仿真数据）'.replaceAll('\n','\n');
 document.querySelectorAll('[data-rail]').forEach(n=>n.classList.toggle('current',Number(n.dataset.rail)===step));
}

PresenterContent.register({
getSlides:()=>slides.map(s=>({id:s.id,steps:s.steps})),
applySnapshot(state){
current=state;
if(state.slideId==='flow')updateFlow(state);
document.querySelectorAll('[data-slide]').forEach(n=>n.hidden=n.dataset.slide!==state.slideId);
const active=document.querySelector('[data-slide="'+state.slideId+'"]');
active.querySelectorAll('[data-step]').forEach(n=>{const hidden=Number(n.dataset.step)>state.revealStep;n.classList.toggle('pending',hidden);n.setAttribute('aria-hidden',String(hidden));});
document.body.dataset.slideId=state.slideId;document.body.dataset.step=state.revealStep;document.body.classList.toggle('dark-ui',slides.find(s=>s.id===state.slideId)?.type==='hero');
const i=slides.findIndex(s=>s.id===state.slideId);document.querySelector('#position').textContent=(i+1)+' / '+slides.length+' · '+state.revealStep+' / '+slides[i].steps+' 步';
document.querySelector('#previous').disabled=i===0&&state.revealStep===1;document.querySelector('#next').disabled=i===slides.length-1&&state.revealStep===slides[i].steps;
document.querySelectorAll('[data-widget]').forEach(n=>{const selected=n.dataset.toggle?!!state.publicWidgetState[n.dataset.widget]:state.publicWidgetState[n.dataset.widget]===n.dataset.value;n.setAttribute('aria-pressed',String(selected));if(n.dataset.toggle)n.querySelector('.box').textContent=selected?'✓':'';});
const q=star.find(x=>x.id===state.publicWidgetState.quadrant);if(document.querySelector('#star-question'))document.querySelector('#star-question').textContent=q?q.question:'先选一个角度';
if(document.querySelector('#star-detail'))document.querySelector('#star-detail').textContent=q?q.id+' · '+q.name+' / '+q.tag:'点选四个象限，试着说出自己的一个场景。';
if(document.querySelector('#example-reflection'))document.querySelector('#example-reflection').textContent=q?'当前角度：'+q.id+' · '+q.question:'试着点选一例，再替换成自己的经历。';
for(const s of slides.filter(s=>s.type==='quiz')){const value=state.publicWidgetState[s.widget]||'none',el=document.querySelector('[data-feedback="'+s.widget+'"]');el.textContent=s.feedback[value]||s.feedback.none;el.classList.toggle('best',value===s.correct);}
const checklist=slides.find(s=>s.type==='checklist');if(checklist){const total=checklist.checks.filter(([k])=>state.publicWidgetState[k]).length;document.querySelector('#review-result').textContent='自检 '+total+' / '+checklist.checks.length+' 项 · 需实际核对，留下证据或下一步。';}
}
});
document.addEventListener('click',e=>{const n=e.target.closest('[data-widget]');if(!n||!current)return;PresenterContent.request('WIDGET_ACTION',{key:n.dataset.widget,value:n.dataset.toggle?!current.publicWidgetState[n.dataset.widget]:n.dataset.value});});
document.addEventListener('keydown',e=>{if(e.target.closest?.('[data-widget]')&&(e.key===' '||e.key==='Enter')){e.preventDefault();e.stopPropagation();e.target.closest('[data-widget]').click();}},true);
document.querySelector('#previous').onclick=()=>PresenterContent.request('PREV_STEP');document.querySelector('#next').onclick=()=>PresenterContent.request('NEXT_STEP');
})();