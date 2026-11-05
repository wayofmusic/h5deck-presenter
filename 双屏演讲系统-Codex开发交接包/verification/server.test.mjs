import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createPresenterServer } from '../server/index.mjs';
test('pairing, private notes, 100 commands, alternating controllers, replay rejection, revocation and reuse', async () => {
  const dataDirectory=fs.mkdtempSync(path.join(os.tmpdir(),'presenter-server-test-'));
  const app = await createPresenterServer({port:0,dataDirectory});
  const base = `http://localhost:${app.port}`;
  let phoneCookie = '', capability, sequence = 0;
  async function get(route,headers={}) { const r = await fetch(base+route,{headers}); return { status:r.status, data:await r.json(), response:r }; }
  async function post(route,data,headers={}) { const r = await fetch(base+route,{method:'POST',headers:{Origin:base,'Content-Type':'application/json',...headers},body:JSON.stringify(data)}); return {status:r.status,data:await r.json(),response:r}; }
  try {
    const manifest = (await get('/api/manifest')).data; assert.equal(manifest.slides.length,32);
    assert.ok(manifest.slides.every(s => !('notes' in s) && !('cue' in s)));
    assert.equal((await get('/api/script')).status,401);
    assert.equal((await get('/baseline/work/content.js')).status,404);
    assert.equal((await get('/dist/chaixiang-ai-y/script.json')).status,404);
    assert.equal((await fetch(`http://127.0.0.2:${app.port}/api/local`)).status,403);
    const xss = await fetch(base+'/api/host/pair',{method:'POST',headers:{Origin:'https://other.invalid','Content-Type':'application/json'},body:'{}'}); assert.equal(xss.status,403);
    capability = (await get('/api/local')).data.capability;
    const h = (await get('/api/host')).data;
    const ticket = new URLSearchParams(new URL(h.link).hash.slice(1)).get('pair');
    assert.equal((await post('/api/pair',{ticket:'wrong'})).status,401);
    const paired = await post('/api/pair',{ticket}); assert.equal(paired.status,200);
    phoneCookie = paired.response.headers.get('set-cookie').split(';')[0];
    assert.equal((await post('/api/pair',{ticket})).status,409);
    assert.equal((await get('/api/script',{Cookie:phoneCookie})).data.slides['cx-01'].paragraphs.length > 0,true);
    let s = (await get('/api/state')).data;
    const command = (action, extra={}) => ({ id:`cmd-${++sequence}`, clientId:'verification', sequence, sessionId:s.sessionId,serverEpoch:s.serverEpoch,deckRevision:s.deckRevision,sentAt:Date.now(),action,...extra });
    const phone = {Cookie:phoneCookie}; const desktop = {'X-Local-Capability':capability};
    const first = command('NEXT_STEP'); let r = await post('/api/command',first,phone); assert.equal(r.status,200); s = r.data.state;
    r = await post('/api/command',first,phone); assert.equal(r.data.duplicate,true); assert.equal(r.data.state.stateVersion,s.stateVersion);
    const initialVersion = s.stateVersion;
    for (let i=0;i<100;i++) {
      r = await post('/api/command',command(i%2 ? 'PREV_STEP' : 'NEXT_STEP'),phone);
      assert.equal(r.status,200); s = r.data.state;
    }
    assert.equal(s.stateVersion,initialVersion+100);
    for (let i=0;i<20;i++) { r = await post('/api/command',command(i%2 ? 'PREV_STEP' : 'NEXT_STEP'),i%2 ? desktop:phone); assert.equal(r.status,200); s=r.data.state; }
    assert.equal((await post('/api/command',command('NEXT_STEP',{sentAt:Date.now()-10000}),phone)).status,409);
    assert.equal((await post('/api/command',command('NEXT_STEP',{serverEpoch:'old'}),phone)).status,409);
    assert.equal((await post('/api/command',command('NEXT_STEP',{sequence:1}),phone)).status,409);
    assert.equal((await post('/api/command',command('RESTORE_DISPLAY',{snapshot:s}),phone)).status,403);
    const beforeRevoke = s;
    await post('/api/host/pair',{});
    assert.equal((await get('/api/script',phone)).status,401);
    assert.equal((await post('/api/command',command('NEXT_STEP'),phone)).status,401);
    assert.equal((await get('/api/state')).data.stateVersion,beforeRevoke.stateVersion);
    await post('/api/host/deck',{deckId:'reuse-demo'});
    const second = (await get('/api/manifest')).data;
    assert.equal(second.slides.length,3); s = (await get('/api/state')).data;
    r = await post('/api/command',command('GOTO_SLIDE',{slideId:'demo-steps'}),desktop); assert.equal(r.status,200); s=r.data.state;
    r = await post('/api/command',command('NEXT_STEP'),desktop); assert.equal(r.data.state.revealStep,2);
    const publicJS = await (await fetch(base+'/deck-content.js')).text(); assert.ok(!publicJS.includes('paragraphs'));
  } finally { await app.close(); }
});
