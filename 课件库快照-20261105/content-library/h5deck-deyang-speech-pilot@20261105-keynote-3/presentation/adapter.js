const pages = [...document.querySelectorAll('.slide')];
const pageCount = document.querySelector('.page');
let active;
let previousStep = 0;

PresenterContent.register({
  getSlides: () => pages.map(page => ({ id: page.dataset.id, steps: Number(page.dataset.steps) })),
  applySnapshot(state) {
    const next = pages.find(page => page.dataset.id === state.slideId);
    if (!next) throw new Error('找不到当前演示页');
    const step = state.revealStep;
    const changedPage = next !== active;
    if (!changedPage && step === previousStep) return;
    if (changedPage && active) active.hidden = true;
    next.querySelectorAll('[data-reveal]').forEach(element => {
      const targetStep = Number(element.dataset.reveal);
      const visible = targetStep <= step;
      const entered = !changedPage && step > previousStep && targetStep === step;
      element.setAttribute('aria-hidden', String(!visible || element.dataset.effect === 'draw'));
      element.classList.toggle('shown', visible);
      element.classList.toggle('revealed-now', entered);
    });
    active = next;
    active.hidden = false;
    previousStep = step;
    const pos = String(pages.indexOf(active) + 1).padStart(2, '0') + ' / ' + String(pages.length).padStart(2, '0');
    const count = Number(active.dataset.steps);
    pageCount.textContent = count > 1 ? pos + ' · ' + step + '/' + count : pos;
  }
});
document.querySelectorAll('[data-nav]').forEach(button => {
  button.addEventListener('click', () => PresenterContent.request(button.dataset.nav));
});

