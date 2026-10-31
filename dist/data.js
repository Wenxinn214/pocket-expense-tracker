import {createCloudRepository} from './cloud.js';
import {isDemo,createDemoRepository} from './demo.js';
import {withFixedCategory} from './fixed.js';
export const STORAGE_KEY = 'pocket.expenses.v1';
export const defaultCategories = [
 ['Food & Drinks','food'],['Transport','transport'],['Shopping','shopping'],['Bills','bills'],['Entertainment','entertainment'],['Health','health'],['Travel','travel'],['Personal','personal'],['Others','others']
].map(([name,icon])=>({id:icon,name,icon,custom:false,hidden:false}));
export const today = () => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
export const currency = amount => `RM ${new Intl.NumberFormat('en-MY',{minimumFractionDigits:2,maximumFractionDigits:2}).format(amount)}`;
export const dateLabel = date => new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric'}).format(new Date(date+'T12:00:00')) + ' · ' + new Intl.DateTimeFormat('en-GB',{weekday:'long'}).format(new Date(date+'T12:00:00'));
export const monthLabel = month => new Intl.DateTimeFormat('en-GB',{month:'long',year:'numeric'}).format(new Date(month+'-01T12:00:00'));
export const cents = amount => Math.round(Number(amount)*100);
export const total = expenses => expenses.reduce((sum,e)=>sum+cents(e.amount),0)/100;
export const newestFirst = expenses => [...expenses].sort((a,b)=>b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
export const filterExpenses = (expenses,{month='',date='',category='',search=''}={}) => newestFirst(expenses.filter(e=>(!month||e.date.startsWith(month))&&(!date||e.date===date)&&(!category||e.category===category)&&(!search||e.remark.toLowerCase().includes(search.toLowerCase().trim()))));
export const categorySummary = expenses => {
 const sum=total(expenses); const groups=new Map();
 expenses.forEach(e=>groups.set(e.category,(groups.get(e.category)||0)+cents(e.amount)));
 return [...groups].map(([category,n])=>({category,amount:n/100,percent:sum ? (n/100)/sum*100 : 0})).sort((a,b)=>b.amount-a.amount);
};
export function validateExpense({amount,category,date}, categories) {
 if (!/^\d+(\.\d{1,2})?$/.test(String(amount)) || cents(amount)<=0 || Number(amount)>99999999.99) return 'Enter an amount greater than zero, with up to 2 decimal places.';
 if (!categories.some(c=>c.name===category)) return 'Choose a category.';
 const parsedDate = new Date(date+'T12:00:00');
 if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0,10)!==date) return 'Choose a valid date.';
 return '';
}
export function seedState() {
 const records=[['2026-10-03','Food & Drinks','Lunch',18.5],['2026-10-03','Transport','Grab to office',12.3],['2026-10-02','Shopping','Watsons',36.9],['2026-10-01','Food & Drinks','Coffee',9.9]];
 return {version:1,categories:structuredClone(defaultCategories),expenses:records.map(([date,category,remark,amount],i)=>({id:`sample_${i+1}`,date,category,remark,amount,createdAt:`${date}T${i===0?'13':'09'}:00:00.000Z`,updatedAt:`${date}T09:00:00.000Z`}))};
}
// Replace this repository adapter to add a backend later.
const repository = isDemo ? createDemoRepository(defaultCategories) : createCloudRepository(seedState);
export const expenseRepository={async load(){return withFixedCategory(await repository.load());},save:state=>repository.save(state)};
export function groupExpensesByDay(expenses) {
 const days = new Map();
 for (const expense of newestFirst(expenses)) {
  if (!days.has(expense.date)) days.set(expense.date, []);
  days.get(expense.date).push(expense);
 }
 return [...days].map(([date,records]) => ({date, expenses:records, amount:total(records)}));
}
export const csvExport = expenses => '\uFEFFDate,Category,Remark,Amount\r\n'+newestFirst(expenses).map(e=>[e.date,e.category,e.remark,e.amount.toFixed(2)].map(value=>{let s=String(value); if(/^[=+@\-\t\r]/.test(s)) s="'"+s; return '"'+s.replaceAll('"','""')+'"';}).join(',')).join('\r\n');


