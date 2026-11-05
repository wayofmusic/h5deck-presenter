const pages = Array.from(document.querySelectorAll('.slide'));
let current = null;
let demoStep = 0;
let demoRan = false;
const cases = [
  { operands: ['2', '＋', '3'], expected: '5', actual: () => '2' + '3' },
  { operands: ['5', '÷', '0'], expected: '提示「除数不能为 0」', actual: () => String(5 / 0) },
  { operands: ['留空', '−', '2'], expected: '提示「请输入两个数字」', actual: () => String(Number('') - 2) }
];
const feedback = {
  none: '先选一项，再说你还想看什么证据。',
  a: '页面暂时正常。先核对触发条件和改动，再判断能否结案。',
  b: '先记录看到的变化，再用相同条件验证。证据足够了，才写根因。',
  c: '最早的猜测也要验证。可以写成排查假设。'
};
function renderDemo() {
  const view = cases[demoStep - 1];
  const tokens = current.querySelectorAll('.expression span');
  tokens.forEach((token, index) => {
    token.textContent = view.operands[index];
    token.classList.toggle('empty', view.operands[index] === '留空');
  });
  current.querySelector('.expectation').textContent = demoRan ? view.expected : '先说说你期待的结果';
  current.querySelector('.result').textContent = demoRan ? view.actual() : '等你点击计算';
  current.querySelectorAll('.demo-track span').forEach((node, index) => node.classList.toggle('current', index + 1 === demoStep));
}
function applySnapshot(state) {
  const next = pages.find(page => page.dataset.id === state.slideId);
  if (!next) throw new Error('找不到演示页');
  const step = state.revealStep;
  if (next !== current) {
    if (current) current.hidden = true;
    current = next;
    current.hidden = false;
    demoStep = 0;
  }
  current.querySelector('.step-counter').textContent = step;
  current.querySelectorAll('[data-reveal]').forEach(node => {
    const visible = Number(node.dataset.reveal) <= step;
    node.classList.toggle('reserve', !visible);
    node.setAttribute('aria-hidden', String(!visible));
  });
  if (current.classList.contains('demo') && step !== demoStep) {
    demoStep = step;
    demoRan = false;
    renderDemo();
  }
  const widgets = state.publicWidgetState ?? {};
  current.querySelectorAll('[data-check]').forEach(button => {
    const checked = Boolean(widgets[button.dataset.check]);
    button.setAttribute('aria-pressed', String(checked));
    button.querySelector('.tick').textContent = checked ? '✓' : '';
  });
  current.querySelectorAll('[data-answer]').forEach(button => button.setAttribute('aria-pressed', String(widgets.debugChoice === button.dataset.answer)));
  const answerFeedback = current.querySelector('.quiz-feedback');
  if (answerFeedback) answerFeedback.textContent = feedback[widgets.debugChoice] ?? feedback.none;
}
document.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button || !current?.contains(button)) return;
  if (button.hasAttribute('data-run')) {
    demoRan = true;
    renderDemo();
  } else if (button.dataset.check) {
    PresenterContent.request('WIDGET_ACTION', { key: button.dataset.check, value: button.getAttribute('aria-pressed') !== 'true' });
  } else if (button.dataset.answer) {
    PresenterContent.request('WIDGET_ACTION', { key: 'debugChoice', value: button.dataset.answer });
  } else if (button.dataset.nav) {
    PresenterContent.request(button.dataset.nav);
  }
});
PresenterContent.register({
  getSlides: () => pages.map(page => ({ id: page.dataset.id, steps: Number(page.dataset.steps) })),
  applySnapshot
});


