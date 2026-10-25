import test from 'node:test';
import assert from 'node:assert/strict';
import {seedState} from '../dist/data.js';
import {serializeBackup,parseBackup,backupSummary} from '../dist/backup.js';
const png=Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a26kAAAAASUVORK5CYII='),c=>c.charCodeAt(0));
const fixture=()=>{const state=seedState();state.expenses[0].remark='午餐 ☕';state.expenses[0].photos=[{id:'photo_1',name:'午餐.png',blob:new Blob([png],{type:'image/png'}),width:1,height:1,createdAt:'2026-10-03T12:00:00Z'}];state.categories.push({id:'custom_1',name:'Little treats',icon:'tag',custom:true,hidden:true});return state;};
test('complete backup roundtrip preserves binary photos, Unicode, timestamps and hidden categories',async()=>{
 const source=fixture(),text=await serializeBackup(source),restored=parseBackup(text);
 assert.deepEqual(backupSummary(restored),{expenses:4,photos:1,categories:10,albums:0,firstDate:'2026-10-01',lastDate:'2026-10-03'});
 assert.equal(restored.expenses[0].remark,'午餐 ☕');assert.equal(restored.expenses[0].photos[0].name,'午餐.png');
 assert.deepEqual(new Uint8Array(await restored.expenses[0].photos[0].blob.arrayBuffer()),png);
 assert.equal(restored.expenses[0].photos[0].blob.type,'image/png');
 assert.equal(restored.expenses[0].createdAt,source.expenses[0].createdAt);
 assert.equal(restored.categories.at(-1).hidden,true);
 assert.equal(text.includes('"blob"'),false);
});
test('damaged, duplicate and unsafe backup contents are rejected before restoration',async()=>{
 const valid=JSON.parse(await serializeBackup(fixture()));
 for(const edit of [o=>o.version=99,o=>o.expenses[0].amount=-1,o=>o.expenses.push(o.expenses[0]),o=>o.categories[0].icon='x" onclick="alert(1)',o=>o.expenses[0].photos[0].data='broken',o=>o.expenses[0].photos[0].type='image/svg+xml',o=>o.expenses[0].date='2026-02-30',o=>o.expenses[0].photos[0].width=-1,o=>o.expenses[0].photos[0].width=1601,o=>o.categories[0].id='x" onclick="alert(1)',o=>o.expenses[0].photos[0].id='x" onclick="alert(1)',o=>o.expenses[1].photos=[o.expenses[0].photos[0]]]){
  const changed=structuredClone(valid);edit(changed);assert.throws(()=>parseBackup(JSON.stringify(changed)));
 }
 assert.throws(()=>parseBackup('{bad JSON'));
 assert.throws(()=>parseBackup(JSON.stringify({expenses:[]})));
});
test('an empty diary remains empty after a complete backup roundtrip',async()=>{
 const state=seedState();state.expenses=[];
 assert.equal(parseBackup(await serializeBackup(state)).expenses.length,0);
});

test('new backups preserve albums, expense covers and individual photo notes',async()=>{
 const state=fixture();state.expenses[0].photos.push({...state.expenses[0].photos[0],id:'photo_2',caption:'这家蛋糕值得再来 🧁'});state.expenses[0].coverPhotoId='photo_2';
 state.albums=[{id:'album_1',name:'Penang weekend',note:'A few favourite stops',color:'butter',expenseIds:[state.expenses[0].id],createdAt:'2026-10-03T12:00:00Z',updatedAt:'2026-10-03T12:00:00Z'}];
 const restored=parseBackup(await serializeBackup(state));
 assert.equal(restored.expenses[0].coverPhotoId,'photo_2');assert.equal(restored.expenses[0].photos[1].caption,'这家蛋糕值得再来 🧁');assert.deepEqual(restored.albums,state.albums);
 const valid=JSON.parse(await serializeBackup(state));
 for(const edit of [o=>o.albums[0].expenseIds=['missing'],o=>o.albums[0].expenseIds.push(o.albums[0].expenseIds[0]),o=>o.expenses[0].coverPhotoId='missing',o=>o.expenses[0].photos[0].caption='x'.repeat(161),o=>o.albums[0].color='unsafe',o=>o.albums[0].name='',o=>o.albums.push(o.albums[0])]){
  const changed=structuredClone(valid);edit(changed);assert.throws(()=>parseBackup(JSON.stringify(changed)));
 }
});
test('previous complete backup format restores without albums or photo metadata',async()=>{
 const original=JSON.parse(await serializeBackup(fixture()));original.version=1;delete original.albums;
 for(const e of original.expenses){delete e.coverPhotoId;for(const p of e.photos)delete p.caption;}
 const restored=parseBackup(JSON.stringify(original));assert.deepEqual(restored.albums,[]);assert.equal(restored.expenses[0].coverPhotoId,'photo_1');assert.equal(restored.expenses[0].photos[0].caption,'');
});
