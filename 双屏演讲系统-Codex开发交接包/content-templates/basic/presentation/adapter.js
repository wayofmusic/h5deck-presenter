const slides=[{id:'opening',steps:1},{id:'key-points',steps:3},{id:'closing',steps:1}];
PresenterContent.register({
  getSlides:()=>slides,
  applySnapshot(state){
    document.querySelectorAll('[data-slide]').forEach(node=>{node.hidden=node.dataset.slide!==state.slideId;});
    document.querySelectorAll(`[data-slide="${state.slideId}"] [data-step]`).forEach(node=>node.hidden=Number(node.dataset.step)>state.revealStep);
    document.querySelector('#position').textContent=`${slides.findIndex(s=>s.id===state.slideId)+1} / ${slides.length} · ${state.revealStep} 步`;
    document.body.dataset.slideId=state.slideId;document.body.dataset.step=state.revealStep;
  }
});
document.querySelector('#previous').onclick=()=>PresenterContent.request('PREV_STEP');
document.querySelector('#next').onclick=()=>PresenterContent.request('NEXT_STEP');
