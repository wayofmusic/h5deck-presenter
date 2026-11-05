import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {pipeline} from 'node:stream/promises';
import {fileURLToPath} from 'node:url';
import yazl from 'yazl';

const source=fileURLToPath(new URL('../',import.meta.url));
const version=JSON.parse(fs.readFileSync(path.join(source,'package.json'),'utf8')).version;
const shortVersion=version.split('.').slice(0,2).join('.');
const args=process.argv.slice(2);
const outputAt=args.indexOf('--output');
const output=path.resolve(outputAt>=0?args[outputAt+1]:path.join(source,'..',`双屏演讲平台-v${shortVersion}-完整交付包.zip`));
if(!output.endsWith('.zip'))throw Error('交付文件必须为 ZIP');
if(fs.existsSync(output)&&!args.includes('--replace'))throw Error('交付包已存在，使用新名称或 --replace 更新');
const stageParent=path.join(path.dirname(output),'.delivery');fs.mkdirSync(stageParent,{recursive:true});
const snapshot=fs.mkdtempSync(path.join(stageParent,'platform-'));
const root=path.join(snapshot,`双屏演讲平台-v${shortVersion}`),app=path.join(root,'app'),docs=path.join(root,'文档'),reuse=path.join(root,'开发复用');
for(const directory of [app,docs,reuse,path.join(root,'data'),path.join(root,'示例内容包')])fs.mkdirSync(directory,{recursive:true});
for(const folder of ['baseline','clients','core','decks','dist','node_modules','packaging','runtime','server','verification','standards','content-templates']) {
  if(fs.existsSync(path.join(source,folder)))fs.cpSync(path.join(source,folder),path.join(app,folder),{recursive:true});
}
for(const file of ['package.json','package-lock.json','SOURCE-MANIFEST.json','.node-version','启动双屏演讲.cmd','停止双屏演讲.cmd'])fs.copyFileSync(path.join(source,file),path.join(app,file));
for(const entry of fs.readdirSync(source,{withFileTypes:true}))if(entry.isFile()&&entry.name.endsWith('.md'))fs.copyFileSync(path.join(source,entry.name),path.join(docs,entry.name));
for(const folder of ['docs','standards'])fs.cpSync(path.join(source,folder),path.join(docs,folder),{recursive:true});
for(const name of ['basic','interactive'])fs.copyFileSync(path.join(source,'dist/content-packs',name+'.h5deck'),path.join(root,'示例内容包',name+'.h5deck'));
const skillCandidates=[path.join(process.env.CODEX_HOME||path.join(os.homedir(),'.codex'),'skills/h5-phone-presenter'),path.join(source,'../开发复用/h5-phone-presenter')];
const skill=skillCandidates.find(file=>fs.existsSync(path.join(file,'SKILL.md')));
if(skill)fs.cpSync(skill,path.join(reuse,'h5-phone-presenter'),{recursive:true});
fs.writeFileSync(path.join(root,'启动双屏演讲.cmd'),'@echo off\r\nchcp 65001 >nul\r\nsetlocal\r\nset "PRESENTER_DATA_DIR=%~dp0data"\r\ncall "%~dp0app\\启动双屏演讲.cmd"\r\nendlocal\r\n','utf8');
fs.writeFileSync(path.join(root,'停止双屏演讲.cmd'),'@echo off\r\nchcp 65001 >nul\r\ncall "%~dp0app\\停止双屏演讲.cmd"\r\n','utf8');
fs.writeFileSync(path.join(root,'data/数据目录说明.md'),'# 平台数据\n\n顶层启动入口将导入的课件库和设置保存在本目录。备份请复制整个 data；更新程序时保留此目录。交付包不携带开发期间的导入内容、日志或会话凭据。\n','utf8');
fs.writeFileSync(path.join(root,'使用说明.md'),`# 双屏演讲平台 v${shortVersion}｜完整交付包

先完整解压，再双击顶层“启动双屏演讲.cmd”；结束后台服务用“停止双屏演讲.cmd”。运行时与依赖已附带。

## 同一平台添加课程

1. 工作台点击“导入内容包”，选择“示例内容包”中的 basic.h5deck 或 interactive.h5deck。
2. 在“当前课件”选择该课程，打开投屏，手机扫码配对。
3. 手机看稿并控制展开，电脑按键与页面内按钮也会同步。
4. 切课后重新扫码；导入失败不会切走当前课程。同一课程版本不覆盖。

当前保留原 32 页课件和三页兼容样例。标准包运行于内容沙箱，私有讲稿通过授权接口获取。

## 文件位置

- [当前能力与验收](文档/STATUS.md)
- [标准内容包制作指南](文档/03-标准内容包制作指南.md)
- [顶层开发文档](文档/00-顶层开发文档.md)
- [过程与复用手册](文档/01-开发复盘与复用手册.md)
- 示例内容包：两个可导入样例。
- app：源码、运行环境、SDK、Schema 与内容模板。
- data：导入内容与设置，升级时保留，备份时复制。
- 开发复用：本次工作流技能材料（如当前构建环境具备）。

## 制作新内容

在 app 目录使用包内 runtime/node.exe 调用 packaging/content-cli.mjs：init 建立模板，validate 检查，pack 生成 .h5deck。详见制作指南。

HTML 必须接平台 SDK 并满足 v1 清单和备注标准。任意网页、PPTX 无损转换、内置 AI 自动制作、桌面安装器、眼镜与多人授课尚未实现。

v0.2 已完成自动化和浏览器回归；两部手机的成功反馈来自 v0.1，新增包导入与沙箱流程需要真机复测。长时间与干净 Windows 仍按 STATUS 保留待验收。

包内原课件含私人讲稿、肖像与联系二维码，仅按本项目用途使用。新课程可从匿名标准模板制作，不自动复制这些资料。
`,'utf8');
fs.writeFileSync(path.join(app,'README.md'),'# 平台源码与运行环境\n\n普通使用从上一级启动入口进入。开发先读[顶层文档](../文档/00-顶层开发文档.md)，制作内容看[制作指南](../文档/03-标准内容包制作指南.md)。\n','utf8');
fs.writeFileSync(path.join(reuse,'使用说明.md'),'# 开发复用\n\n如包内含 h5-phone-presenter，可让 Codex 按其 SKILL.md 文件读取流程。匿名数据样例与完整标准内容包分别说明，当前平台功能与制作标准以文档中的 v0.2 指南为准。\n','utf8');
const temporaryOutput=output+'.'+crypto.randomBytes(5).toString('hex')+'.tmp';
const zip=new yazl.ZipFile();const done=pipeline(zip.outputStream,fs.createWriteStream(temporaryOutput,{flags:'wx'}));
function add(folder,prefix){for(const entry of fs.readdirSync(folder,{withFileTypes:true})){const absolute=path.join(folder,entry.name),relative=prefix+entry.name;if(entry.isSymbolicLink())throw Error('交付目录不能包含符号链接');if(entry.isDirectory())add(absolute,relative+'/');else zip.addFile(absolute,relative);}}
add(root,path.basename(root)+'/');zip.end();await done;fs.renameSync(temporaryOutput,output);
const result={archive:output,bytes:fs.statSync(output).size,root,snapshot,version};
fs.writeFileSync(path.join(stageParent,'latest-platform.json'),JSON.stringify(result,null,2),'utf8');
console.log(JSON.stringify(result));
