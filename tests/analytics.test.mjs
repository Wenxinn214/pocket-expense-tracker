import test from 'node:test';
import assert from 'node:assert/strict';
import {activitySeries,monthlyMetrics} from '../dist/analytics.js';

test('weekly activity crosses month and year boundaries without losing cents',()=>{
  const series=activitySeries([{date:'2025-12-31',amount:.1},{date:'2025-12-31',amount:.2},{date:'2026-01-01',amount:10},{date:'2025-12-20',amount:100}],{endDate:'2026-01-03'});
  assert.equal(series.length,7);
  assert.equal(series[0].date,'2025-12-28');
  assert.equal(series[6].date,'2026-01-03');
  assert.equal(series.find(e=>e.date==='2025-12-31').amount,.3);
  assert.equal(series.reduce((sum,e)=>sum+e.amount,0),10.3);
});
test('month series includes leap days and empty days; averages use elapsed days',()=>{
  const records=[{date:'2024-02-29',amount:29},{date:'2026-10-01',amount:15},{date:'2026-10-03',amount:15}];
  const feb=activitySeries(records,{month:'2024-02'});
  assert.equal(feb.length,29);
  assert.deepEqual(feb[28],{date:'2024-02-29',amount:29});
  assert.equal(feb[0].amount,0);
  assert.deepEqual(monthlyMetrics(records,'2026-10','2026-10-03'),{amount:30,count:2,dailyAverage:10,averageExpense:15});
  assert.equal(monthlyMetrics(records,'2024-02','2026-10-03').dailyAverage,1);
  assert.equal(monthlyMetrics([],'2026-10','2026-10-03').averageExpense,0);
});
