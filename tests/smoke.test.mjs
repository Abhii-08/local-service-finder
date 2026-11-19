import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { CATEGORIES, PROVIDERS } from '../js/data.js';
import { donut, bars, hbars } from '../js/charts.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pages = ['legacy-index.html','providers.html','provider.html','enquiry.html','track.html','login.html','admin.html'];
const read = (name) => readFile(path.join(ROOT,name),'utf8');

test('user and admin pages share one premium design system', async () => {
  const premium = await read('css/premium.css');
  for (const token of ['--bg:', '--brand:', '--atelier-surface:', '.sidebar', '.hero', '.kpi', '@media (prefers-reduced-motion: reduce)']) {
    assert.ok(premium.includes(token), 'missing design token/rule: '+token);
  }
  for (const name of pages) {
    const html = await read(name);
    assert.equal((html.match(/css\/premium\.css/g)||[]).length,1, name+' must load premium.css once');
    assert.ok(html.indexOf('css/premium.css') > html.indexOf('css/theme.css'), name+': override must load after theme');
    assert.ok(html.includes('name="viewport"'), name+': viewport required');
    assert.ok(html.includes('<main ') || html.includes('id="main"'), name+': main landmark required');
  }
});

test('navigation, forms, filters, charts and admin interactions remain present', async () => {
  const required = {
    'legacy-index.html':['home-search','cat-grid','featured','hero-proof','hero-full'],
    'providers.html':['id="filters"','id="results"','id="map"','id="locate"'],
    'provider.html':['id="profile"'],
    'enquiry.html':['id="enq-form"','id="stepper"'],
    'track.html':['id="track-form"','id="track-out"'],
    'login.html':['id="main"'],
    'admin.html':['id="admin-view"','id="sidebar"','id="kpis"','id="ch-cat"','id="ch-days"','id="ch-prov"','id="t-enq"','id="t-prov"','id="t-usr"','id="t-cat"','id="adm-dialog"']
  };
  for(const [page,selectors] of Object.entries(required)){
    const html=await read(page);
    for(const marker of selectors) assert.ok(html.includes(marker),page+' missing '+marker);
  }
});

test('demo provider fixtures and admin chart rendering are preserved', () => {
  assert.ok(CATEGORIES.length>=4);
  assert.ok(PROVIDERS.length>=4);
  assert.ok(PROVIDERS.every(p=>p.demo));
  assert.match(donut([{label:'Electrician',value:2}], 'Categories'),/svg/);
  assert.match(bars([{label:'Mon',value:3}],'Activity'),/svg/);
  assert.match(hbars([{label:'Local',value:4}],'Providers'),/Local/);
});

test('backend serves pages and preserves admin access control', {timeout:15000}, async (t) => {
  const port=35000+Math.floor(Math.random()*20000);
  const child=spawn(process.execPath,['server/server.mjs'],{cwd:ROOT,env:{...process.env,PORT:String(port),ADMIN_KEY:'smoke-test-private-key'},stdio:['ignore','pipe','pipe']});
  let stderr='';
  child.stderr.on('data',chunk=>{stderr+=chunk.toString()});
  t.after(()=>child.kill());
  let ready=false;
  for(let i=0;i<60;i++){
    if(child.exitCode!==null)break;
    try{
      const r=await fetch('http://127.0.0.1:'+port+'/api/health');
      if(r.ok){ready=true;break}
    }catch{}
    await delay(100);
  }
  assert.ok(ready,'Server failed to start: '+stderr);
  const base='http://127.0.0.1:'+port;
  const [health,providers,admin,home,theme]=await Promise.all([
    fetch(base+'/api/health'),fetch(base+'/api/providers'),fetch(base+'/api/enquiries'),fetch(base+'/'),fetch(base+'/css/premium.css')
  ]);
  assert.equal(health.status,200);
  assert.equal((await health.json()).ok,true);
  assert.equal(providers.status,200);
  assert.equal(admin.status,401);
  assert.equal(home.status,200);
  assert.equal(theme.status,200);
  assert.match(await theme.text(),/--atelier-surface/);
});
