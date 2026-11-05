'use strict';
const ARTWORK={cover:'/*TED1*/',comparison:'/*TED2*/',systems:'/*TED3*/',assets:'/*TED4*/'};
const ATMOSPHERE={speech:'/*LIGHT1*/',ai:'/*LIGHT2*/'};
const PERSONAL={portrait:'/*PORTRAIT*/',wechat:'/*WECHAT*/'};
const speechKinds=new Set(['background','agenda','horse','three','coproduce','scenes','tests','delivery']);
const $=s=>document.querySelector(s);
const $$=s=>Array.from(document.querySelectorAll(s));
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icons={menu:'M4 6h16M4 12h16M4 18h16',notes:'M5 3h14v18H5zM8 7h8M8 11h8M8 15h5',clock:'M12 8v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',help:'M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2-3 4M12 18h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',source:'M3 5h7l2 2h9v13H3z',prev:'m15 5-7 7 7 7',next:'m9 5 7 7-7 7',full:'M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5',close:'m6 6 12 12M18 6 6 18'};
const icon=(name)=>`<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${icons[name]||icons.next}"/></svg>`;
const STORAGE='chaixiang-y-keynote-v1';
const fields={scope:['Step1:范围','你在为谁，解决哪一项真实问题？','缩小到一个对象、一段业务或一项任务。'],target:['Step2:目标','90 天后，什么结果说明取得了进展？','写下判断标准，同时考虑质量、耗时、返工和成本。目标不是效果承诺。'],framework:['Step3:框架','你认为结果由哪些关键因素决定？','先写当前判断。因果框架需要事实检验。'],hypothesis:['Step4:预判','哪个判断最不确定？你预期会发生什么？','写下假设、预判、低成本测试和修正条件。先预判，再观察。'],support:['Step5:配套','怎样让行动持续发生，并留下一次可复用的经验？','工具、权限、资料、分工、验收、异常处理与复盘。'],theory:['使用现成模型/规律','哪些现成模型或规律可以借鉴？','记录适用条件。借鉴以后仍需验证。'],ownModel:['自己建模型','你从经验中提炼出了什么结构？','写清关键因素、关系与适用边界。'],facts:['定性定量','有哪些事实、数据和现场观察？','同时记录成功、失败和异常。不要只记录漂亮的结果。'],cognition:['我的认知','理论与事实碰撞后，你的认知改变了什么？','写下对因果关系的当前理解，以及还需要检验的部分。']};
const stepKeys=['scope','target','framework','hypothesis','support'];
const prompts=['一个真实问题','一个可判断的结果','结果的关键因素','先预判，再验证','让行动持续发生'];
const presetNames={blank:'模型讲解',enterprise:'企业培训案例',personal:'我的 90 天'};
const enterprise={scope:'企业员工在现有平台，完成真实工作任务。',target:'独立完成任务，拿到可检验的结果。',framework:'任务明确、输入完整、平台支持、输出可靠、有人验证、成本合理。',hypothesis:'任务、输入与平台条件匹配，应更容易完成。先逐项测试，再用结果修正。',support:'真实案例、测试账号、资料、任务清单、验收要求和失败处理。',theory:'成人学习、任务设计、软件产品测试。检验借鉴方法的适用边界。',ownModel:'场景筛选、需求分析、原型测试、业务验收、持续复盘。',facts:'平台模板创建自动化成功。真实流程直接转为自动化，当时尚未取得稳定成功案例。',cognition:'完成演示不等于完成交付。真实任务完成、结果核验、岗位复用，需要配套。'};
let saved={};try{saved=JSON.parse(localStorage.getItem(STORAGE)||'{}')}catch{}
const fresh=()=>Object.fromEntries(Object.keys(fields).map(k=>[k,'']));
const canvases={blank:{...fresh(),...(saved.blank||{})},enterprise:{...enterprise,...(saved.enterprise||{})},personal:{...fresh(),...(saved.personal||{})}};
let current=Math.max(0,Math.min(SLIDES.length-1,(parseInt(location.hash.replace('#/',''))||1)-1));
let revealed=1,maxReveal=1,activePreset='blank',activeStep=0,editKey='',selectedCause=0,selectedScene=0,selectedGrowth=2,systemMode=0;
let reduced=false;try{reduced=localStorage.getItem(STORAGE+'-reduced')==='1'}catch{}
const startTimes=SLIDES.reduce((a,s)=>{a.push((a.at(-1)||0)+s.seconds);return a},[0]);
const mmss=n=>`${String(Math.floor(Math.max(0,n)/60)).padStart(2,'0')}:${String(Math.floor(Math.max(0,n)%60)).padStart(2,'0')}`;
let timerRunning=false,timerElapsed=0,timerStarted=0,exerciseRunning=false,exerciseLeft=300,exerciseStarted=0,exerciseElapsed=0;
const fragment=(n,html,cls='')=>`<div class="fragment ${cls}" data-step="${n}">${html}</div>`;
const heading=(s,sub='')=>`<h1>${esc(s)}</h1>${sub?`<p class="subtitle">${esc(sub)}</p>`:''}`;
const rowList=(items,cls)=>items.map((x,i)=>fragment(i+1,`<b>${esc(x[0])}</b><p>${esc(x[1])}</p>`,cls)).join('');
const ySvg=(cover=false)=>cover?`<svg class="cover-y" viewBox="0 0 570 620" role="img" aria-label="理论、事实与认知形成 Y 的关系"><defs><marker id="cover-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M1 1 6 4 1 7" fill="none" stroke="#e82f29" stroke-width="1.5"/></marker></defs><path class="y-path" d="M65 105 285 300M505 105 285 300M285 335v208" marker-end="url(#cover-arrow)"/><path class="minor" d="M112 117 268 255M296 255 454 117"/><circle cx="65" cy="105" r="9"/><circle cx="505" cy="105" r="9"/><circle cx="285" cy="300" r="22" style="fill:var(--bg);stroke:var(--blue);stroke-width:5"/><text x="65" y="65" text-anchor="middle" font-size="28" font-weight="600">理论</text><text x="505" y="65" text-anchor="middle" font-size="28" font-weight="600">事实</text><text x="327" y="307" font-size="27" font-weight="600">认知</text><text x="285" y="598" text-anchor="middle" font-size="25" style="fill:var(--blue)">因果规律</text></svg>`:`<svg viewBox="0 0 950 560" aria-hidden="true"><defs><marker id="y-arrow" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto"><path d="m1 1 6 3.5-6 3.5" fill="none" stroke="#e82f29" stroke-width="1.6"/></marker><marker id="gray-arrow" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto"><path d="m1 1 6 3.5-6 3.5" fill="none" stroke="#8e9bb0" stroke-width="1.6"/></marker></defs><path d="M229 203 432 314" fill="none" stroke="#e82f29" stroke-width="4" marker-end="url(#y-arrow)"/><path d="M720 203 515 314" fill="none" stroke="#e82f29" stroke-width="4" marker-end="url(#y-arrow)"/><path d="M422 288 225 179" fill="none" stroke="#8e9bb0" stroke-width="2" marker-end="url(#gray-arrow)"/><path d="M526 288 724 179" fill="none" stroke="#8e9bb0" stroke-width="2" marker-end="url(#gray-arrow)"/><circle cx="475" cy="330" r="19" fill="var(--bg)" stroke="#e82f29" stroke-width="4"/><path d="M475 355v133" fill="none" stroke="#e82f29" stroke-width="4" marker-end="url(#y-arrow)"/></svg>`;
function modelMarkup(s){
 const data=canvases[activePreset];const isExercise=s.kind==='exercise';
 return `<header class="model-header">${heading(isExercise?'你的 90 天':s.preset==='enterprise'?'一次真实交付':'Y 模型')}<div class="model-toolbar ${isExercise?'exercise-tools':'lecture-tools'}">${isExercise?`<button id="exercise-start" class="exercise-button">开始 5 分钟练习</button><span id="exercise-status" class="exercise-status">05:00</span>`:''}<label class="live" for="canvas-preset">画布选择</label><select id="canvas-preset">${Object.keys(presetNames).map(k=>`<option value="${k}" ${k===activePreset?'selected':''}>${presetNames[k]}</option>`).join('')}</select><button id="canvas-export">导出 / 导入</button><button id="canvas-clear">清空</button><span class="autosave" id="save-state">点击节点填写</span></div></header><div class="body model-body"><div class="model-wrap"><div class="model-diagram">${ySvg()}${[['theory','f1'],['ownModel','f2'],['hypothesis','f3'],['facts','f4']].map(([k,c])=>`<button class="node field ${c} ${data[k]?'filled':''}" data-edit="${k}"><b>${esc(k === 'hypothesis' ? '提出新假设' : fields[k][0])}</b><span>${data[k]?'已填写':'点击展开'}</span></button>`).join('')}<button class="node theory" data-edit="theory">理论</button><button class="node fact" data-edit="facts">事实</button><button class="node cognition" data-edit="cognition">我的认知<small>知行合一的因果规律</small></button><button class="node solution" data-edit="target">解决真正问题</button></div><div class="step-rail">${stepKeys.map((k,i)=>`<button class="step-button ${i===activeStep?'selected':''} ${data[k]?'filled':''}" data-step-edit="${i}" aria-label="${esc(fields[k][0])}，${esc(data[k]||prompts[i])}"><b>${esc(fields[k][0])}</b><span>${s.preset==='enterprise'?['真实任务','可检验结果','因果框架','小步测试','配套交付'][i]:prompts[i]}</span><small>${data[k]?'已填写':'填写'}</small></button>`).join('')}</div></div></div>`;
}
const systemLabels=[['用户调研','选题','课程结构','逐字稿','作业点评','复盘'],['用户访谈','选题','脚本','拍摄发布','数据反馈','复盘']];
function renderSlide(s){
 switch(s.kind){
 case 'cover':return `<div class="cover-copy"><h1><span class="cover-line">如何用 <em>Y 模型</em></span><span class="cover-line secondary">构建 AI 时代下的</span><span class="cover-hero">长期竞争力</span></h1><div class="byline">柴翔<small>商业表达教练 / AI 应用实战讲师</small></div></div>`;
 case 'questions':return `${heading('三年以后')}<div class="body keyword-questions">${fragment(1,'<span>焦虑？</span>')}${fragment(2,'<span>学会 ≠ 用好</span>')}${fragment(3,'<span>客户为什么选你？</span>')}</div>`;
 case 'background':return `${heading('我的长板')}<div class="body background-key"><div class="giant">商业表达</div><div class="thin-rule"></div><div class="keyword-bottom"><span>自动化</span><span>培训</span><span>创业</span></div>${fragment(1,'<span class="challenge">AI 来了，我的价值在哪里？</span>')}</div>`;
 case 'agenda':return `${heading('今天，只走三步')}<div class="body keynote-three">${['变化','方法','行动'].map((x,i)=>fragment(i+1,`<small>0${i+1}</small><h2>${x}</h2>`)).join('')}</div>`;
 case 'comparison':return `${heading('工具越来越强')}<div class="body pivot"><div class="pivot-copy"><div class="pivot-main">判断</div>${fragment(1,'<div class="pivot-accent">更重要</div>')}</div><svg class="pivot-art" style="display:none" viewBox="0 0 450 500" aria-hidden="true"><path d="M25 250H100C230 250 240 60 420 60" class="chosen"/><path d="M100 250C230 250 260 155 420 155M100 250H420M100 250C230 250 260 345 420 345M100 250C230 250 240 440 420 440"/><circle cx="100" cy="250" r="17"/><circle cx="420" cy="60" r="8"/><circle cx="420" cy="155" r="4"/><circle cx="420" cy="250" r="4"/><circle cx="420" cy="345" r="4"/><circle cx="420" cy="440" r="4"/></svg></div>`;
 case 'value':return `${heading('从生产，到价值')}<div class="body value-key"><div class="value-equation"><span>产出</span><span class="neq">≠</span>${fragment(1,'<strong>成果</strong>')}</div><div class="keyword-bottom"><span>PPT</span><span>文案</span><span>短视频</span></div></div>`;
 case 'horse':return `${heading('马、马具与骑手')}<div class="body horse-key">${[['大模型','马'],['智能体 / 工作流','马具'],['人','骑手']].map((x,i)=>fragment(i+1,`<small>${x[0]}</small><strong>${x[1]}</strong>`)).join('')}</div>`;
 case 'three':return `${heading('值得长期练习的能力')}<div class="body keynote-words">${['定义问题','理解因果','沉淀系统'].map((x,i)=>fragment(i+1,`<span class="index">0${i+1}</span><strong>${x}</strong>`)).join('')}</div>`;
 case 'model':case 'exercise':return modelMarkup(s);
 case 'scope':return `${heading('Step1:范围')}<div class="body scope-key"><div class="hero-word">收窄</div>${fragment(1,'<div class="keyword-bottom"><span>对象</span><span>任务</span><span>边界</span></div>')}</div>`;
 case 'target':return `${heading('Step2:目标')}<div class="body target-key"><span class="target-wish">愿望</span>${fragment(1,'<strong>目标</strong>')}<div class="target-keywords"><span>可判断</span><span>可验证</span></div></div>`;
 case 'causes':return `${heading('Step3:框架')}<div class="body causes-key"><div class="cause-key-row">${['精准','需求','价值','信任','履约'].map((x,i)=>`<button class="cause-key ${i===selectedCause?'active':''}" data-cause="${i}">${x}</button>`).join('')}</div><svg viewBox="0 0 1456 220" class="cause-lines" aria-hidden="true"><path d="M115 5V70H728V205M422 5V70M728 5V70M1034 5V70H728M1341 5V70H1034"/></svg><div class="cause-result">成交效率</div><div class="cause-popup" id="cause-popup" hidden></div></div>`;
 case 'prediction':return `${heading('Step4:预判')}<div class="body prediction-key"><div>先预判</div>${fragment(1,'<div class="blue-text">再验证</div>')}<div class="micro-keywords">假设　测试　修正</div></div>`;
 case 'support':return `${heading('Step5:配套')}<div class="body support-key">${['工具','资料','分工','验收','复盘'].map((x,i)=>fragment(i+1,`<small>0${i+1}</small><strong>${x}</strong>`)).join('')}</div>`;
 case 'methods':return `${heading('理论、事实与认知')}<div class="body method-key">${s.items.map((x,i)=>fragment(i+1,`<small>0${i+1}</small><strong>${esc(x[0])}</strong>`)).join('')}</div>`;
 case 'timeline':return `${heading('我的 AI 成长')}<div class="body"><div class="timeline keyword-timeline">${[['2011','入行'],['2014','同道演说'],['2020 以后','调整'],['2024 以后','一堂与 AI']].map((x,i)=>fragment(i+1,`<div class="year">${x[0]}</div><h2>${x[1]}</h2>`,'time-stop')).join('')}</div><div class="timeline-growth"><span>多</span><span>好</span><span class="outline">快<small>当前突破</small></span></div></div>`;
 case 'reframe':return `${heading('客户真正想要的')}<div class="body reframe-key"><span>演讲</span>${fragment(1,'<strong>商业结果</strong>')}<div class="micro-keywords">卖产品　带团队　获合作</div></div>`;
 case 'coproduce':return `${heading('组织 AI，共同生产')}<div class="body coproduce-key">${['上下文','共创','判断','负责'].map((x,i)=>fragment(i+1,`<small>0${i+1}</small><strong>${x}</strong>`)).join('')}</div>`;
 case 'systems':return `${heading('让每次交付，进入下一次改进')}<div class="body"><div class="switches"><button data-system="0" class="${systemMode===0?'active':''}">课程研发</button><button data-system="1" class="${systemMode===1?'active':''}">内容获客</button></div><div class="system-circle">${systemLabels[systemMode].map((x,i)=>fragment(i+1,`<small>0${i+1}</small><strong>${x}</strong>`,'system-key')).join('')}</div><div class="system-cycle"><svg viewBox="0 0 700 40" aria-hidden="true"><path d="M670 6v18H30V6m-9 9L30 6l9 9"/></svg><span>下一次，接着改进</span></div></div>`;
 case 'growth':return `${heading('多、好、快')}<div class="body"><div class="growth-grid minimal-growth">${s.items.map((x,i)=>`<button class="growth-button ${i===selectedGrowth?'active':''}" data-growth="${i}"><span class="han">${x[0]}</span><small>${['探索','质量','当前突破'][i]}</small></button>`).join('')}</div><div class="growth-caption" id="growth-caption">${['更广地探索','更好地交付','稳定、快速地做出来'][selectedGrowth]}</div></div>`;
 case 'reliability':return `${heading('我的下一步')}<div class="body reliability-key"><span>会做</span>${fragment(1,'<strong>稳定做出</strong>')}<div class="micro-keywords">任务清楚　验证提前　异常可控</div></div>`;
 case 'scenes':return `${heading('企业 AI 培训')}<div class="body scenes-key"><div class="scene-grid">${s.items.map((x,i)=>`<button class="scene-button ${i===selectedScene?'active':''}" data-scene="${i}"><strong>${x[0]}</strong><small>${['检索','起草','分析','纪要','核验','执行'][i]}</small></button>`).join('')}</div><div class="scene-detail" id="scene-detail">${['找到依据','写出初稿','算得清楚','留下行动','辅助核验','完成任务'][selectedScene]}</div><div class="scene-result">真实任务</div></div>`;
 case 'tests':return `${heading('功能，到了现场')}<div class="body onsite-key">${[['写','资料'],['算','核验'],['会','源头'],['办','边界']].map((x,i)=>fragment(i+1,`<strong>${x[0]}</strong><span>${x[1]}</span>`)).join('')}</div>`;
 case 'failure':return `${heading('测试留下的事实')}<div class="body failure-key">${fragment(1,'<div><small>已经跑通</small><strong>模板自动化</strong></div>')}${fragment(2,'<div><small class="red-text">尚未稳定</small><strong>流程转自动化</strong></div>')}</div>`;
 case 'delivery':return `${heading('培训的验收')}<div class="body delivery-key"><div class="hero-word">做出来</div>${fragment(1,'<div class="keyword-bottom"><span>任务</span><span>验证</span><span>复用</span></div>')}</div>`;
 case 'four':return `${heading('我的四个着力点')}<div class="body four-key">${['业务','因果','长板','资产'].map((x,i)=>fragment(i+1,`<small>0${i+1}</small><strong>${x}</strong>`)).join('')}</div>`;
 case 'formula':return `${heading('我希望建立的能力系统')}<div class="body formula-key">${s.items.map((x,i)=>fragment(i+1,`${i?'<span class="multiply">×</span>':''}<strong>${esc(x)}</strong>`)).join('')}</div>`;
 case 'assets':return `${heading('做完以后，留下什么？')}<div class="body assets-key">${['认知','方法','记录','资产'].map((x,i)=>fragment(i+1,`<strong>${x}</strong>`)).join('')}</div>`;
 case 'closing':return `${heading('每一步，成为下一步的积累')}<div class="body closing-key">${['工具会变','经验有界','方法生长'].map((x,i)=>fragment(i+1,`<span>0${i+1}</span><strong>${x}</strong>`)).join('')}</div>`;
 case 'end':return `<img class="speaker-portrait" src="${PERSONAL.portrait}" alt="柴翔形象照"><div class="speaker-copy"><p class="speaker-theme">持续进化</p><h1 class="speaker-name">柴翔</h1><div class="speaker-identity">同道演说联合创始人<br>商业表达力教练 / AI 应用实战讲师</div><div class="speaker-focus">商业表达 <span>×</span> AI 应用</div></div><div class="speaker-contact"><button class="wechat-qr-button" id="wechat-open" title="点击放大微信二维码" aria-label="放大柴翔微信二维码"><span class="wechat-qr-window"><img src="${PERSONAL.wechat}" alt="柴翔微信二维码"></span></button><div class="wechat-copy"><h2>扫码加我</h2><p>让表达有力量<br>让故事能成交</p><small>商业表达与 AI 应用，继续交流</small></div></div>`;
 default:return heading(s.title);
 }
}
const darkKinds=['cover','questions','comparison','target','prediction','reframe','reliability','failure','formula','closing','systems','assets'];
function render(reset=true){
 const s=SLIDES[current];if(reset){revealed=reduced?99:1;activePreset=s.preset||activePreset;activeStep=0;}
 const theme=s.kind==='end'||darkKinds.includes(s.kind)?'dark':'light';$('#stage').dataset.theme=theme;
 const atmosphere=speechKinds.has(s.kind)?'speech':'ai';
 $('#slide-host').innerHTML=`<section class="slide ${s.kind==='cover'?'cover':''} keynote-${s.kind} ${ARTWORK[s.kind]?'photo-slide':''} ${theme==='light'?'white-stage':''} ${reduced?'no-motion':''}" aria-label="第 ${current+1} 页：${esc(s.title.replaceAll('\n',' '))}">${theme==='light'?`<img class="light-atmosphere atmosphere-${atmosphere}" src="${ATMOSPHERE[atmosphere]}" alt="" aria-hidden="true">`:''}${ARTWORK[s.kind]?`<img class="keynote-bg" src="${ARTWORK[s.kind]}" alt="${{cover:'Y形雕塑：理论与事实汇入认知',comparison:'在众多可能中选择一条路径',systems:'碎片组合成为完整结构',assets:'能力积累形成上升的路径'}[s.kind]}">`:''}${renderSlide(s)}</section>`;
 maxReveal=Math.max(1,...$$('.fragment').map(n=>Number(n.dataset.step)));updateReveal();
 $('#page-count').textContent=`${String(current+1).padStart(2,'0')} / ${SLIDES.length}`;
 $('#chapter-label').textContent=CHAPTERS[s.chapter][0];$('#progress').style.width=`${(current+1)/SLIDES.length*100}%`;
 $('#note-title').textContent=s.title.replaceAll('\n',' ');$('#note-meta').textContent=`第 ${current+1} / ${SLIDES.length} 页 · 计划 ${mmss(startTimes[current])}–${mmss(startTimes[current+1])} · 本页 ${mmss(s.seconds)}`;
 $('#note-cue').textContent=s.cue;$('#note-text').textContent=s.notes;$('#note-next').textContent=current<SLIDES.length-1?`下一页：${SLIDES[current+1].title.replaceAll('\n',' ')}　（${mmss(SLIDES[current+1].seconds)}）`:'分享结束。感谢你的时间。';
 if(reset)$('#note-scroll').scrollTop=0;
 $('#slide-live').textContent=`第 ${current+1} 页，${s.title.replaceAll('\n',' ')}`;
 document.title=`${current+1}/${SLIDES.length} · 柴翔 · Y 模型与 AI 长期竞争力`;
 try{history.replaceState(null,'',`#/${current+1}`)}catch{location.hash=`/${current+1}`}
 bindSlide();fit();updateExerciseDisplay();
}
function updateReveal(){
 $$('.fragment').forEach(n=>{const show=reduced||Number(n.dataset.step)<=revealed;n.classList.toggle('show',show);n.setAttribute('aria-hidden',String(!show));n.inert=!show});
 $('#step-status').textContent=maxReveal>1&&!reduced?`${Math.min(revealed,maxReveal)} / ${maxReveal} 步`:'空格继续';
 $('#prev-btn').disabled=current===0&&revealed<=1;$('#next-btn').disabled=current===SLIDES.length-1&&revealed>=maxReveal;
}
function go(n){const next=Math.max(0,Math.min(SLIDES.length-1,n));if(next!==current){current=next;render()}}
function next(direct=false){if(!direct&&!reduced&&revealed<maxReveal){revealed++;updateReveal()}else go(current+1)}
function prev(){if(!reduced&&revealed>1){revealed--;updateReveal()}else if(current>0){go(current-1);revealed=maxReveal;updateReveal()}}
function fit(){const v=$('#viewport'),scale=Math.min(v.clientWidth/1600,v.clientHeight/900);$('#stage-frame').style.width=`${1600*scale}px`;$('#stage-frame').style.height=`${900*scale}px`;$('#stage').style.transform=`scale(${scale})`}
function toast(text){$('#toast').textContent=text;$('#toast').hidden=false;clearTimeout(toast.id);toast.id=setTimeout(()=>$('#toast').hidden=true,3600)}
function persist(){try{localStorage.setItem(STORAGE,JSON.stringify(canvases));toast('已保存到当前浏览器。建议导出备份。')}catch{toast('浏览器未允许保存，请导出画布备份。')}}
function showDialog(id){const d=$(id);if(!d.open)d.showModal()}
function toggleNotes(){const n=$('#notes');n.hidden=!n.hidden;$('#notes-btn').setAttribute('aria-expanded',String(!n.hidden));fit()}
function showMenu(){
 $('#chapter-menu').innerHTML=CHAPTERS.map((c,i)=>`<section><h3>${String(i+1).padStart(2,'0')}　${c[0]}<small>${c[1]}</small></h3>${SLIDES.map((s,n)=>s.chapter===i?`<button class="menu-slide ${n===current?'current':''}" data-go="${n}"><span>${String(n+1).padStart(2,'0')}</span>${esc(s.title.replaceAll('\n',' '))}</button>`:'').join('')}</section>`).join('');
 $$('#chapter-menu [data-go]').forEach(b=>b.onclick=()=>{go(Number(b.dataset.go));$('#menu-dialog').close()});showDialog('#menu-dialog');
}
function openEditor(key){editKey=key;const f=fields[key];$('#edit-title').textContent=f[0];$('#edit-question').textContent=f[1];$('#edit-helper').textContent=f[2];$('#edit-value').value=canvases[activePreset][key]||'';$('#edit-count').textContent=`${$('#edit-value').value.length} / 1500`;showDialog('#edit-dialog');setTimeout(()=>$('#edit-value').focus(),30)}
const causeDetails=['AI 可辅助分析客户资料。客户是否精准，需要业务结果验证。','AI 可辅助整理需求。真实意图，需要与客户核对。','AI 可辅助组织表达。产品价值与差异，仍要落到业务事实。','AI 可辅助准备证据。信任仍依赖真实承诺和交付。','AI 可协助流程。最终履约，需要人和组织负责。'];
function bindSlide(){
 if($('#wechat-open'))$('#wechat-open').onclick=()=>showDialog('#wechat-dialog');
 $$('[data-edit]').forEach(b=>b.onclick=()=>openEditor(b.dataset.edit));
 $$('[data-step-edit]').forEach(b=>b.onclick=()=>{activeStep=Number(b.dataset.stepEdit);$$('.step-button').forEach((x,i)=>x.classList.toggle('selected',i===activeStep));openEditor(stepKeys[activeStep])});
 if($('#canvas-preset'))$('#canvas-preset').onchange=e=>{activePreset=e.target.value;render(false)};
 if($('#canvas-export'))$('#canvas-export').onclick=()=>{$('#export-scope').textContent=`当前画布：${presetNames[activePreset]}。`;showDialog('#export-dialog')};
 if($('#canvas-clear'))$('#canvas-clear').onclick=()=>showDialog('#confirm-dialog');
 if($('#exercise-start'))$('#exercise-start').onclick=toggleExercise;
 $$('[data-cause]').forEach(b=>b.onclick=()=>{selectedCause=Number(b.dataset.cause);$$('[data-cause]').forEach((x,i)=>x.classList.toggle('active',i===selectedCause));$('#cause-popup').textContent=causeDetails[selectedCause];$('#cause-popup').hidden=false});
 $$('[data-system]').forEach(b=>b.onclick=()=>{systemMode=Number(b.dataset.system);render(false);revealed=99;updateReveal()});
 $$('[data-growth]').forEach(b=>b.onclick=()=>{selectedGrowth=Number(b.dataset.growth);render(false)});
 $$('[data-scene]').forEach(b=>b.onclick=()=>{selectedScene=Number(b.dataset.scene);render(false)});
}
$('#edit-value').oninput=()=>$('#edit-count').textContent=`${$('#edit-value').value.length} / 1500`;
$('#edit-form').onsubmit=e=>{e.preventDefault();canvases[activePreset][editKey]=$('#edit-value').value.trim();persist();$('#edit-dialog').close();render(false)};
$('#confirm-clear').onclick=()=>{canvases[activePreset]=fresh();persist();$('#confirm-dialog').close();render(false)};
function download(name,text,type='text/plain;charset=utf-8'){const blob=new Blob(['\uFEFF',text],{type});const a=document.createElement('a');const u=URL.createObjectURL(blob);a.href=u;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1000)}
function canvasMarkdown(){return `# Y 模型实践画布：${presetNames[activePreset]}\n\n`+Object.keys(fields).map(k=>`## ${fields[k][0]}\n\n${canvases[activePreset][k]||'（未填写）'}\n`).join('\n')+'\n原模型：理论与事实持续修正我的认知，形成知行合一的因果规律，解决真正问题。\n';}
$('#export-md').onclick=()=>download(`Y模型-${presetNames[activePreset]}.md`,canvasMarkdown(),'text/markdown;charset=utf-8');
$('#export-json').onclick=()=>download(`Y模型-${presetNames[activePreset]}.json`,JSON.stringify({schema:'chaixiang-y-canvas-v1',name:presetNames[activePreset],fields:canvases[activePreset]},null,2),'application/json;charset=utf-8');
$('#import-json').onclick=()=>$('#import-file').click();
$('#import-file').onchange=async e=>{const file=e.target.files?.[0];if(!file)return;try{if(file.size>100000)throw Error('size');const obj=JSON.parse((await file.text()).replace(/^\uFEFF/,''));if(obj.schema!=='chaixiang-y-canvas-v1'||!obj.fields||typeof obj.fields!=='object')throw Error('schema');const clean=fresh();for(const k of Object.keys(fields)){if(obj.fields[k]!==undefined&&typeof obj.fields[k]!=='string')throw Error('type');clean[k]=String(obj.fields[k]||'').slice(0,1500)}canvases[activePreset]=clean;persist();$('#export-dialog').close();render(false);toast('已导入到当前画布。')}catch{toast('无法导入。请选择本演示导出的 JSON 备份。')}e.target.value=''};
function notesMarkdown(){return '# 如何用 Y 模型构建 AI 时代下的长期竞争力\n\n柴翔｜商业表达教练、AI 应用实战讲师\n\n32 页演讲型演示，计划总时长 60 分钟。根据用户提供的逐字稿整理的逐页演讲提示，保留关键事实与案例边界。\n\n'+SLIDES.map((s,i)=>`## ${String(i+1).padStart(2,'0')} ${s.title.replaceAll('\n',' ')}\n\n计划 ${mmss(startTimes[i])}–${mmss(startTimes[i+1])}，本页 ${mmss(s.seconds)}\n\n现场提示：${s.cue}\n\n${s.notes}\n`).join('\n');}
$('#download-notes').onclick=()=>download('柴翔-逐页演讲稿与提示.md',notesMarkdown(),'text/markdown;charset=utf-8');
let notesLarge=false;$('#bigger-notes').onclick=()=>{notesLarge=!notesLarge;$('#note-text').style.fontSize=notesLarge?'20px':'16px';$('#bigger-notes').textContent=notesLarge?'还原文字':'放大文字'};
function toggleTimer(){if(timerRunning){timerElapsed+=performance.now()-timerStarted;timerRunning=false}else{timerStarted=performance.now();timerRunning=true}tick()}
$('#reset-timer').onclick=()=>{timerElapsed=0;timerStarted=performance.now();tick();toast('演讲计时已归零。')};
function toggleExercise(){if(exerciseRunning){exerciseElapsed+=performance.now()-exerciseStarted;exerciseRunning=false}else{if(exerciseLeft<=0){exerciseElapsed=0;exerciseLeft=300}exerciseStarted=performance.now();exerciseRunning=true}updateExerciseDisplay()}
function updateExerciseDisplay(){
 const elapsed=(exerciseElapsed+(exerciseRunning?performance.now()-exerciseStarted:0))/1000;exerciseLeft=Math.max(0,300-Math.floor(elapsed));
 if(exerciseLeft===0){exerciseElapsed=300000;exerciseRunning=false;}
 const b=$('#exercise-start'),status=$('#exercise-status');if(!b)return;
 b.textContent=exerciseRunning?'暂停练习':exerciseLeft===300?'开始 5 分钟练习':exerciseLeft===0?'重新练习':'继续练习';
 let phase=elapsed<30?'范围':elapsed<60?'目标':elapsed<105?'框架':elapsed<150?'预判':elapsed<210?'配套':'现场分享';
 status.textContent=`${mmss(exerciseLeft)}${elapsed>0?' · '+(exerciseLeft===0?'练习结束':phase):''}`;
}
function tick(){const secs=Math.floor((timerElapsed+(timerRunning?performance.now()-timerStarted:0))/1000);$('#timer-btn').innerHTML=icon('clock')+`<span class="clock">${mmss(secs)}</span>`;$('#timer-btn').classList.toggle('running',timerRunning);$('#timer-btn').classList.toggle('late',secs>3600);$('#timer-btn').setAttribute('aria-label',`${timerRunning?'暂停':'开始'}演讲计时，当前 ${mmss(secs)}`);updateExerciseDisplay()}
async function full(){try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen()}catch{toast('浏览器未允许全屏。可使用浏览器菜单或 F11。')}}
$('#menu-btn').innerHTML=icon('menu')+'目录';$('#notes-btn').innerHTML=icon('notes')+'提示';$('#help-btn').innerHTML=icon('help');$('#help-btn').setAttribute('aria-label','帮助');$('#prev-btn').innerHTML=icon('prev');$('#next-btn').innerHTML=icon('next');$('#fullscreen-btn').innerHTML=icon('full');$('#fullscreen-btn').setAttribute('aria-label','全屏');$$('.close-button').forEach(b=>b.innerHTML=icon('close'));
$('#wechat-dialog-image').src=PERSONAL.wechat;
$('#menu-btn').onclick=showMenu;$('#notes-btn').onclick=toggleNotes;$('#close-notes').onclick=toggleNotes;$('#timer-btn').onclick=toggleTimer;$('#help-btn').onclick=()=>showDialog('#help-dialog');$('#prev-btn').onclick=prev;$('#next-btn').onclick=()=>next();$('#fullscreen-btn').onclick=full;
$$('[data-close]').forEach(b=>b.onclick=()=>b.closest('dialog').close());$$('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close()}}));
$('#reduce-motion').checked=reduced;$('#reduce-motion').onchange=e=>{reduced=e.target.checked;try{localStorage.setItem(STORAGE+'-reduced',reduced?'1':'0')}catch{}render(false);updateReveal()};
const actions={menu:showMenu,notes:toggleNotes,prev,next,fullscreen:full};$$('[data-action]').forEach(b=>b.onclick=actions[b.dataset.action]);
$('#blackout').onclick=()=>$('#blackout').hidden=true;
document.addEventListener('keydown',e=>{
 if(!$('#blackout').hidden){$('#blackout').hidden=true;e.preventDefault();return}
 if($$('dialog').some(d=>d.open)||/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName)||e.ctrlKey||e.metaKey||e.altKey)return;
 const k=e.key.toLowerCase();if([' ','arrowright','arrowdown','pagedown','arrowleft','arrowup','pageup','home','end','o','n','t','f','r','b','?'].includes(k))e.preventDefault();
 if([' ','arrowright','arrowdown','pagedown'].includes(k))next(e.shiftKey);else if(['arrowleft','arrowup','pageup'].includes(k))prev();else if(k==='home')go(0);else if(k==='end')go(SLIDES.length-1);else if(k==='o')showMenu();else if(k==='n')toggleNotes();else if(k==='t')toggleTimer();else if(k==='f')full();else if(k==='r'){render();toast('已重播本页。')}else if(k==='b')$('#blackout').hidden=false;else if(k==='?')showDialog('#help-dialog');
});
let touchX=0,touchY=0;$('#viewport').addEventListener('touchstart',e=>{touchX=e.touches[0].clientX;touchY=e.touches[0].clientY},{passive:true});$('#viewport').addEventListener('touchend',e=>{if(e.target.closest('button,input,select,textarea'))return;const dx=e.changedTouches[0].clientX-touchX,dy=e.changedTouches[0].clientY-touchY;if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)*1.4){dx<0?next():prev()}},{passive:true});
let idleTimer;function wakeChrome(){document.body.classList.remove('idle');clearTimeout(idleTimer);idleTimer=setTimeout(()=>document.body.classList.add('idle'),4500)}
document.addEventListener('pointermove',wakeChrome);document.addEventListener('keydown',wakeChrome);document.addEventListener('focusin',wakeChrome);window.addEventListener('resize',fit);window.addEventListener('hashchange',()=>{const n=(parseInt(location.hash.replace('#/',''))||1)-1;if(n!==current)go(n)});
setInterval(tick,500);render();tick();wakeChrome();




