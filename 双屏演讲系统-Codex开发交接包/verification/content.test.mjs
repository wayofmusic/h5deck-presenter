import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import yazl from 'yazl';
import {ContentLibrary,validateContentDirectory,safeRelative,limits} from '../server/content-library.mjs';
import {createPresenterServer} from '../server/index.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const temporary=()=>fs.mkdtempSync(path.join(os.tmpdir(),'presenter-content-test-'));
async function zipped(entries) {
  const zip=new yazl.ZipFile(),chunks=[];
  const done=new Promise((resolve,reject)=>{zip.outputStream.on('data',chunk=>chunks.push(chunk));zip.outputStream.on('end',()=>resolve(Buffer.concat(chunks)));zip.outputStream.on('error',reject);});
  for(const [name,text]of Object.entries(entries))zip.addBuffer(Buffer.from(text),name);
  zip.end();return done;
}
function sourceEntries(folder) {
  const entries={};
  const walk=(dir,prefix='')=>{for(const e of fs.readdirSync(dir,{withFileTypes:true})){if(e.isDirectory())walk(path.join(dir,e.name),prefix+e.name+'/');else entries[prefix+e.name]=fs.readFileSync(path.join(dir,e.name),'utf8');}};
  walk(folder);return entries;
}
test('both standard packages import, persist and retain independent widget contracts',async()=>{
  const directory=temporary(),library=new ContentLibrary(directory);
  const a=await library.import(fs.readFileSync(path.join(root,'dist/content-packs/basic.h5deck')));
  const b=await library.import(fs.readFileSync(path.join(root,'dist/content-packs/interactive.h5deck')));
  assert.equal(a.manifest.slides.length,3);assert.equal(b.manifest.widgets.choice.initial,'none');
  assert.ok(!a.publicFiles.has('private/notes.json'));assert.ok(a.publicFiles.has('presentation/index.html'));
  assert.equal(new ContentLibrary(directory).list().decks.length,2);
  await assert.rejects(()=>library.import(fs.readFileSync(path.join(root,'dist/content-packs/basic.h5deck'))),e=>e.status===409);
});
test('bad schemas, missing notes, missing assets and version mismatches produce clear rejection',async()=>{
  const directory=temporary(),library=new ContentLibrary(directory);
  for(const mutation of [
    entries=>{const m=JSON.parse(entries['manifest.json']);m.slides[1].id=m.slides[0].id;entries['manifest.json']=JSON.stringify(m);},
    entries=>{delete entries['private/notes.json'];},
    entries=>{const m=JSON.parse(entries['manifest.json']);m.entry='presentation';entries['manifest.json']=JSON.stringify(m);},
    entries=>{const m=JSON.parse(entries['manifest.json']);m.entry='Presentation/index.html';entries['manifest.json']=JSON.stringify(m);},
    entries=>{entries['presentation/index.html']+='<img src="missing.png">';},
    entries=>{const n=JSON.parse(entries['private/notes.json']);n.revision='other';entries['private/notes.json']=JSON.stringify(n);},
    entries=>{const m=JSON.parse(entries['manifest.json']);m.packageFormat='unknown';entries['manifest.json']=JSON.stringify(m);},
    entries=>{entries['presentation/index.html']+='<script src="../private/notes.json"></script>';}
  ]) {
    const entries=sourceEntries(path.join(root,'content-templates/basic'));mutation(entries);
    await assert.rejects(()=>zipped(entries).then(buffer=>library.import(buffer)),e=>e.status===400);
  }
  assert.equal(library.list().decks.length,0);
  assert.equal(fs.readdirSync(directory).length,0);
});
test('zip traversal, case collisions, broken archives and oversized entries are rejected',async()=>{
  const library=new ContentLibrary(temporary());
  for(const name of ['../file','/file','a\\b','a/../b','CON.txt','a/x.'])assert.throws(()=>safeRelative(name));
  const escape=await zipped({'aa/x':'bad'});
  for(let index=0;index<=escape.length-4;index++) if(escape.subarray(index,index+4).equals(Buffer.from('aa/x')))Buffer.from('../x').copy(escape,index);
  await assert.rejects(()=>library.import(escape),e=>e.status===400);
  await assert.rejects(()=>library.import(Buffer.from('not a zip')),e=>e.status===400);
  await assert.rejects(()=>zipped({'A.txt':'one','a.txt':'two'}).then(buffer=>library.import(buffer)),e=>e.status===400);
  const large=await zipped({'one.txt':'x'});const central=large.indexOf(Buffer.from([0x50,0x4b,0x01,0x02]));large.writeUInt32LE(limits.file+1,central+24);
  await assert.rejects(()=>library.import(large),e=>[400,413].includes(e.status));
});
test('directory validation rejects public/private collisions without executing content',()=>{
  const directory=temporary();fs.cpSync(path.join(root,'content-templates/basic'),directory,{recursive:true});
  const m=JSON.parse(fs.readFileSync(path.join(directory,'manifest.json'),'utf8'));m.notes=m.entry;fs.writeFileSync(path.join(directory,'manifest.json'),JSON.stringify(m));
  assert.throws(()=>validateContentDirectory(directory),/重合/);
});
test('HTTP import, public resource boundaries, widget update, library restart and baseline-free startup',async()=>{
  const dataDirectory=temporary();let app=await createPresenterServer({port:0,dataDirectory});
  let base=`http://localhost:${app.port}`;
  const post=async(route,data,binary=false)=>{const response=await fetch(base+route,{method:'POST',headers:{Origin:base,'Content-Type':binary?'application/octet-stream':'application/json'},body:binary?data:JSON.stringify(data)});return{status:response.status,data:await response.json()};};
  try {
    let result=await post('/api/host/import',fs.readFileSync(path.join(root,'dist/content-packs/interactive.h5deck')),true);assert.equal(result.status,201);
    await post('/api/host/deck',{deckId:result.data.key});
    const manifest=await(await fetch(base+'/api/manifest')).json();assert.equal(manifest.renderer,'package');
    assert.equal((await fetch(base+'/content/interactive-workshop@1/private/notes.json')).status,404);
    assert.equal((await fetch(base+'/content/interactive-workshop@1/manifest.json')).status,404);
    const html=await fetch(base+manifest.content.entryUrl);assert.equal(html.status,200);assert.ok(html.headers.get('content-security-policy').includes("connect-src 'none'"));assert.equal(html.headers.get('x-frame-options'),null);
    const cap=(await(await fetch(base+'/api/local')).json()).capability;const state=await(await fetch(base+'/api/state')).json();
    const command={id:'widget-1',sequence:1,clientId:'test',sessionId:state.sessionId,serverEpoch:state.serverEpoch,deckRevision:state.deckRevision,sentAt:Date.now(),action:'WIDGET_ACTION',key:'choice',value:'practice'};
    const response=await fetch(base+'/api/command',{method:'POST',headers:{Origin:base,'Content-Type':'application/json','X-Local-Capability':cap},body:JSON.stringify(command)});assert.equal(response.status,200);assert.equal((await response.json()).state.publicWidgetState.choice,'practice');
    await app.close();app=await createPresenterServer({port:0,dataDirectory});base=`http://localhost:${app.port}`;
    assert.equal((await(await fetch(base+'/api/manifest')).json()).deckId,'interactive-workshop');
    const isolated=temporary();fs.cpSync(path.join(root,'decks'),path.join(isolated,'decks'),{recursive:true});fs.cpSync(path.join(root,'clients'),path.join(isolated,'clients'),{recursive:true});
    const independent=await createPresenterServer({port:0,root:isolated,dataDirectory:temporary()});
    try {const started=await(await fetch(`http://localhost:${independent.port}/api/manifest`)).json();assert.equal(started.deckId,'reuse-demo');}finally{await independent.close();}
  }finally{await app.close();}
});
