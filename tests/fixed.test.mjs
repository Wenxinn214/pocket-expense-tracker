import test from 'node:test';
import assert from 'node:assert/strict';
import {withFixedCategory,fixedDate} from '../dist/fixed.js';
test('adding fixed category preserves records and renamed category without duplicates',()=>{const old={categories:[{id:'food',name:'Food'}],expenses:[{id:'original',amount:12}]};const updated=withFixedCategory(old);assert.deepEqual(updated.expenses,old.expenses);assert.equal(old.categories.length,1);updated.categories[1].name='Subscriptions';assert.equal(withFixedCategory(updated).categories.length,2);assert.equal(withFixedCategory(updated).categories[1].name,'Subscriptions');});
test('manual fixed entry maps selected month once to the calendar first day',()=>{assert.equal(fixedDate('2026-02'),'2026-02-01');for(const value of ['','2026-13','2026-00','2026-02-12'])assert.throws(()=>fixedDate(value));});

