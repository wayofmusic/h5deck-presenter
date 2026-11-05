(function(){
'use strict';
const slides=window.COURSE.slides;
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const arrow='<svg class="arrow" viewBox="0 0 32 20" aria-hidden="true"><path d="M1 10h27M21 3l7 7-7 7" stroke-width="2"/></svg>';
const checked='<svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true"><path d="m3 8 3 3 7-7" stroke="currentColor" stroke-width="2" fill="none"/></svg>';
function rows(items){return '<div class="rows">'+items.map((item,i)=>'<article data-step="'+(i+1)+'"><b>0'+(i+1)+'</b><div><h3>'+esc(item[0])+'</h3><p>'+esc(item[1])+'</p></div></article>').join('')+'</div>';}
function inner(s){
 if(s.type==='hero')return '<h1>让页面，<br><span>真正办事。</span></h1><p class="subtitle">'+esc(s.subtitle)+'</p><p class="micro">用一个收藏列表，学会解释、判断与验证。</p>';
 if(s.type==='points')return rows(s.items);
 if(s.type==='roles')return '<div class="roles"><div class="node" data-step="1"><small>浏览器</small><b>前端</b><p>用户操作<br>交互与展示</p></div><div class="connector" data-step="2">API 约定'+arrow+'<small>输入 / 输出 / 失败</small></div><div class="node" data-step="2"><small>可信服务端</small><b>后端</b><p>业务规则<br>身份与权限检查</p></div><div class="connector" data-step="3">'+arrow+'</div><div class="node" data-step="3"><small>常见存储方案</small><b>数据库</b><p>保存状态<br>按条件查询</p></div></div><p class="micro">这是常见应用的教学示意；API 是约定，数据库不是每个网页的必选独立服务器。</p>';
 if(s.type==='split')return '<div class="columns"><div class="panel" data-step="1"><h3>'+esc(s.left[0])+'</h3><p>'+esc(s.left[1])+'</p><p>'+esc(s.left[2])+'</p></div><div class="panel red" data-step="2"><h3>'+esc(s.right[0])+'</h3><p>'+esc(s.right[1])+'</p><p><strong>'+esc(s.right[2])+'</strong></p></div></div><p class="micro">不要把需要保密的 API Key 放进公开网页。后端也需要正确设计和校验。</p>';
 if(s.type==='contract')return '<p class="two-line">教学场景：查看当前登录用户的收藏列表。</p><div class="contract"><article data-step="1"><h3>01 输入</h3><code>GET /favorites\n身份：已登录会话</code><p>不要靠随意填写用户 ID 冒充身份。</p></article><article data-step="2"><h3>02 正常输出</h3><code>200\n{ items: [...] }</code><p>没有记录也可以成功：items 为 []。</p></article><article data-step="3"><h3>03 失败约定</h3><code>401\n{ code: "LOGIN_REQUIRED" }</code><p>本例约定；界面给出登录指引。</p></article></div><p class="micro">这是最小接口约定；真实项目还需定义权限、分页等业务细节。</p>';
 if(s.type==='paths')return '<div class="path" data-step="1"><h3>允许浏览器访问的接口</h3><p>浏览器 → API 服务</p><small>核对同源 / CORS、服务要求与鉴权方式。</small></div><div class="path" data-step="2"><h3>需要保密凭据或集中规则</h3><p>浏览器 → 自己的服务端 → API 服务</p><small>保密凭据留在可信端；仍需检查权限。</small></div><p class="micro">某产品预览沙箱不能联网，不代表所有网页不能联网。不要关闭浏览器保护来“解决”接入问题。</p>';
 if(s.type==='mock')return '<div class="columns"><div class="panel" data-step="1"><h3>开发替身</h3><p>数组、模拟接口、模拟异常。</p><p>帮你提前验证交互与约定。</p><p><strong>明确标注：Mock / 仿真。</strong></p></div><div class="panel red" data-step="2"><h3>真实验证</h3><p>数据有来源，实现能核对。</p><p>变化和失败符合业务设计。</p><p><strong>一个 200 响应并不能证明全部。</strong></p></div></div>';
 if(s.type==='flow')return '<div class="pill-row"><button class="choice" data-widget="scenario" data-value="success">成功</button><button class="choice" data-widget="scenario" data-value="empty">空列表</button><button class="choice" data-widget="scenario" data-value="denied">未登录</button><span class="micro">教学仿真 · 不发送业务请求</span></div><div class="rail">'+[['前端操作','查看收藏'],['API 约定','GET /favorites'],['后端检查','确认当前身份'],['数据查询','读取相应记录'],['前端反馈','呈现结果']].map((a,i)=>'<div data-step="'+(i+1)+'" data-rail="'+(i+1)+'"><b>0'+(i+1)+' '+a[0]+'</b><small>'+a[1]+'</small></div>').join('')+'</div><div class="flow-bottom"><div class="flow-status"><h3 id="flow-title"></h3><p id="flow-detail"></p></div><pre id="flow-receipt" aria-live="polite"></pre></div><p class="micro">按“下一步”沿链路展开；切换场景可以观察分支。</p>';
 if(s.type==='decision')return '<div class="decision">'+s.items.map((a,i)=>'<article data-step="'+(i+1)+'"><h3>'+esc(a[0])+'</h3><p>'+esc(a[1])+'</p></article>').join('')+'</div><p class="micro">先验证最难确定的一环，按实际风险选择开发顺序。</p>';
 if(s.type==='git')return '<div class="columns"><div class="panel" data-step="1"><h3>Git</h3><p>版本控制系统</p><p>提交、历史、比较变化。</p><p class="highlight">本地工作通常不必先上传。</p></div><div class="panel red" data-step="2"><h3>GitHub</h3><p>托管与协作平台</p><p>基于 Git 增加协作能力。</p><p class="highlight">代码版本 ≠ 全部业务数据备份。</p></div></div><p class="micro">只恢复已经记录的内容；未追踪文件、外部数据库与保密配置分别处理。</p>';
 if(s.type==='assignment')return '<p class="taskline">选择你自己的一个功能，提交一张链路图、一份约定和一组验证证据。</p><div class="checklist">'+[['mapDone','链路：每个参与者和箭头都能解释。'],['contractDone','约定：正常输出和失败结果都清楚。'],['evidenceDone','证据：数据来源与业务承诺能对应。']].map(a=>'<button class="check" data-widget="'+a[0]+'" data-toggle="true"><span class="box"></span><span>'+a[1]+'</span></button>').join('')+'</div><p class="score" id="task-score"></p><p class="teacher-note">课堂自检记录，需要讲师/同伴实际核对；不是自动判卷。</p>';
 if(s.type==='quiz')return '<p class="quiz-question">'+esc(s.question)+'</p><div class="answers">'+s.answers.map(a=>'<button class="answer'+(a[0]==='c'?' correct':'')+'" data-widget="answer" data-value="'+a[0]+'"><b>'+a[0].toUpperCase()+'</b><span>'+esc(a[1])+'</span></button>').join('')+'</div><p class="quiz-feedback" id="quiz-feedback" aria-live="polite"></p>';
 return '';
}
document.querySelector('#slides').innerHTML=slides.map((s,i)=>'<section class="slide '+(s.type==='hero'?'hero':'')+'" data-slide="'+s.id+'"'+(i?' hidden':'')+'><p class="label">VIBE CODING · 技术地图 / '+String(i+1).padStart(2,'0')+'</p>'+(s.type==='hero'?'':'<h2>'+esc(s.title)+'</h2>')+'<div class="content">'+inner(s)+'</div></section>').join('');
let current;
function updateFlow(state){
 const mode=state.publicWidgetState.scenario||'success',step=state.revealStep;
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
  document.querySelectorAll('[data-slide]').forEach(n=>n.hidden=n.dataset.slide!==state.slideId);
  const active=document.querySelector('[data-slide="'+state.slideId+'"]');
  active.querySelectorAll('[data-step]').forEach(n=>{const pending=Number(n.dataset.step)>state.revealStep;n.classList.toggle('pending',pending);n.setAttribute('aria-hidden',String(pending));});
  document.body.classList.toggle('dark-ui',state.slideId==='opening');
  document.body.dataset.slideId=state.slideId;document.body.dataset.step=state.revealStep;
  const i=slides.findIndex(s=>s.id===state.slideId);
  document.querySelector('#position').textContent=(i+1)+' / '+slides.length+' · '+state.revealStep+' / '+slides[i].steps+' 步';
  document.querySelector('#previous').disabled=i===0&&state.revealStep===1;
  document.querySelector('#next').disabled=i===slides.length-1&&state.revealStep===slides[i].steps;
  document.querySelectorAll('[data-widget]').forEach(n=>{
    const selected=n.dataset.toggle?!!state.publicWidgetState[n.dataset.widget]:state.publicWidgetState[n.dataset.widget]===n.dataset.value;
    n.setAttribute('aria-pressed',String(selected));
    const box=n.querySelector('.box');if(box)box.innerHTML=selected?checked:'';
  });
  const total=['mapDone','contractDone','evidenceDone'].filter(k=>state.publicWidgetState[k]).length;
  document.querySelector('#task-score').textContent='自检 '+total+' / 3 项 · 建议练习 5 分钟后互评';
  const answer=state.publicWidgetState.answer;
  document.querySelector('#quiz-feedback').textContent=!answer||answer==='none'?'先作答，再讨论你的理由。':answer==='c'?'C 是本题最佳选项。实际项目仍需按业务补充验收条件。':'这一项证据还不够。继续想：它能证明数据从哪里来吗？';
  if(state.slideId==='flow')updateFlow(state);
 }
});
document.addEventListener('click',event=>{
 const n=event.target.closest('[data-widget]');if(!n||!current)return;
 const value=n.dataset.toggle?!current.publicWidgetState[n.dataset.widget]:n.dataset.value;
 PresenterContent.request('WIDGET_ACTION',{key:n.dataset.widget,value});
});
document.addEventListener('keydown',event=>{const n=event.target.closest?.('[data-widget]');if(n&&(event.key===' '||event.key==='Enter')){event.preventDefault();event.stopPropagation();n.click();}},true);
document.querySelector('#previous').onclick=()=>PresenterContent.request('PREV_STEP');
document.querySelector('#next').onclick=()=>PresenterContent.request('NEXT_STEP');
})();