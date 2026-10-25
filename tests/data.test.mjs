import test from 'node:test';
import assert from 'node:assert/strict';
import {seedState,defaultCategories,total,filterExpenses,categorySummary,validateExpense,csvExport,dateLabel,groupExpensesByDay} from '../dist/data.js';
test('seed totals, filter intersections and category percentages',()=>{
 const data=seedState().expenses;
 assert.equal(total(data),77.60);
 assert.equal(total(filterExpenses(data,{date:'2026-10-03'})),30.80);
 assert.equal(total(filterExpenses(data,{month:'2026-10'})),77.60);
 assert.equal(filterExpenses(data,{month:'2026-09'}).length,0);
 assert.equal(filterExpenses(data,{category:'Food & Drinks',search:'COFFEE'})[0].amount,9.90);
 assert.equal(filterExpenses(data,{date:'2026-10-03',category:'Shopping'}).length,0);
 const groups=categorySummary(data);
 assert.equal(total(groups),77.60);
 assert.equal(groups.find(g=>g.category==='Food & Drinks').amount,28.40);
 assert.ok(Math.abs(groups.reduce((s,g)=>s+g.percent,0)-100)<0.000001);
 assert.equal(total([{amount:.1},{amount:.2}]),.3);
});
test('amount and date validation reject bad input',()=>{
 const input={amount:'18.50',category:'Food & Drinks',date:'2026-10-03'};
 assert.equal(validateExpense(input,defaultCategories),'');
 for(const amount of ['','0','-1','1.001','NaN','Infinity','1e3','100000000'])assert.ok(validateExpense({...input,amount},defaultCategories));
 for(const date of ['2026-02-30','2026-13-01','2026-00-00','']) assert.ok(validateExpense({...input,date},defaultCategories));
 assert.ok(validateExpense({...input,category:''},defaultCategories));
});
test('daily journal includes every expense, weekdays and exact daily subtotals',()=>{
 const seeded=seedState().expenses;
 const records=[...seeded,...Array.from({length:7},(_,i)=>({...seeded[0],id:`test_${i}`,date:'2026-10-04',amount:.1}))];
 const days=groupExpensesByDay(records);
 assert.equal(days[0].date,'2026-10-04');
 assert.equal(days[0].expenses.length,7);
 assert.equal(days[0].amount,.7);
 assert.equal(days.reduce((n,day)=>n+day.expenses.length,0),11);
 assert.equal(days.find(day=>day.date==='2026-10-03').amount,30.8);
 assert.equal(dateLabel('2026-10-03'),'3 Oct 2026 · Saturday');
 assert.equal(dateLabel('2026-10-25'),'25 Oct 2026 · Sunday');
 assert.deepEqual(groupExpensesByDay([]),[]);
});
test('CSV still exports remarks and amounts independently of photo attachments',()=>{
 const seeded=seedState().expenses;
 const csv=csvExport([{...seeded[0],remark:'Coffee, "iced"\nGood',photos:[{id:'photo_1',blob:new Blob(['image'])}]}]);
 assert.ok(csv.includes('"Coffee, ""iced""\nGood"'));assert.ok(csv.includes('"18.50"'));
 assert.ok(csvExport([{...seeded[0],remark:'=1+1'}]).includes("'=1+1"));
 assert.ok(!csv.includes('photo_1'));
});
