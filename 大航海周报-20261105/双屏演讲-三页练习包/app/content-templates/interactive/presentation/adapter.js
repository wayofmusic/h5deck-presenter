const slides=[{id:'welcome',steps:1},{id:'choose',steps:2},{id:'reflect',steps:1}];
const labels={none:'还没有选择，可以返回上一页试一试。',practice:'先做一次练习，从行动中发现问题。',lecture:'先听一个例子，从故事中理解方法。'};
PresenterContent.register({
  getSlides:()=>slides,
  applySnapshot(state){
    document.querySelectorAll('[data-slide]').forEach(node=>node.hidden=node.dataset.slide!==state.slideId);
    document.querySelectorAll('[data-slide] [data-step]').forEach(node=>node.hidden=Number(node.dataset.step)>state.revealStep);
    const choice=state.publicWidgetState.choice||'none';
    document.querySelectorAll('[data-choice]').forEach(button=>button.classList.toggle('selected',button.dataset.choice===choice));
    document.querySelector('#result').textContent=labels[choice];document.querySelector('#reflection').textContent=labels[choice];
    document.querySelector('#position').textContent=`${slides.findIndex(s=>s.id===state.slideId)+1} / ${slides.length} · ${state.revealStep} 步`;
    document.body.dataset.slideId=state.slideId;document.body.dataset.step=state.revealStep;
  }
});
document.querySelectorAll('[data-choice]').forEach(button=>button.onclick=()=>PresenterContent.request('WIDGET_ACTION',{key:'choice',value:button.dataset.choice}));
document.querySelector('#previous').onclick=()=>PresenterContent.request('PREV_STEP');document.querySelector('#next').onclick=()=>PresenterContent.request('NEXT_STEP');
