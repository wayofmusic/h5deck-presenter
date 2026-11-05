import {PresentationLink,$} from '../shared.mjs';
import {transition} from '/core/state.mjs';
const link=new PresentationLink({local:true,preserveOnRestart:true});
const frame=$('#content-frame');
const bridge=crypto.randomUUID();
let contentReady=false,shown,offline,restoring=false,ackTimer,loadTimer,lastSent='';
const actions=new Set(['NEXT_STEP','PREV_STEP','NEXT_SLIDE','PREV_SLIDE','GOTO_SLIDE','REPLAY','SET_BLACKOUT','TIMER_START','TIMER_PAUSE','TIMER_RESET','EXERCISE_START','EXERCISE_PAUSE','EXERCISE_RESET','WIDGET_ACTION']);
const message=text=>{$('#message').textContent=text;$('#message').hidden=false;clearTimeout(message.timer);message.timer=setTimeout(()=>$('#message').hidden=true,4000);};
function fail(text){$('#content-status').textContent=text;$('#content-status').hidden=false;}
function send(type,payload={}) {frame.contentWindow?.postMessage({protocol:1,bridge,type,...payload},'*');}
function apply(state) {
  shown=structuredClone(state);window.presentationSnapshot=shown;
  document.body.dataset.slideId=state.slideId;document.body.dataset.step=state.revealStep;
  $('#blackout').hidden=!state.blackout;
  const signature=`${state.sessionId}:${state.stateVersion}`;
  if(contentReady&&lastSent!==signature){lastSent=signature;send('APPLY_SNAPSHOT',{state:shown});clearTimeout(ackTimer);ackTimer=setTimeout(()=>fail('课件未确认画面状态。请检查内容适配器，或重新载入投屏窗口。'),5000);}
}
async function dispatch(action,params={}) {
  if(link.busy||!shown||!contentReady)return;
  if(link.ready&&!offline&&!link.restarting)return link.command(action,params);
  try{offline=transition(offline||shown,{...params,action},link.manifest,link.now());apply(offline);message('已单机接管。连接恢复后按 C 以当前画面恢复遥控。');}catch(error){message(error.message);}
}
async function resume(){if(!offline)return;const saved=structuredClone(offline);restoring=true;try{if(await link.restore(saved)){offline=null;apply(link.state);message('已恢复遥控。');}}catch(error){message(error.message);}finally{restoring=false;}}
async function fullscreen(){try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{message('浏览器未允许全屏，可使用 F11。');}}
window.addEventListener('message',event=>{
  const data=event.data;
  // This iframe has an opaque sandbox origin; source + per-instance nonce bind the bridge.
  if(event.source!==frame.contentWindow||event.origin!=='null'||data?.bridge!==bridge||data.protocol!==1)return;
  if(data.type==='CONTENT_READY'){
    const expected=link.manifest.slides.map(s=>({id:s.id,steps:s.steps}));
    if(!Array.isArray(data.slides)||data.slides.length!==expected.length||data.slides.some((s,i)=>s.id!==expected[i].id||s.steps!==expected[i].steps)){fail('内容报告的页面或展开步骤与清单不一致。');return;}
    clearTimeout(loadTimer);contentReady=true;lastSent='';apply(offline||link.state);
  }else if(data.type==='SNAPSHOT_APPLIED'&&data.stateVersion===shown?.stateVersion){clearTimeout(ackTimer);$('#content-status').hidden=true;document.body.dataset.appliedVersion=data.stateVersion;}
  else if(data.type==='CONTENT_ERROR'){fail(`课件运行失败：${String(data.message||'未知错误').slice(0,300)}`);}
  else if(data.type==='CONTENT_INTENT'&&contentReady&&actions.has(data.action)&&data.params&&typeof data.params==='object'&&JSON.stringify(data.params).length<8192){dispatch(data.action,data.params);}
  else if(data.type==='CONTENT_UI'){if(data.action==='FULLSCREEN')fullscreen();if(data.action==='RESUME_REMOTE')resume();}
});
link.addEventListener('state',event=>{if(!offline||restoring)apply(event.detail);});
link.addEventListener('restart',()=>offline||=structuredClone(shown));
link.addEventListener('error',event=>message(event.detail.message));
$('#blackout').onclick=()=>dispatch('SET_BLACKOUT',{value:false});
document.addEventListener('keydown',event=>{
  if(event.ctrlKey||event.altKey||event.metaKey)return;
  const key=event.key.toLowerCase();let action,params={};
  if(key==='c'){resume();return;}if(key==='f'){fullscreen();return;}
  if(shown?.blackout){action='SET_BLACKOUT';params.value=false;}
  else if([' ','arrowright','arrowdown','pagedown'].includes(key))action=event.shiftKey?'NEXT_SLIDE':'NEXT_STEP';
  else if(['arrowleft','arrowup','pageup'].includes(key))action=event.shiftKey?'PREV_SLIDE':'PREV_STEP';
  else if(key==='b'){action='SET_BLACKOUT';params.value=true;}
  else if(key==='r')action='REPLAY';
  else if(key==='t')action=shown?.presentationTimer.startedAt===null?'TIMER_START':'TIMER_PAUSE';
  if(action){event.preventDefault();dispatch(action,params);}
});
window.addEventListener('pagehide',()=>send('DESTROY'));
try {
  await link.start();
  document.title=`${link.manifest.title} · 双屏演讲`;
  const entry=new URL(link.manifest.content.entryUrl,location.origin);entry.searchParams.set('bridge',bridge);
  frame.src=entry.href;
  loadTimer=setTimeout(()=>fail('内容未连接平台 SDK。请检查入口是否加载 SDK 并注册适配器。'),10000);
}catch(error){fail(`无法载入课件：${error.message}`);}
