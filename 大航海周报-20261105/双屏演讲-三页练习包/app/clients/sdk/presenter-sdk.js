(function(){
  'use strict';
  const query=new URLSearchParams(location.search);
  const bridge=query.get('bridge');
  const hostOrigin=new URL(document.currentScript.src).origin;
  let adapter,lastState,registered=false;
  const send=(type,payload={})=>{if(bridge&&window.parent!==window) window.parent.postMessage({protocol:1,bridge,type,...payload},hostOrigin);};
  const actions=new Set(['NEXT_STEP','PREV_STEP','NEXT_SLIDE','PREV_SLIDE','GOTO_SLIDE','REPLAY','SET_BLACKOUT','TIMER_START','TIMER_PAUSE','TIMER_RESET','EXERCISE_START','EXERCISE_PAUSE','EXERCISE_RESET','WIDGET_ACTION']);
  window.PresenterContent=Object.freeze({
    register(value){
      if(registered) throw Error('内容适配器只能注册一次');
      if(typeof value?.getSlides!=='function'||typeof value?.applySnapshot!=='function') throw Error('内容需要 getSlides 和 applySnapshot');
      adapter=value;registered=true;
      send('CONTENT_READY',{slides:adapter.getSlides()});
    },
    request(action,params={}){if(!actions.has(action)) throw Error('不支持的演示动作');send('CONTENT_INTENT',{action,params});},
    getSnapshot(){return lastState?JSON.parse(JSON.stringify(lastState)):null;}
  });
  window.addEventListener('message',async event=>{
    const message=event.data;
    if(event.source!==window.parent||event.origin!==hostOrigin||message?.protocol!==1||message.bridge!==bridge) return;
    if(message.type==='APPLY_SNAPSHOT'&&adapter){
      try {await adapter.applySnapshot(message.state);lastState=message.state;send('SNAPSHOT_APPLIED',{stateVersion:message.state.stateVersion});}
      catch(error){send('CONTENT_ERROR',{message:String(error.message||error).slice(0,300)});}
    } else if(message.type==='DESTROY'){adapter?.destroy?.();adapter=null;}
  });
  document.addEventListener('keydown',event=>{
    if(event.defaultPrevented||event.ctrlKey||event.metaKey||event.altKey||/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName)||document.activeElement?.isContentEditable) return;
    const key=event.key.toLowerCase();let action,params={};
    if(key==='c'){event.preventDefault();send('CONTENT_UI',{action:'RESUME_REMOTE'});return;}
    if(key==='f'){event.preventDefault();send('CONTENT_UI',{action:'FULLSCREEN'});return;}
    if(lastState?.blackout){action='SET_BLACKOUT';params.value=false;}
    else if([' ','arrowright','arrowdown','pagedown'].includes(key)) action=event.shiftKey?'NEXT_SLIDE':'NEXT_STEP';
    else if(['arrowleft','arrowup','pageup'].includes(key)) action=event.shiftKey?'PREV_SLIDE':'PREV_STEP';
    else if(key==='home'||key==='end'){action='GOTO_SLIDE';const slides=adapter?.getSlides()||[];params.slideId=(key==='home'?slides[0]:slides.at(-1))?.id;}
    else if(key==='b'){action='SET_BLACKOUT';params.value=true;}
    else if(key==='r')action='REPLAY';
    else if(key==='t')action=lastState?.presentationTimer.startedAt===null?'TIMER_START':'TIMER_PAUSE';
    if(action){event.preventDefault();window.PresenterContent.request(action,params);}
  });
  window.addEventListener('error',event=>send('CONTENT_ERROR',{message:String(event.message).slice(0,300)}));
})();
