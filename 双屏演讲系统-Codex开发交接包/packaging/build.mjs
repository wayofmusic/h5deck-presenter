import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { validateDeck } from '../core/state.mjs';
import { buildContentExamples } from './build-content.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
const source = path.join(root, 'baseline/work');
const output = path.join(root, 'dist');
fs.mkdirSync(output, { recursive: true });
if(fs.existsSync(path.join(source,'content.js'))) {
// Trusted, bundled content source. No user-supplied scripts are evaluated here.
const data = new Function(fs.readFileSync(path.join(source, 'content.js'), 'utf8') + '\nreturn {chapters:CHAPTERS,slides:SLIDES};')();
const steps = { questions: 3, agenda: 3, horse: 3, three: 3, support: 5, methods: 3, timeline: 4, coproduce: 4, systems: 6, tests: 4, failure: 2, four: 4, formula: 4, assets: 4, closing: 3 };
const revision = crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex').slice(0, 12);
const manifest = { schemaVersion: 1, deckId: 'chaixiang-ai-y', revision, title: 'Y 模型与 AI 长期竞争力', renderer: 'chaixiang', speaker: { name: '柴翔' }, chapters: data.chapters,
  slides: data.slides.map((s, i) => ({ ...Object.fromEntries(Object.entries(s).filter(([k]) => !['notes','cue'].includes(k))), id: `cx-${String(i + 1).padStart(2, '0')}`, steps: steps[s.kind] || 1 })) };
manifest.widgets={systemMode:{type:'integer',initial:0,min:0,max:1},selectedCause:{type:'integer',min:0,max:4},selectedGrowth:{type:'integer',initial:2,min:0,max:2},selectedScene:{type:'integer',initial:0,min:0,max:5}};
// The original renderer reveals step 1 immediately, and its remaining fragment count is the upper bound.
for (const s of manifest.slides) if (s.kind === 'methods' || s.kind === 'formula') s.steps = s.items.length;
const script = Object.fromEntries(data.slides.map((s, i) => [manifest.slides[i].id, { cue: s.cue, paragraphs: s.notes.split(/\n+/).filter(Boolean).map((text, n) => ({ id: `${manifest.slides[i].id}-p${n+1}`, text })) }]));
validateDeck(manifest, script);
const deckOut = path.join(output, 'chaixiang-ai-y'); fs.mkdirSync(deckOut, { recursive: true });
fs.writeFileSync(path.join(deckOut, 'manifest.json'), JSON.stringify(manifest));
fs.writeFileSync(path.join(deckOut, 'script.json'), JSON.stringify(script));
fs.cpSync(path.join(root, 'baseline/outputs/TED配图'), path.join(deckOut, 'assets/artwork'), { recursive: true });
fs.cpSync(path.join(root, 'baseline/outputs/个人资料'), path.join(deckOut, 'assets/speaker'), { recursive: true });
let renderer = fs.readFileSync(path.join(source, 'app.js'), 'utf8');
const replacements = { TED1: 'artwork/01-Y模型.png', TED2: 'artwork/02-判断.png', TED3: 'artwork/03-系统.png', TED4: 'artwork/04-积累.png', LIGHT1: 'artwork/05-演讲轻纹理.png', LIGHT2: 'artwork/06-AI轻纹理.png', PORTRAIT: 'speaker/柴翔形象照.png', WECHAT: 'speaker/柴翔微信二维码.jpg' };
for (const [key, value] of Object.entries(replacements)) renderer = renderer.replace(`/*${key}*/`, `/assets/chaixiang-ai-y/${value}`);
renderer = renderer.replace("const STORAGE='chaixiang-y-keynote-v1';", "const STORAGE='presenter:chaixiang-ai-y:canvas:v1';");
renderer = renderer.replace(/let reduced=false;try\{reduced=localStorage[^\n]+/, 'let reduced=false;');
renderer = renderer.replace(/^function notesMarkdown\(\).*$/m, "function notesMarkdown(){return ''}");
renderer = renderer.replace(/^function toggleNotes\(\).*$/m, 'function toggleNotes(){}');
renderer = renderer.replace(/^.*\$\('#note-title'\).*$/m, '');
renderer = renderer.replace(/^.*\$\('#note-cue'\).*$/m, '');
renderer = renderer.replace(/^function go\(n\).*$/m, "function go(n){window.presenterDispatch?.('GOTO_SLIDE',{slideId:SLIDES[Math.max(0,Math.min(SLIDES.length-1,n))].id})}");
renderer = renderer.replace(/^function next\(direct=false\).*$/m, "function next(direct=false){window.presenterDispatch?.(direct?'NEXT_SLIDE':'NEXT_STEP')}");
renderer = renderer.replace(/^function prev\(\).*$/m, "function prev(){window.presenterDispatch?.('PREV_STEP')}");
renderer = renderer.replace(/^function toggleTimer\(\).*$/m, "function toggleTimer(){window.presenterDispatch?.(timerRunning?'TIMER_PAUSE':'TIMER_START')}");
renderer = renderer.replace(/^function toggleExercise\(\).*$/m, "function toggleExercise(){window.presenterDispatch?.(exerciseRunning?'EXERCISE_PAUSE':'EXERCISE_START')}");
fs.writeFileSync(path.join(deckOut, 'renderer.js'), renderer);
const css = fs.readFileSync(path.join(source, 'style.css'), 'utf8') + '\n' + fs.readFileSync(path.join(source, 'keynote.css'), 'utf8');
fs.writeFileSync(path.join(deckOut, 'style.css'), css);
let html = fs.readFileSync(path.join(source, 'shell.html'), 'utf8');
html = html.replace('<p><kbd>N</kbd><span>打开或关闭演讲提示</span></p>', '<p><kbd>C</kbd><span>单机接管后，以当前画面恢复遥控</span></p>');
html = html.replace('点击“提示”可查看每页讲稿、节奏与下一页。', '逐字稿请在手机或本机看稿页查看。');
html = html.replace('<style>/*STYLE*/</style>', '<link rel="stylesheet" href="/deck-style.css"><link rel="stylesheet" href="/clients/display/display.css">');
html = html.replace('<script>/*CONTENT*/</script><script>/*APP*/</script>', '<script src="/deck-content.js"></script><script src="/deck-renderer.js"></script><script type="module" src="/clients/display/adapter.mjs"></script>');
fs.writeFileSync(path.join(deckOut, 'display.html'), html);
const demo = JSON.parse(fs.readFileSync(path.join(root, 'decks/reuse-demo/deck.json')));
const demoScript = JSON.parse(fs.readFileSync(path.join(root, 'decks/reuse-demo/script.json')));
validateDeck(demo, demoScript);
console.log(`构建完成：${manifest.slides.length} 页主课件、${demo.slides.length} 页复用课件；公开内容与私有讲稿分开。`);
}
await buildContentExamples();
console.log('标准基础包与互动包已生成。');
