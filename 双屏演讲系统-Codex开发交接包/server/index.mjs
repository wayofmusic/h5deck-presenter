import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import QRCode from 'qrcode';
import { initialState, transition, validateDeck } from '../core/state.mjs';
import { ContentLibrary, contained, limits, contentError } from './content-library.mjs';
import { loadBuiltins } from './catalog.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const token = () => crypto.randomBytes(24).toString('base64url');
const VERSION=JSON.parse(fs.readFileSync(path.join(ROOT,'package.json'),'utf8')).version;
const mime = { '.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2':'font/woff2','.woff':'font/woff','.mp4':'video/mp4','.webm':'video/webm','.mp3':'audio/mpeg','.json':'application/json; charset=utf-8','.h5deck':'application/zip' };
const isLoopback = address => ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(address);
const readJSON = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const fail = (status, message) => Object.assign(Error(message), { status });

export async function createPresenterServer({ port = 3210, host = '0.0.0.0', root = ROOT, dataDirectory = process.env.PRESENTER_DATA_DIR || path.join(root,'data') } = {}) {
  const builtins=loadBuiltins(root);
  const library=new ContentLibrary(path.join(dataDirectory,'content-library'));
  const imported=library.list();
  const decks=new Map([...builtins,...imported.decks].map(d=>[d.key,d]));
  if(!decks.size) throw Error('没有可用内容，请先建立或导入内容包');
  const settingsFile=path.join(dataDirectory,'settings.json');
  let savedKey;try{savedKey=readJSON(settingsFile).activeKey;}catch{}
  let deck=decks.get(savedKey)||decks.values().next().value;
  const publicManifest=()=>({...deck.manifest,libraryKey:deck.key,...(deck.kind==='package'?{renderer:'package',content:{entryUrl:`/content/${encodeURIComponent(deck.key)}/${deck.manifest.entry}`,protocol:1}}:{})});
  const epoch = token();
  let state = initialState(deck.manifest, token(), epoch);
  let controller = null;
  let pairTicket = { secret: token(), expiresAt: Date.now() + 120000 };
  let localCapability = token();
  const streams = new Set();
  const seen = new Map();
  const sequences = new Map();
  const pairAttempts = new Map();
  let listeningPort;
  const cookies = req => Object.fromEntries((req.headers.cookie || '').split(';').map(s => s.trim().split('=')));
  const local = req => isLoopback(req.socket.remoteAddress) && /^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(req.headers.host || '');
  const role = req => {
    if (local(req) && req.headers['x-local-capability'] === localCapability) return 'host';
    if (controller && cookies(req).presenter_control === controller.secret) return 'phone';
    return null;
  };
  const snapshot = req => ({ ...state, libraryKey:deck.key, serverNow: Date.now(), canControl: !!role(req), controllerPaired: !!controller, controllerOnline: [...streams].some(s => role(s.req) === 'phone') });
  const publish = () => {
    for (const stream of streams) {
      if(stream.res.writableEnded||stream.res.destroyed)continue;
      if (stream.res.writableLength > 65536) { stream.res.destroy(); continue; }
      stream.res.write(`data: ${JSON.stringify(snapshot(stream.req))}\n\n`);
    }
  };
  const json = (res, body, status = 200, headers = {}) => {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers });
    res.end(JSON.stringify(body));
  };
  const requireHost = req => { if (!local(req)) throw fail(403, '请在本机使用 localhost 打开电脑设置页'); };
  const requireControl = req => { const value = role(req); if (!value) throw fail(401, '请先扫码配对，或重新连接'); return value; };
  async function body(req) {
    if (!req.headers['content-type']?.startsWith('application/json')) throw fail(415, '需要 JSON 请求');
    let data = '';
    for await (const chunk of req) { data += chunk; if (Buffer.byteLength(data) > 32768) throw fail(413, '请求过大'); }
    try { return JSON.parse(data); } catch { throw fail(400, '请求内容无效'); }
  }
  const addresses = () => {
    const list = [];
    for (const [name, entries] of Object.entries(os.networkInterfaces())) for (const item of entries || []) {
      if (item.family === 'IPv4' && !item.internal) list.push({ name, address: item.address, virtual: /vmware|vethernet|virtual|vpn|wsl|tailscale|docker|atrust|vnic|tunnel|tap|tun\d/i.test(name) });
    }
    return list.sort((a, b) => Number(a.virtual) - Number(b.virtual));
  };
  function sendFile(res, file,headers={}) {
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) throw fail(404, '文件不存在');
    res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store',...headers });
    fs.createReadStream(file).pipe(res);
  }
  const server = http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Frame-Options', 'DENY');
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const route = decodeURIComponent(url.pathname);
      if (!['GET', 'POST'].includes(req.method)) throw fail(405, '不支持此方法');
      if (req.method === 'POST' && req.headers.origin !== `http://${req.headers.host}`) throw fail(403, '来源校验失败，请从本服务页面操作');
      if (route === '/api/health' && req.method === 'GET') return json(res, { ok: true, version: VERSION, instanceId: crypto.createHash('sha256').update(root).digest('hex').slice(0,16) });
      if (route === '/api/manifest' && req.method === 'GET') return json(res, publicManifest());
      if (route === '/api/state' && req.method === 'GET') return json(res, snapshot(req));
      if (route === '/api/local' && req.method === 'GET') { requireHost(req); return json(res, { capability: localCapability }); }
      if (route === '/api/script' && req.method === 'GET') { requireControl(req); return json(res, { deckId: state.deckId, revision: state.deckRevision, slides: deck.script }); }
      if (route === '/api/events' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive' });
        const stream = { req, res }; streams.add(stream);
        req.on('close', () => { streams.delete(stream); publish(); });
        publish(); return;
      }
      if (route === '/api/host' && req.method === 'GET') {
        requireHost(req);
        const networks = addresses();
        const address = url.searchParams.get('address') || networks[0]?.address || '127.0.0.1';
        if (address !== '127.0.0.1' && !networks.some(n => n.address === address)) throw fail(400, '网卡地址无效');
        const link = pairTicket ? `http://${address}:${listeningPort}/presenter#pair=${pairTicket.secret}` : null;
        return json(res, { networks, address, port: listeningPort, link, qr: link ? await QRCode.toString(link, { type: 'svg', margin: 2, width: 272 }) : null, expiresAt: pairTicket?.expiresAt, decks: [...decks.values()].map(d => ({ id:d.key,deckId:d.manifest.deckId,revision:d.manifest.revision,title:d.manifest.title,slides:d.manifest.slides.length,source:d.kind })),warnings:imported.warnings,activeKey:deck.key,state: snapshot(req) });
      }
      if(route==='/api/host/import'&&req.method==='POST') {
        requireHost(req);
        if(req.headers['content-type']!=='application/octet-stream')throw fail(415,'请上传 .h5deck 或 ZIP 内容包');
        if(Number(req.headers['content-length']||0)>limits.compressed)throw fail(413,'内容包不能超过 64 MB');
        const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>limits.compressed)throw fail(413,'内容包不能超过 64 MB');chunks.push(chunk);}
        const added=await library.import(Buffer.concat(chunks));decks.set(added.key,added);
        return json(res,{key:added.key,title:added.manifest.title,slides:added.manifest.slides.length,message:'已导入课件库，请选择课件开始演讲'},201);
      }
      if(route==='/api/host/template'&&req.method==='GET') {
        requireHost(req);const name=url.searchParams.get('name');if(!['basic','interactive'].includes(name))throw fail(400,'模板名称无效');
        return sendFile(res,path.join(root,'dist/content-packs',name+'.h5deck'),{'Content-Disposition':`attachment; filename="${name}.h5deck"`});
      }
      if (route === '/api/host/pair' && req.method === 'POST') {
        requireHost(req); await body(req);
        controller = null; pairTicket = { secret: token(), expiresAt: Date.now() + 120000 };
        publish(); return json(res, { ok: true });
      }
      if (route === '/api/host/deck' && req.method === 'POST') {
        requireHost(req); const input = await body(req); const next = decks.get(input.deckId);
        if (!next) throw fail(400, '课件不存在');
        deck = next; state = initialState(deck.manifest, token(), epoch);
        fs.mkdirSync(dataDirectory,{recursive:true});fs.writeFileSync(settingsFile,JSON.stringify({activeKey:deck.key}),'utf8');
        controller = null; pairTicket = { secret: token(), expiresAt: Date.now() + 120000 }; seen.clear(); sequences.clear();
        publish(); return json(res, { ok: true });
      }
      if (route === '/api/host/end' && req.method === 'POST') {
        requireHost(req); await body(req); controller = null; pairTicket = null;
        state = transition(state, { action: 'TIMER_PAUSE' }, deck.manifest);
        state = transition(state, { action: 'EXERCISE_PAUSE' }, deck.manifest);
        publish(); return json(res, { ok: true });
      }
      if (route === '/api/pair' && req.method === 'POST') {
        const key = req.socket.remoteAddress;
        const attempt = pairAttempts.get(key) || { start: Date.now(), count: 0 };
        if (Date.now() - attempt.start > 60000) { attempt.start = Date.now(); attempt.count = 0; }
        attempt.count++; pairAttempts.set(key, attempt);
        if (attempt.count > 20) throw fail(429, '尝试次数过多，请一分钟后重试');
        const input = await body(req);
        if (controller) throw fail(409, '已有一部主控手机，请在电脑重新配对');
        if (!pairTicket || Date.now() > pairTicket.expiresAt || input.ticket !== pairTicket.secret) throw fail(401, '配对码已失效，请在电脑刷新二维码');
        controller = { secret: token() }; pairTicket = null;
        json(res, { ok: true }, 200, { 'Set-Cookie': `presenter_control=${controller.secret}; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400` });
        publish(); return;
      }
      if (route === '/api/command' && req.method === 'POST') {
        const source = requireControl(req); const input = await body(req);
        if (input.action === 'RESTORE_DISPLAY' && source !== 'host') throw fail(403, '仅电脑可接管状态');
        if (input.sessionId !== state.sessionId || input.serverEpoch !== epoch || input.deckRevision !== state.deckRevision) throw fail(409, '会话已变化，请先同步');
        if (typeof input.id !== 'string' || input.id.length > 100 || typeof input.clientId !== 'string' || input.clientId.length > 100 || !Number.isSafeInteger(input.sequence) || input.sequence < 1 || !Number.isFinite(input.sentAt)) throw fail(400, '命令格式无效');
        if (Math.abs(Date.now() - input.sentAt) > 5000) throw fail(409, '命令已过期，未执行');
        const scope = `${source}:${source === 'phone' ? controller.secret : localCapability}:${input.clientId}`;
        const id = `${scope}:${input.id}`;
        if (seen.has(id)) return json(res, { duplicate: true, state: snapshot(req) });
        if ((sequences.get(scope) || 0) >= input.sequence) throw fail(409, '命令序号已过期，未执行');
        if (!sequences.has(scope) && sequences.size >= 1024) throw fail(429, '客户端数量过多，请切换课件重置会话');
        try { state = transition(state, input, deck.manifest); } catch (error) { throw fail(400, error.message); }
        seen.set(id, state.stateVersion); sequences.set(scope, input.sequence);
        if (seen.size > 4096) seen.delete(seen.keys().next().value);
        publish(); return json(res, { state: snapshot(req) });
      }
      if (req.method !== 'GET') throw fail(404, '接口不存在');
      if (route === '/favicon.ico') { res.writeHead(204); return res.end(); }
      if (route === '/' || route === '/host') { requireHost(req); return sendFile(res, path.join(root, 'clients/host/index.html')); }
      if (route === '/presenter') return sendFile(res, path.join(root, 'clients/presenter/index.html'));
      if (route === '/display') return sendFile(res,deck.kind==='package'?path.join(root,'clients/display/platform.html'):deck.display);
      if (route === '/deck-content.js') {
        res.writeHead(200, { 'Content-Type': mime['.js'], 'Cache-Control': 'no-store' });
        return res.end(`const CHAPTERS=${JSON.stringify(deck.manifest.chapters)};const SLIDES=${JSON.stringify(deck.manifest.slides)};`);
      }
      if(deck.files?.[route])return sendFile(res,path.join(root,deck.files[route]));
      const contentMatch=route.match(/^\/content\/([^/]+)\/(.+)$/);
      if(contentMatch) {
        const selected=decks.get(contentMatch[1]);if(selected?.kind!=='package')throw fail(404,'内容包不存在');
        const relative=contentMatch[2];if(!selected.publicFiles.has(relative))throw fail(404,'内容资源不存在或为私有文件');
        res.removeHeader('X-Frame-Options');
        return sendFile(res,contained(selected.folder,relative),{
          'Access-Control-Allow-Origin':'*',
          'Content-Security-Policy':"default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; media-src 'self' data: blob:; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'self'"
        });
      }
      if(route==='/sdk/presenter-sdk.js')return sendFile(res,path.join(root,'clients/sdk/presenter-sdk.js'),{'Access-Control-Allow-Origin':'*'});
      const clientFiles = new Set(['clients/shared.mjs', 'clients/ui.css', 'clients/host/host.mjs', 'clients/presenter/presenter.mjs', 'clients/display/adapter.mjs', 'clients/display/generic.mjs', 'clients/display/display.css', 'clients/display/platform.mjs','clients/display/platform.css','core/state.mjs']);
      const relative = route.slice(1);
      if (clientFiles.has(relative)) return sendFile(res, path.join(root, relative));
      for(const builtin of builtins)for(const [prefix,directory]of Object.entries(builtin.assets))if(route.startsWith(prefix))return sendFile(res,contained(path.resolve(root,directory),route.slice(prefix.length)));
      throw fail(404, '页面不存在');
    } catch (error) {
      if (!res.headersSent) json(res, { error: error.status ? error.message : '服务请求失败' }, error.status || 500);
      else res.end();
    }
  });
  server.requestTimeout = 10000;
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, host, resolve); });
  listeningPort = server.address().port;
  const heartbeat = setInterval(publish, 3000); heartbeat.unref();
  return { server, port: listeningPort, close: async () => { clearInterval(heartbeat); for (const s of streams) s.res.end(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); } };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const requested = process.env.PORT ? Number(process.env.PORT) : 3210;
  let app;
  for (let n = 0; n < 20; n++) {
    try { app = await createPresenterServer({ port: requested + n }); break; } catch (error) { if (error.code !== 'EADDRINUSE' || n === 19) throw error; }
  }
  const url = `http://localhost:${app.port}/host`;
  fs.mkdirSync(path.join(ROOT, '.runtime'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, '.runtime/server.json'), JSON.stringify({ pid: process.pid, port: app.port, url }));
  console.log(`双屏演讲系统已启动\n电脑设置：${url}\n投屏画面：http://localhost:${app.port}/display\n手机请扫描电脑设置页的二维码。按 Ctrl+C 结束。`);
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, async () => { await app.close(); process.exit(0); });
}
