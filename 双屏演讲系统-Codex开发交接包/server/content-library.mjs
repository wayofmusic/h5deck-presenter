import fs from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Transform } from 'node:stream';
import yauzl from 'yauzl';
import yazl from 'yazl';
import Ajv from 'ajv';
import { fileURLToPath } from 'node:url';
import { validateDeck, validWidgetValue } from '../core/state.mjs';

const ROOT=fileURLToPath(new URL('../',import.meta.url));
const json=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const ajv=new Ajv({allErrors:true,strict:true,allowUnionTypes:true});
const checkManifest=ajv.compile(json(path.join(ROOT,'standards/manifest.schema.json')));
const checkNotes=ajv.compile(json(path.join(ROOT,'standards/notes.schema.json')));
export const limits={compressed:64*1024*1024,total:200*1024*1024,file:25*1024*1024,entries:2048};
export const contentError=(status,message)=>Object.assign(Error(message),{status});

export function safeRelative(name) {
  if(typeof name!=='string'||!name||name.length>180||name.includes('\\')||name.includes('\0')||name.startsWith('/')) throw contentError(400,'内容包路径无效');
  const parts=name.split('/');
  if(parts.some(p=>!p||p==='.'||p==='..'||/[<>:"|?*]/.test(p)||/[. ]$/.test(p)||/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i.test(p))) throw contentError(400,'内容包包含越界或不可移植路径');
  return name;
}
export function contained(base,relative) {
  safeRelative(relative); const result=path.resolve(base,...relative.split('/'));
  if(!result.startsWith(path.resolve(base)+path.sep)) throw contentError(400,'资源路径越界');
  return result;
}
function filesIn(folder,prefix='') {
  const result=[];
  for(const entry of fs.readdirSync(folder,{withFileTypes:true})) {
    const name=prefix+entry.name;safeRelative(name);
    const absolute=path.join(folder,entry.name);
    if(entry.isSymbolicLink()) throw contentError(400,'内容包不能包含符号链接');
    if(entry.isDirectory()) result.push(...filesIn(absolute,name+'/'));
    else if(entry.isFile()) result.push({name,file:absolute,size:fs.statSync(absolute).size});
    else throw contentError(400,'内容包包含不支持的文件类型');
  }
  return result;
}
const schemaError=(label,check)=>contentError(400,`${label}格式无效：${ajv.errorsText(check.errors,{separator:'；'})}`);

export function validateContentDirectory(folder) {
  const files=filesIn(folder);
  if(files.length>limits.entries||files.some(f=>f.size>limits.file)||files.reduce((a,f)=>a+f.size,0)>limits.total) throw contentError(413,'内容包超过文件或体积限制');
  const names=new Set();
  for(const f of files) {const key=f.name.toLowerCase();if(names.has(key)) throw contentError(400,'内容包有大小写冲突文件');names.add(key);}
  let manifest,notes;
  try {manifest=json(contained(folder,'manifest.json'));} catch {throw contentError(400,'内容包根目录需要有效的 manifest.json');}
  if(!checkManifest(manifest)) throw schemaError('清单',checkManifest);
  for(const p of [manifest.entry,manifest.adapter.path,manifest.notes]) {
    contained(folder,p);
    if(!files.some(file=>file.name===p)) throw contentError(400,`缺少内容包文件或路径大小写不一致：${p}`);
  }
  if(manifest.revision.includes('..')||!manifest.entry.endsWith('.html')||!manifest.adapter.path.endsWith('.js')) throw contentError(400,'版本、HTML 入口或适配脚本无效');
  if(manifest.entry.toLowerCase().startsWith('private/')||manifest.adapter.path.toLowerCase().startsWith('private/')) throw contentError(400,'公开入口不能放在私有目录');
  if([manifest.entry,manifest.adapter.path,'manifest.json'].includes(manifest.notes)) throw contentError(400,'讲稿文件不能与公开入口重合');
  try {notes=json(contained(folder,manifest.notes));} catch {throw contentError(400,'讲稿 JSON 无法读取');}
  if(!checkNotes(notes)) throw schemaError('讲稿',checkNotes);
  if(notes.deckId!==manifest.deckId||notes.revision!==manifest.revision) throw contentError(400,'讲稿与课件版本不匹配');
  try{validateDeck(manifest,notes.slides);}catch(error){throw contentError(400,error.message);}
  const slideIds=new Set(manifest.slides.map(s=>s.id));
  if(Object.keys(notes.slides).some(id=>!slideIds.has(id))) throw contentError(400,'讲稿包含未声明的页面');
  const paragraphIds=new Set();
  for(const s of manifest.slides) {
    if(s.chapter>=manifest.chapters.length||(!manifest.capabilities.reveal&&s.steps!==1)) throw contentError(400,'章节或展开能力声明不一致');
    for(const p of notes.slides[s.id].paragraphs) {if(paragraphIds.has(p.id)) throw contentError(400,'讲稿段落 ID 重复');paragraphIds.add(p.id);}
  }
  if(!manifest.capabilities.widgetSnapshot&&Object.keys(manifest.widgets||{}).length) throw contentError(400,'互动状态能力未启用');
  for(const rule of Object.values(manifest.widgets||{})) if(!validWidgetValue(rule,rule.initial)) throw contentError(400,'互动初始状态无效');
  const publicFiles=new Set(files.map(f=>f.name).filter(name=>name!=='manifest.json'&&name!==manifest.notes&&!name.toLowerCase().startsWith('private/')));
  for(const file of files.filter(f=>/\.(html|css)$/i.test(f.name))) {
    if(!publicFiles.has(file.name))continue;
    const text=fs.readFileSync(file.file,'utf8');
    const references=[...text.matchAll(/(?:src|href)\s*=\s*["']([^"']+)["']/gi),...text.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi),...text.matchAll(/@import\s+["']([^"']+)["']/gi)];
    for(const match of references) {
      const ref=match[1].trim();if(ref.startsWith('#')||/^(data|blob):/i.test(ref)||ref==='/sdk/presenter-sdk.js')continue;
      if(ref.startsWith('/')||/^[a-z][a-z0-9+.-]*:/i.test(ref)||ref.includes('\\'))throw contentError(400,`仅支持包内资源：${ref}`);
      let decoded;try{decoded=decodeURIComponent(ref.split(/[?#]/)[0]);}catch{throw contentError(400,'资源地址编码无效');}
      const segments=file.name.split('/').slice(0,-1);
      for(const part of decoded.split('/')) {if(part==='..'){if(!segments.length)throw contentError(400,'资源引用越界');segments.pop();}else if(part&&part!=='.')segments.push(part);}
      const resolved=segments.join('/');safeRelative(resolved);
      if(!publicFiles.has(resolved))throw contentError(400,`资源缺失或引用了私有文件：${resolved}`);
    }
  }
  return {manifest,script:notes.slides,folder:path.resolve(folder),publicFiles,files:files.length,bytes:files.reduce((a,f)=>a+f.size,0)};
}

export async function packContentDirectory(folder,output) {
  const validated=validateContentDirectory(folder);
  if(path.resolve(output).startsWith(path.resolve(folder)+path.sep)) throw contentError(400,'输出包应放在内容目录之外');
  if(fs.existsSync(output)) throw contentError(409,'输出文件已存在，请使用新文件名');
  fs.mkdirSync(path.dirname(path.resolve(output)),{recursive:true});
  const zip=new yazl.ZipFile();
  const done=pipeline(zip.outputStream,fs.createWriteStream(output,{flags:'wx'}));
  for(const file of filesIn(folder)) zip.addFile(file.file,file.name);
  zip.end();await done;return validated;
}

async function unpackBuffer(buffer,folder) {
  if(buffer.length>limits.compressed) throw contentError(413,'压缩包不能超过 64 MB');
  const zip=await new Promise((resolve,reject)=>yauzl.fromBuffer(buffer,{lazyEntries:true,validateEntrySizes:true,strictFileNames:true},(error,value)=>error?reject(contentError(400,'不是有效的 ZIP 内容包')):resolve(value)));
  let declared=0,actual=0,count=0;const names=new Set();
  try {
    await new Promise((resolve,reject)=>{
      let failed=false;const stop=error=>{if(!failed){failed=true;zip.close();reject(error);}};
      zip.on('error',stop);zip.on('end',resolve);
      zip.on('entry',entry=>{
        (async()=>{
          if(++count>limits.entries) throw contentError(413,'内容包文件数量过多');
          const directory=entry.fileName.endsWith('/');const relative=safeRelative(directory?entry.fileName.slice(0,-1):entry.fileName);
          const lower=relative.toLowerCase();if(names.has(lower)) throw contentError(400,'内容包包含重复或大小写冲突路径');names.add(lower);
          if((entry.generalPurposeBitFlag&1)||((entry.externalFileAttributes>>>16)&0xf000)===0xa000) throw contentError(400,'不支持加密文件或符号链接');
          declared+=entry.uncompressedSize;
          if(entry.uncompressedSize>limits.file||declared>limits.total) throw contentError(413,'内容包解压后过大');
          const destination=contained(folder,relative);
          if(directory) fs.mkdirSync(destination,{recursive:true});
          else {
            fs.mkdirSync(path.dirname(destination),{recursive:true});
            const stream=await new Promise((r,j)=>zip.openReadStream(entry,(e,s)=>e?j(e):r(s)));
            let size=0;
            const limiter=new Transform({transform(chunk,encoding,callback){size+=chunk.length;actual+=chunk.length;callback(size>limits.file||actual>limits.total?contentError(413,'解压内容超过体积限制'):null,chunk);}});
            await pipeline(stream,limiter,fs.createWriteStream(destination,{flags:'wx'}));
          }
          if(!failed) zip.readEntry();
        })().catch(stop);
      });zip.readEntry();
    });
  } catch(error) {throw error.status?error:contentError(400,`无法读取内容包：${error.message}`);} finally {zip.close();}
}

function removeTemporary(base,folder) {
  const resolved=path.resolve(folder);
  if(!resolved.startsWith(path.resolve(base)+path.sep)||!path.basename(resolved).startsWith('.import-')) throw Error('临时目录边界无效');
  fs.rmSync(resolved,{recursive:true,force:true});
}
export class ContentLibrary {
  constructor(directory) {this.directory=path.resolve(directory);fs.mkdirSync(this.directory,{recursive:true});}
  list() {
    const decks=[],warnings=[];
    for(const entry of fs.readdirSync(this.directory,{withFileTypes:true})) {
      if(!entry.isDirectory()||entry.name.startsWith('.')) continue;
      try {const data=validateContentDirectory(path.join(this.directory,entry.name));decks.push({...data,key:`${data.manifest.deckId}@${data.manifest.revision}`,kind:'package'});} catch(error) {warnings.push(`${entry.name}：${error.message}`);}
    }
    return {decks,warnings};
  }
  async import(buffer) {
    const temporary=fs.mkdtempSync(path.join(this.directory,'.import-'));
    try {
      await unpackBuffer(buffer,temporary);
      const deck=validateContentDirectory(temporary);const key=`${deck.manifest.deckId}@${deck.manifest.revision}`;
      const target=path.resolve(this.directory,key);
      if(!target.startsWith(this.directory+path.sep)) throw contentError(400,'内容目录无效');
      if(fs.existsSync(target)) throw contentError(409,'相同课件版本已存在；修改 revision 后再导入');
      fs.renameSync(temporary,target);
      return {...deck,folder:target,key,kind:'package'};
    } finally {if(fs.existsSync(temporary)) removeTemporary(this.directory,temporary);}
  }
}
