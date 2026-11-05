const pages = [...document.querySelectorAll('.slide')];
let active;
let previousStep = 0;
PresenterContent.register({
  getSlides: () => pages.map(page => ({id:page.dataset.id, steps:Number(page.dataset.steps)})),
  applySnapshot(state) {
    const next = pages.find(page => page.dataset.id === state.slideId);
    if (!next) throw new Error('当前页未找到');
    const step = state.revealStep;
    const changed = next !== active;
    if (!changed && previousStep === step) return;
    if (changed && active) active.hidden = true;
    next.querySelectorAll('[data-show]').forEach(node => {
      const show = Number(node.dataset.show);
      const until = Number(node.dataset.until || Infinity);
      const visible = show <= step && step <= until;
      node.classList.toggle('pending', !visible);
      node.setAttribute('aria-hidden', String(!visible));
      node.classList.toggle('fresh', !changed && step > previousStep && show === step && visible);
    });
    active = next;
    active.hidden = false;
    active.querySelector('.step').textContent = step;
    previousStep = step;
  }
});
document.addEventListener('click',event=>{
  const button = event.target.closest('[data-command]');
  if (button && active?.contains(button)) PresenterContent.request(button.dataset.command);
});

