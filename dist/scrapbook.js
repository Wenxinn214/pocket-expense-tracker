import {newestFirst,total} from './data.js';
import {coverPhoto} from './photos.js';

export const ALBUM_COLORS = {rose:'Rose milk',butter:'Butter yellow',lavender:'Lavender',mint:'Mint tea'};
export function albumExpenses(album,expenses) {
 const ids=new Set(album.expenseIds);
 return newestFirst(expenses.filter(e=>ids.has(e.id)));
}
export function albumSummary(album,expenses) {
 const records=albumExpenses(album,expenses),photos=records.reduce((sum,e)=>sum+(e.photos?.length||0),0);
 const cover=album.coverPhoto||records.map(coverPhoto).find(Boolean)||null;
 return {records,amount:total(records),count:records.length,photos,cover,firstDate:records.at(-1)?.date||null,lastDate:records[0]?.date||null};
}
export function monthlyRecap(expenses,month) {
 const records=newestFirst(expenses.filter(e=>e.date.startsWith(month+'-'))),groups=new Map();
 for(const expense of records){const item=groups.get(expense.category)||{category:expense.category,count:0,amountCents:0};item.count++;item.amountCents+=Math.round(expense.amount*100);groups.set(expense.category,item);}
 const favourite=[...groups.values()].sort((a,b)=>b.count-a.count||b.amountCents-a.amountCents||a.category.localeCompare(b.category))[0]||null;
 const photos=records.map(expense=>({expense,photo:coverPhoto(expense)})).filter(e=>e.photo).slice(0,4);
 return {month,amount:total(records),count:records.length,favourite,photos};
}


