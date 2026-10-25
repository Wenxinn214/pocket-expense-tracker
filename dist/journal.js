import {coverPhoto,orderedPhotos} from './photos.js';
import {cents,newestFirst} from './data.js';

export function shiftMonth(month,step) {
 const [year,index]=month.split('-').map(Number);
 const date=new Date(year,index-1+step,1,12);
 return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`;
}
export function calendarDays(expenses,month) {
 const [year,index]=month.split('-').map(Number);
 const leading=(new Date(year,index-1,1,12).getDay()+6)%7;
 const count=new Date(year,index,0,12).getDate();
 const records=new Map();
 for(const expense of newestFirst(expenses))if(expense.date.startsWith(month+'-')) {
  if(!records.has(expense.date))records.set(expense.date,[]);
  records.get(expense.date).push(expense);
 }
 const cells=Array.from({length:leading},()=>null);
 for(let day=1;day<=count;day++) {
  const date=`${month}-${String(day).padStart(2,'0')}`,items=records.get(date)||[];
  cells.push({date,day,count:items.length,amount:items.reduce((sum,e)=>sum+cents(e.amount),0)/100,cover:items.map(coverPhoto).find(Boolean)||null});
 }
 while(cells.length%7)cells.push(null);
 return cells;
}
export function memoryEntries(expenses,month='') {
 return newestFirst(expenses).filter(e=>!month||e.date.startsWith(month+'-')).flatMap(expense=>orderedPhotos(expense).map(photo=>({expense,photo})));
}
export function groupMemories(expenses,month='') {
 const groups=new Map();
 for(const entry of memoryEntries(expenses,month)) {
  const key=entry.expense.date.slice(0,7);
  if(!groups.has(key))groups.set(key,[]);
  groups.get(key).push(entry);
 }
 return [...groups].map(([month,entries])=>({month,entries}));
}
