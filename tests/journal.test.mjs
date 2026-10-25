import test from 'node:test';
import assert from 'node:assert/strict';
import {calendarDays,shiftMonth,memoryEntries,groupMemories} from '../dist/journal.js';

test('calendar aligns Monday-first weeks and leap years, sums cents and keeps cover photos',()=>{
 const photo={id:'p1'},records=[{id:'a',date:'2024-02-29',amount:.1,createdAt:'2024-02-29T12:00:00Z',photos:[photo]},{id:'b',date:'2024-02-29',amount:.2,createdAt:'2024-02-29T13:00:00Z',photos:[]}];
 const cells=calendarDays(records,'2024-02');
 assert.equal(cells.length,35);assert.equal(cells.slice(0,3).every(d=>d===null),true);
 assert.equal(cells.filter(Boolean).length,29);
 assert.equal(cells.find(d=>d?.day===29).amount,.3);
 assert.equal(cells.find(d=>d?.day===29).count,2);
 assert.equal(cells.find(d=>d?.day===29).cover.id,'p1');
 assert.equal(cells.find(d=>d?.day===1).amount,0);
 assert.equal(calendarDays([],'2026-03').length,42);
 assert.equal(calendarDays([],'2026-02').filter(Boolean).length,28);
 assert.equal(shiftMonth('2026-01',-1),'2025-12');assert.equal(shiftMonth('2026-12',1),'2027-01');
});
test('photo wall groups every photo by expense month in reverse date order',()=>{
 const records=[{id:'a',date:'2026-09-30',createdAt:'2026-09-30T00:00:00Z',photos:[{id:'a1'}]},{id:'b',date:'2026-10-01',createdAt:'2026-10-01T00:00:00Z',photos:[{id:'b1'},{id:'b2'}]},{id:'c',date:'2026-10-02',createdAt:'2026-10-02T00:00:00Z',photos:[]}];
 assert.deepEqual(groupMemories(records).map(g=>[g.month,g.entries.length]),[['2026-10',2],['2026-09',1]]);
 assert.deepEqual(memoryEntries(records,'2026-10').map(e=>e.photo.id),['b1','b2']);
 assert.equal(memoryEntries(records,'2026-08').length,0);
});
