const fs=require('fs');const path=require('path');const vm=require('vm');
const root=path.resolve(__dirname,'..'),out=path.join(root,'outputs');fs.mkdirSync(out,{recursive:true});
const content=fs.readFileSync(path.join(__dirname,'content.js'),'utf8');
const data=JSON.parse(vm.runInNewContext(content+'\nJSON.stringify({chapters:CHAPTERS,slides:SLIDES})'));
let html=fs.readFileSync(path.join(__dirname,'shell.html'),'utf8');
const css=fs.readFileSync(path.join(__dirname,'style.css'),'utf8')+'\n'+fs.readFileSync(path.join(__dirname,'keynote.css'),'utf8');
const replacements={STYLE:css,CONTENT:content,APP:fs.readFileSync(path.join(__dirname,'app.js'),'utf8'),PORTRAIT:'data:image/png;base64,'+fs.readFileSync(path.join(out,'个人资料','柴翔形象照.png')).toString('base64'),WECHAT:'data:image/jpeg;base64,'+fs.readFileSync(path.join(out,'个人资料','柴翔微信二维码.jpg')).toString('base64')};
for(const [i,n] of ['Y模型','判断','系统','积累'].entries())replacements['TED'+(i+1)]='data:image/png;base64,'+fs.readFileSync(path.join(out,'TED配图',`0${i+1}-${n}.png`)).toString('base64');
for(const [i,n] of ['演讲轻纹理','AI轻纹理'].entries())replacements['LIGHT'+(i+1)]='data:image/png;base64,'+fs.readFileSync(path.join(out,'TED配图',`0${i+5}-${n}.png`)).toString('base64');
for(const [k,v]of Object.entries(replacements))html=html.replace('/*'+k+'*/',()=>v);
const file=path.join(out,'柴翔-Y模型与AI长期竞争力-演讲版.html');fs.writeFileSync(file,html,'utf8');
const mmss=n=>String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');
let elapsed=0;const notes='# 如何用 Y 模型构建 AI 时代下的长期竞争力\n\n柴翔｜商业表达教练、AI 应用实战讲师\n\n32 页，计划总时长 60 分钟。根据本次提供的逐字稿编排为逐页演讲提示，屏幕只保留关键词。\n\n'+data.slides.map((s,i)=>{const start=elapsed;elapsed+=s.seconds;return`## ${String(i+1).padStart(2,'0')} ${s.title.replaceAll('\n',' ')}\n\n计划 ${mmss(start)}–${mmss(elapsed)}，本页 ${mmss(s.seconds)}\n\n现场提示：${s.cue}\n\n${s.notes}\n`}).join('\n');
fs.writeFileSync(path.join(out,'逐页演讲稿与提示.md'),'\uFEFF'+notes,'utf8');
const readme=`# 柴翔｜Y 模型与 AI 长期竞争力\n\n这是一套覆盖整场约 60 分钟分享的 32 页、16:9 演讲型网页 PPT。最后一页包含柴翔形象照、简短介绍与微信二维码。\n\n## 打开\n\n解压后，用 Chrome 或 Edge 双击打开“柴翔-Y模型与AI长期竞争力-演讲版.html”。HTML 单文件已包含全部内容与图片，不需要联网、安装或启动服务。\n\n## 演讲\n\n- 空格、右方向键：渐进展开，再翻页。左方向键返回。\n- Shift + 右方向键：直接下一页。Home / End：首页 / 尾页。\n- O：目录；N：打开或收起演讲提示；F：全屏；T：开始或暂停计时。\n- R：重播本页；B：黑屏，点击或任意键恢复；?：查看帮助。\n- 控制栏会在静止约 4.5 秒后淡出，移动鼠标或按键即可出现。\n- 备注区包含逐页讲稿、现场节奏、计划时间与下一页提示；显示在同一窗口，投屏时按 N 收起。\n- 移动端支持滑动与底部大按钮，推荐横屏。\n\n## 互动\n\n第 9、25、30 页为可点击的 Y 模型，第 30 页带五分钟练习计时。点击五个 Step 或理论、事实、认知等节点填写。可以切换“模型讲解 / 企业培训案例 / 我的 90 天”三张独立画布。\n\n画布可保存在当前浏览器，支持导出 Markdown 文字版、JSON 备份与重新导入。不同浏览器、移动文件位置、隐私模式可能影响本地保存，请填写后导出备份。点击清空前会再次确认。\n\n## 内容依据\n\n- Y 模型：用户提供的 Y模型(2).pptx，2 页，原始宽高比约 8:3，已直接导出并逐页检查。网页已移除原稿入口及原始 PPT 图片。\n- 完整保留 Step1:范围、Step2:目标、Step3:框架、Step4:预判、Step5:配套；理论与事实和我的认知的双向关系；知行合一的因果规律；解决真正问题。\n- 使用现成模型/规律、自己建模型、提出新假设、定性定量均保留。讲稿中关于科学类比、假设驱动、提炼模型与持续迭代的说明放入备注，未替换原模型标签。\n- 个人经历、2011 / 2014 / 2020以后 / 2024以后路线，以及企业培训案例来自本次提供的讲稿。没有虚构企业名称、客户数量、收入或效率成果。\n- 三个月减少三成只是待验证目标示例；“多、好、快”和个人能力系统为讲稿中的个人理解；真实流程转换自动化仍保留“当时尚未稳定”的边界。\n\n## 文件\n\n- 演讲版 HTML：主成品，单文件即可离线运行。\n- 逐页演讲稿与提示.md：便于独立阅读和备讲。\n- 个人资料：原始形象照与微信二维码，已嵌入 HTML。\n\n设计：关键词大字、黑白红交替、四幅原创 TED 式概念配图、两幅演讲与 AI 白底浅纹理、原模型五个 Step、原生矢量关系图和渐进展开。舞台只呈现关键词，解释留在备注区。\n`;
fs.writeFileSync(path.join(out,'使用说明.md'),'\uFEFF'+readme,'utf8');
fs.writeFileSync(path.join(__dirname,'content-audit.json'),JSON.stringify({slides:data.slides.length,seconds:elapsed,notesCharacters:notes.length,chapters:data.chapters},null,2));
console.log(JSON.stringify({file,slides:data.slides.length,seconds:elapsed,bytes:Buffer.byteLength(html),notesCharacters:notes.length}));


