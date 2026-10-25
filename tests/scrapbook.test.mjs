import test from 'node:test';
import assert from 'node:assert/strict';
import {albumSummary,monthlyRecap} from '../dist/scrapbook.js';
import {coverPhoto,orderedPhotos} from '../dist/photos.js';
const records=[{id:'a',date:'2026-10-01',createdAt:'2026-10-01T12:00:00Z',amount:.1,category:'Food & Drinks',photos:[{id:'a1'},{id:'a2'}],coverPhotoId:'a2'},{id:'b',date:'2026-10-02',createdAt:'2026-10-02T12:00:00Z',amount:.2,category:'Food & Drinks',photos:[]},{id:'c',date:'2026-10-03',createdAt:'2026-10-03T12:00:00Z',amount:100,category:'Travel',photos:[{id:'c1'}]},{id:'d',date:'2026-09-01',createdAt:'2026-09-01T12:00:00Z',amount:300,category:'Shopping',photos:[]}];
test('album totals use existing unique expenses and respect cover choices',()=>{
 const summary=albumSummary({expenseIds:['a','b','a','missing']},records);
 assert.equal(summary.amount,.3);assert.equal(summary.count,2);assert.equal(summary.photos,2);assert.equal(summary.cover.id,'a2');assert.equal(summary.firstDate,'2026-10-01');assert.equal(summary.lastDate,'2026-10-02');assert.equal(records.length,4);
 assert.equal(albumSummary({expenseIds:[]},records).amount,0);
});
test('photo ordering puts selected cover first without changing upload order',()=>{
 assert.equal(coverPhoto(records[0]).id,'a2');assert.deepEqual(orderedPhotos(records[0]).map(p=>p.id),['a2','a1']);assert.deepEqual(records[0].photos.map(p=>p.id),['a1','a2']);assert.equal(coverPhoto({photos:[]}),null);
});
test('monthly recap uses exact totals, most frequent category and one cover per expense',()=>{
 const recap=monthlyRecap(records,'2026-10');assert.equal(recap.amount,100.3);assert.equal(recap.count,3);assert.equal(recap.favourite.category,'Food & Drinks');assert.equal(recap.favourite.count,2);assert.deepEqual(recap.photos.map(p=>p.photo.id),['c1','a2']);
 const empty=monthlyRecap(records,'2026-08');assert.equal(empty.amount,0);assert.equal(empty.favourite,null);assert.deepEqual(empty.photos,[]);
});
