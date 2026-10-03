import {cents} from './data.js';

const localDate = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

export function activitySeries(expenses, {endDate, month} = {}) {
  let dates;
  if (month) {
    const [year, index] = month.split('-').map(Number);
    dates = Array.from({length:new Date(year,index,0).getDate()},(_,i)=>`${month}-${String(i+1).padStart(2,'0')}`);
  } else {
    dates = Array.from({length:7},(_,i)=>{
      const date = new Date(endDate+'T12:00:00');
      date.setDate(date.getDate()-6+i);
      return localDate(date);
    });
  }
  const totals = new Map(dates.map(date=>[date,0]));
  expenses.forEach(e=>{if(totals.has(e.date))totals.set(e.date,totals.get(e.date)+cents(e.amount));});
  return dates.map(date=>({date,amount:totals.get(date)/100}));
}

export function monthlyMetrics(expenses, month, currentDate) {
  const records=expenses.filter(e=>e.date.startsWith(month));
  const amount=records.reduce((sum,e)=>sum+cents(e.amount),0)/100;
  const [year,index]=month.split('-').map(Number);
  const elapsed=month===currentDate.slice(0,7)?Number(currentDate.slice(8)):new Date(year,index,0).getDate();
  return {amount,count:records.length,dailyAverage:amount/elapsed,averageExpense:records.length?amount/records.length:0};
}
