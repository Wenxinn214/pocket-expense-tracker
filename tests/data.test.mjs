import test from 'node:test';
import assert from 'node:assert/strict';
import {seedState,defaultCategories,total,filterExpenses,categorySummary,validateExpense,csvExport,expenseRepository,STORAGE_KEY} from '../dist/data.js';
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
test('repository retains empty state and export escapes remarks',()=>{
 const storage=new Map();globalThis.localStorage={getItem:key=>storage.get(key)??null,setItem:(key,val)=>storage.set(key,val)};
 const seeded=expenseRepository.load();assert.equal(seeded.expenses.length,4);
 expenseRepository.save({...seeded,expenses:[]});assert.equal(expenseRepository.load().expenses.length,0);
 const csv=csvExport([{...seeded.expenses[0],remark:'Coffee, "iced"\nGood'}]);
 assert.ok(csv.includes('"Coffee, ""iced""\nGood"'));assert.ok(csv.includes('"18.50"'));
 assert.ok(csvExport([{...seeded.expenses[0],remark:'=1+1'}]).includes("'=1+1"));
 storage.set(STORAGE_KEY,'broken');assert.throws(()=>expenseRepository.load());
});
