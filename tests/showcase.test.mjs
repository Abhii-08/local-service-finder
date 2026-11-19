import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PALETTE } from '../js/charts.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read=(p)=>readFile(path.join(root,p),'utf8');
const pages=['legacy-index.html','providers.html','provider.html','enquiry.html','track.html','login.html','admin.html'];
test('every public and admin page includes the approved design layer last',async()=>{
 for(const p of pages){
  const s=await read(p);
  assert.equal((s.match(/css\/showcase\.css/g)||[]).length,1,p+' missing shared theme');
  assert.ok(s.indexOf('css/showcase.css')>s.indexOf('css/premium.css'),p+' stylesheet order');
 }
 const theme=await read('css/showcase.css');
 for(const value of ['#a6849d','#2F2235','#523e5c','#acbbac','#ddecdd','#ffffff']){
  assert.ok(theme.toLowerCase().includes(value.toLowerCase()),'missing brand color '+value);
 }
});
test('full-screen single-photo hero preserves directory search and functionality',async()=>{
 const s=await read('legacy-index.html');
 for(const marker of ['id="home-search"','id="cat-grid"','id="featured"','id="stats-strip"','class="hero hero-full"','class="hero-photo"','class="hero-veil"','id="home-search"','id="cat-dialog"']){
  assert.ok(s.includes(marker),'missing '+marker);
 }
 assert.ok(s.includes('photos/15124970/pexels-photo-15124970.jpeg'));
 assert.ok(!s.includes('class="gallery-mosaic"'));
 const app=await read('js/app.js');
 for(const marker of ['photoByCategory','27928761','32588548','4308096','38252524','openCat(c)','getProviders()']){
  assert.ok(app.includes(marker),'missing '+marker);
 }
});
test('admin preview has no fake revenue KPIs or inert shortcut controls',async()=>{
 const html=await read('admin.html');
 const js=await read('js/admin.js');
 for(const marker of ['admin-welcome','dashboard-shortcuts','id="kpis"','id="ch-cat"','id="ch-days"','id="ch-prov"','id="t-recent"','id="adm-filters"','id="prov-filters"','id="usr-filters"']){
  assert.ok(html.includes(marker),'missing '+marker);
 }
 for(const route of ['enquiries','providers','users','categories']){
  assert.ok(html.includes('data-go="'+route+'"'),'missing quick action '+route);
 }
 assert.ok(js.includes("$$('[data-go]').forEach("),'existing quick action event handlers must remain');
 assert.ok(!html.includes('₹4,85,000'),'fabricated revenue must not appear');
 assert.ok(PALETTE.includes('#a6849d') || PALETTE.includes('#8c5a97'));
});
