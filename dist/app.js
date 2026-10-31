import {icon} from './icons.js';
import {expenseRepository,today,currency,dateLabel,monthLabel,total,filterExpenses,categorySummary,validateExpense,csvExport,groupExpensesByDay} from './data.js';
import {MAX_PHOTOS,preparePhoto,coverPhoto,orderedPhotos} from './photos.js';
import {calendarDays,shiftMonth,memoryEntries,groupMemories} from './journal.js';
import {serializeBackup,parseBackup,verifyBackupPhotos,backupSummary,MAX_BACKUP_BYTES} from './backup.js';
import {ALBUM_COLORS,albumExpenses,albumSummary,monthlyRecap} from './scrapbook.js';
import {renderRecapCard} from './recap-card.js';
import {activitySeries,monthlyMetrics} from './analytics.js';
const $ = (selector,root=document)=>root.querySelector(selector);
const html = value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let state, page=['home','history','calendar','memories','insights'].includes(location.hash.slice(1))?location.hash.slice(1):'home';
let filters={month:today().slice(0,7),date:'',category:'',search:''}, insightMonth=today().slice(0,7), toastTimer, categoryOrigin=false;
let calendarMonth=today().slice(0,7), calendarDate=today(), memoryMonth='';
let memoryTab='photos',selectedAlbumId=null,albumContent='expenses',recapMonth=today().slice(0,7),recapHideAmounts=false;
const syncChannel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel('pocket.expenses.v2');
const photoUrls = new Map();
window.addEventListener('pocket:lock',()=>{state=undefined;for(const entry of photoUrls.values())URL.revokeObjectURL(entry.url);photoUrls.clear();syncChannel?.close();clearTimeout(toastTimer);$('#toast').replaceChildren();});
function photoUrl(photo) {
 let entry=photoUrls.get(photo.id);
 if (!entry || entry.blob!==photo.blob) {
  if(entry) URL.revokeObjectURL(entry.url);
  entry={blob:photo.blob,url:URL.createObjectURL(photo.blob)};photoUrls.set(photo.id,entry);
 }
 return entry.url;
}
function prunePhotoUrls() {
 const used=new Set(state.expenses.flatMap(e=>(e.photos||[]).map(p=>p.id)));
 for(const [id,entry] of photoUrls) if(!used.has(id)){URL.revokeObjectURL(entry.url);photoUrls.delete(id);}
}
try { state=await expenseRepository.load(); } catch { $('#app').innerHTML='<div class="startup-error"><h1>Your expenses could not be opened.</h1><p>Browser storage may be unavailable, or saved data may be damaged. Your existing data has not been changed. Enable browser storage and reload to try again.</p><button class="primary" onclick="location.reload()">Try again</button></div>'; }
const categoryFor=name=>state.categories.find(c=>c.name===name)||{name,icon:'tag'};
const isFixed=e=>categoryFor(e.category).id==='fixed_expenses';
const dailyRecords=()=>state.expenses.filter(e=>!isFixed(e));
function fixedList(records){return `<section class="panel fixed-expenses" aria-label="Fixed expenses"><div class="section-header"><div><span class="section-kicker">MONTHLY COMMITMENTS</span><h2>Fixed expenses</h2></div><strong>${currency(total(records))}</strong></div><p class="muted">Subscriptions, utilities and bills · recorded manually by month</p>${records.length?records.map(e=>`<button class="expense-row" data-expense="${html(e.id)}">${badge(e.category)}<span class="expense-info"><span class="expense-category">${html(e.remark||e.category)}</span><span class="expense-remark">${monthLabel(e.date.slice(0,7))}</span></span><span class="expense-amount">${currency(e.amount)}</span></button>`).join(''):'<p class="muted">No fixed expenses recorded for this month.</p>'}</section>`;}
const badge=(name,cls='')=>{const c=categoryFor(name);return `<span class="category-icon category-${c.icon} ${cls}">${icon(c.icon)}</span>`;};
const palette={food:'#d49461',transport:'#75a995',shopping:'#bc7493',bills:'#c1a45b',entertainment:'#bd84b5',health:'#cf8884',travel:'#79a8b5',personal:'#968ac0',others:'#9d929e',tag:'#9d929e'};
const categoryColor=name=>palette[categoryFor(name).icon]||palette.tag;
const money=amount=>`<span class="money-unit">RM</span> ${currency(amount).slice(3)}`;
function activityChart(series,compact=false) {
 const max=Math.max(...series.map(d=>d.amount),1);
 return `<div class="activity-chart ${compact?'weekly':'monthly'}" aria-label="Daily spending in Malaysian ringgit"><div class="chart-scale"><span>${currency(max)}</span><span>${currency(max/2)}</span><span>RM 0</span></div><div class="chart-columns">${series.map((d,i)=>`<div class="chart-column ${d.date===today()?'is-today':''}"><div class="bar-track" tabindex="0" aria-label="${dateLabel(d.date)}: ${currency(d.amount)}"><span class="chart-tooltip">${dateLabel(d.date)}<strong>${currency(d.amount)}</strong></span><span class="chart-bar" style="height:${d.amount/max*100}%"></span></div><span class="bar-label">${compact?new Intl.DateTimeFormat('en-GB',{weekday:'short'}).format(new Date(d.date+'T12:00:00')):i===0||i%5===0?i+1:''}</span></div>`).join('')}</div></div>`;
}
function categoryRing(groups) {
 let angle=0;
 const stops=groups.map(g=>{const start=angle;angle+=g.percent*3.6;return `${categoryColor(g.category)} ${start}deg ${angle}deg`;}).join(',');
 return `<div class="category-ring" style="background:${groups.length?'conic-gradient('+stops+')':'var(--line)'}" role="img" aria-label="Spending distribution across ${groups.length} categories"><div class="ring-center"><span>${groups.length}</span><small>categories</small></div></div>`;
}
function categoryRows(groups,month,limit=groups.length) {
 return groups.slice(0,limit).map(g=>`<button type="button" data-category-detail="${html(g.category)}" data-category-month="${month}" class="summary-row" style="--category-color:${categoryColor(g.category)}">${badge(g.category)}<div class="summary-info"><div class="summary-label"><span>${html(g.category)}</span><span><strong>${currency(g.amount)}</strong><span class="percentage">${Math.round(g.percent)}%</span></span></div><div class="progress" role="meter" aria-label="${html(g.category)} share of monthly spending" aria-valuenow="${g.percent.toFixed(1)}" aria-valuemin="0" aria-valuemax="100"><span style="width:${g.percent}%"></span></div></div>${icon('chevron','category-detail-chevron')}</button>`).join('');
}
function notify(message) {clearTimeout(toastTimer);$('#toast').innerHTML=icon('check')+html(message);$('#toast').classList.add('show');toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),3200);}
async function commit(next,message) {
 try {
  state=await expenseRepository.save(next);render();prunePhotoUrls();syncChannel?.postMessage({revision:state.revision});
  if(message)notify(message);return true;
 } catch(error) {
  if(error.name==='StorageConflictError') {
   try {state=await expenseRepository.load();render();notify(error.message);}
   catch {notify('Could not refresh expenses. Your draft is still open; please try again.');}
  }
  else notify('Could not save. Your changes are still here; check available browser storage and try again.');
  return false;
 }
}
const nav=()=>['home','history','calendar','memories','insights'].map(p=>`<a href="#${p}" class="nav-item ${page===p?'active':''}" ${page===p?'aria-current="page"':''}>${icon(p==='memories'?'camera':p)}<span>${p[0].toUpperCase()+p.slice(1)}</span></a>`).join('');
function render() {
 if(!state)return;
 const title={home:'Your little <em>spending diary.</em>',history:'All the little <em>details.</em>',calendar:'A little moment, <em>every day.</em>',memories:'The days worth <em>keeping.</em>',insights:'Where your <em>little totals go.</em>'}[page];
 const subtitle={home:'Everyday expenses. Favourite little moments.',history:'Every expense, right where you left it.',calendar:'Your spending, one day at a time.',memories:'Your favourite bites, places and everyday joys.',insights:'A gentle look at this month’s spending.'}[page];
 const brand=`<span class="brand-mark">${icon('pocket')}</span>pocket<span class="brand-dot">.</span>`;
 $('#app').innerHTML=`<a class="skip-link" href="#main">Skip to content</a><aside class="sidebar"><a class="brand" href="#home" aria-label="Pocket home">${brand}</a><div class="sidebar-caption">YOUR LITTLE CORNER</div><nav aria-label="Main navigation">${nav()}</nav><div class="sidebar-note"><span class="note-symbol">${icon('heart')}</span><p>Little things,<br>lovingly kept.</p></div><div class="sidebar-bottom"><button class="subtle" data-action="backup">${icon('archive')} Backup & restore</button><button class="subtle" data-action="settings">${icon('settings')} Preferences</button><div class="storage-note">${icon('shield')} Saved to your account</div></div></aside>
 <div class="workspace"><header class="topbar"><span class="breadcrumb">My diary <span>/</span> <strong>${page[0].toUpperCase()+page.slice(1)}</strong></span><div class="topbar-right"><span class="private-badge">${icon('shield')} Just for you</span><button class="avatar-button" data-action="settings" aria-label="Preferences">P</button></div></header><header class="mobile-header"><a class="brand" href="#home" aria-label="Pocket home">${brand}</a><div class="mobile-header-actions"><button class="icon-button" data-action="backup" aria-label="Backup and restore">${icon('archive')}</button><button class="icon-button" data-action="settings" aria-label="Preferences">${icon('settings')}</button></div></header><main id="main" tabindex="-1"><header class="page-header"><div><div class="eyebrow">${({home:'A POCKETFUL OF EVERYDAY',history:'YOUR EXPENSE JOURNAL',calendar:'THE LITTLE DAY BOOK',memories:'YOUR PHOTO SCRAPBOOK',insights:'A MOMENT TO REFLECT'})[page]}</div><h1>${title}</h1><p class="page-subtitle">${subtitle}</p></div><div class="header-actions"><button class="primary desktop-add" data-action="add">${icon('plus')} Add expense</button></div></header><div id="page-content">${({home,history,calendar,memories,insights})[page]()}</div></main><footer class="desktop-footer"><span>A little diary. A lot of lovely days.</span><span>Pocket · MYR</span></footer></div><nav class="bottom-nav" aria-label="Mobile navigation">${nav()}</nav><button class="fab" data-action="add" aria-label="Add expense">${icon('plus')}</button>`;
 if(page==='home'){const month=today().slice(0,7),fixed=state.expenses.filter(e=>isFixed(e)&&e.date.startsWith(month));$('.journal-links').insertAdjacentHTML('beforebegin',`<section class="panel fixed-expenses"><div class="section-header"><h2>Everyday spending · ${monthLabel(month)}</h2><strong>${currency(total(dailyRecords().filter(e=>e.date.startsWith(month))))}</strong></div></section>`+fixedList(fixed));}
 bindMain();
}
function home() {
 const month=today().slice(0,7), monthExpenses=filterExpenses(state.expenses,{month}), dayExpenses=filterExpenses(dailyRecords(),{date:today()}), records=filterExpenses(dailyRecords()), groups=categorySummary(monthExpenses), week=activitySeries(dailyRecords(),{endDate:today()});
 return `<div class="overview"><section class="month-card"><div class="card-top"><span class="hero-label">THIS MONTH'S LITTLE TOTAL</span><span class="month-badge">${icon('calendar')}${monthLabel(month)}</span></div><div class="month-amount">${money(total(monthExpenses))}</div><div class="month-foot"><span class="small-line">${monthExpenses.length} expense${monthExpenses.length===1?'':'s'} tucked away</span><span class="hero-stamp" aria-hidden="true">${icon('heart')}</span></div></section><section class="today-card"><div class="metric-heading"><span>Today</span>${icon('sun')}</div><div class="today-amount">${money(total(dayExpenses))}</div><p class="metric-note">${dayExpenses.length} expense${dayExpenses.length===1?'':'s'} · ${dateLabel(today())}</p><span class="today-sticker" aria-hidden="true">${icon('sparkle')}</span></section></div>
 <div class="journal-links"><a href="#calendar" class="journal-link calendar-link"><span class="link-icon">${icon('calendar')}</span><span><strong>A day at a time</strong><small>Open your spending calendar</small></span>${icon('chevron')}</a><a href="#memories" class="journal-link memories-link"><span class="link-icon">${icon('camera')}</span><span><strong>The little moments</strong><small>Peek inside your photo wall</small></span>${icon('chevron')}</a></div>
 <div class="home-grid"><div class="home-main"><section class="recent-section"><div class="section-header"><div><span class="section-kicker">DEAR LITTLE DIARY</span><h2>Daily expenses</h2></div><a href="#history" class="text-link">View all ${icon('chevron')}</a></div><div class="expense-list">${expenseList(records)}</div></section></div><aside class="home-aside"><section class="panel category-preview"><div class="section-header"><div><span class="section-kicker">THIS MONTH</span><h2>Where it went</h2></div>${icon('heart')}</div>${categoryRing(groups)}${groups.length?`<div class="mini-legend">${groups.map(g=>`<button type="button" data-category-detail="${html(g.category)}" data-category-month="${month}"><span><i style="background:${categoryColor(g.category)}"></i>${html(g.category)}</span><strong>${Math.round(g.percent)}%</strong></button>`).join('')}</div>`:'<p class="muted ring-empty">A fresh little page, just for you.</p>'}<a href="#insights" class="secondary insights-link">Explore insights ${icon('chevron')}</a></section><section class="panel activity-panel"><div class="section-header"><div><span class="section-kicker">THE PAST SEVEN DAYS</span><h2>Your week, softly</h2></div></div>${activityChart(week,true)}<div class="chart-foot"><span>Daily spending</span><strong>${currency(total(week))}</strong></div></section></aside></div>${sampleNotice()}`;
}
function expenseList(expenses) {
 const fixed=expenses.filter(isFixed);if(fixed.length)return fixedList(fixed)+(expenses.some(e=>!isFixed(e))?expenseList(expenses.filter(e=>!isFixed(e))):'');
 if(!expenses.length)return `<div class="empty-state">${icon('pocket')}<h3>${state.expenses.length?'No expenses found':'A fresh start'}</h3><p>${state.expenses.length?'Try a different filter or search.':'Add your first expense. A little tracking goes a long way.'}</p>${!state.expenses.length?'<button class="primary" data-action="add">'+icon('plus')+' Add Expense</button>':''}</div>`;
 return groupExpensesByDay(expenses).map(day=>{
  const groupTitle=day.date===today()?'Today':day.date===yesterday()?'Yesterday':'';
  return `<section class="expense-day" aria-label="${dateLabel(day.date)}"><div class="date-group"><div class="day-heading">${groupTitle?`<strong>${groupTitle}</strong>`:''}<span>${dateLabel(day.date)}</span></div><div class="day-subtotal"><strong>${currency(day.amount)}</strong><span>${day.expenses.length} expense${day.expenses.length===1?'':'s'}</span></div></div>${day.expenses.map(e=>`<button class="expense-row" data-expense="${html(e.id)}" aria-label="View ${html(e.category)} expense, ${currency(e.amount)}${e.remark?', '+html(e.remark):''}${e.photos?.length?', '+e.photos.length+' photos':''}">${badge(e.category)}<span class="expense-info"><span class="expense-category">${html(e.category)}</span>${e.remark?`<span class="expense-remark">${html(e.remark)}</span>`:''}</span>${e.photos?.length?`<span class="expense-photo-preview"><img src="${photoUrl(coverPhoto(e))}" alt="" loading="lazy">${e.photos.length>1?`<span>+${e.photos.length-1}</span>`:''}</span>`:''}<span class="expense-amount">${currency(e.amount)}</span>${icon('chevron','row-chevron')}</button>`).join('')}</section>`;
 }).join('');
}
function yesterday(){const d=new Date();d.setDate(d.getDate()-1);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
function sampleNotice(){const n=state.expenses.filter(e=>e.id.startsWith('sample_')).length;return n?`<div class="sample-notice"><span><span class="sample-label">SAMPLE DATA</span> A few expenses to help you get started.</span><button class="text-link" data-action="clear-samples">Clear samples</button></div>`:'';}
function history() {
 const records=filterExpenses(state.expenses,filters);
 return `${categoryOrigin?`<div class="category-history-context"><button class="text-link" data-action="back-insights">${icon('left')} Back to Insights</button><span>${html(filters.category)} · ${filters.month?monthLabel(filters.month):'All months'}</span></div>`:''}<div class="section-header history-heading"><p class="muted">Every expense, easy to find.</p><button class="secondary export-button" data-action="export">${icon('download')} Export CSV</button></div><section class="filter-panel" aria-label="Filter expenses"><label class="search-field">${icon('search')}<input type="search" id="search" placeholder="Search remarks…" aria-label="Search remarks" value="${html(filters.search)}"></label><div class="filter-grid"><label><span>Month</span><div class="month-filter"><input id="filter-month" type="month" aria-label="Filter by month" value="${filters.month}"><button class="icon-button" data-action="all-months" aria-label="Show all months">${icon('close')}</button></div></label><label><span>Date</span><input id="filter-date" type="date" aria-label="Filter by date" value="${filters.date}"></label><label><span>Category</span><select id="filter-category" aria-label="Filter by category"><option value="">All categories</option>${state.categories.map(c=>`<option value="${html(c.name)}" ${filters.category===c.name?'selected':''}>${html(c.name)}${c.hidden?' (hidden)':''}</option>`).join('')}</select></label></div><button class="text-link reset-filters" data-action="reset-filters">Reset filters</button></section><div class="filtered-summary"><span><strong id="record-count">${records.length}</strong> expense${records.length===1?'':'s'}<span class="muted"> · Filtered total</span></span><strong id="filtered-total">${currency(total(records))}</strong></div><div class="expense-list" id="history-results">${expenseList(records)}</div>`;
}
function insights() {
 const expenses=filterExpenses(state.expenses,{month:insightMonth}), groups=categorySummary(expenses), metrics=monthlyMetrics(state.expenses,insightMonth,today());
 return `<div class="section-header insights-heading"><span class="section-kicker">${monthLabel(insightMonth)}</span><div class="month-switcher"><button class="icon-button" data-month-step="-1" aria-label="Previous month">${icon('left')}</button><label><span class="sr-only">Insights month</span><input type="month" id="insights-month" value="${insightMonth}" required></label><button class="icon-button" data-month-step="1" aria-label="Next month">${icon('chevron')}</button></div></div><div class="insights-metrics"><section class="insights-total"><span>Monthly spending</span><h2>${money(metrics.amount)}</h2><span class="muted">${expenses.length} expense${expenses.length===1?'':'s'} recorded</span></section><section class="insight-stat"><span>Average expense</span><strong>${currency(metrics.averageExpense)}</strong><small>Per recorded expense</small></section><section class="insight-stat"><span>Daily average</span><strong>${currency(metrics.dailyAverage)}</strong><small>${insightMonth===today().slice(0,7)?'Across this month so far':'Across the full month'}</small></section></div><section class="panel monthly-activity"><div class="section-header"><div><span class="section-kicker">YOUR SPENDING RHYTHM</span><h2>A month in motion</h2></div><span class="period-tag">Daily · MYR</span></div>${activityChart(activitySeries(expenses,{month:insightMonth}))}</section><section class="panel category-summary"><div class="section-header"><div><span class="section-kicker">THE BIG PICTURE</span><h2>Spending by category</h2></div><div class="insight-card-actions"><span class="period-tag">${groups.length} categories</span><button class="text-link" data-action="make-monthly-card">${icon('sparkle')} Make a monthly card</button></div></div>${groups.length?`<div class="category-detail-grid">${categoryRing(groups)}<div>${categoryRows(groups,insightMonth)}</div></div>`:`<div class="empty-state">${icon('insights')}<h3>No spending this month</h3><p>Choose another month or record an expense to see your summary.</p></div>`}</section>`;
}
function calendar() {
 const records=filterExpenses(dailyRecords(),{month:calendarMonth}), days=calendarDays(dailyRecords(),calendarMonth);
 return `<section class="panel calendar-panel"><div class="section-header"><div><span class="section-kicker">ONE LITTLE SQUARE, ONE DAY</span><h2>${monthLabel(calendarMonth)}</h2></div><div class="month-switcher"><button class="icon-button" data-calendar-step="-1" aria-label="Previous calendar month">${icon('left')}</button><label><span class="sr-only">Calendar month</span><input type="month" id="calendar-month" value="${calendarMonth}"></label><button class="icon-button" data-calendar-step="1" aria-label="Next calendar month">${icon('chevron')}</button></div></div><div class="calendar-overview"><span><strong>${currency(total(records))}</strong> this month</span><span>${records.length} expense${records.length===1?'':'s'}</span></div><div class="calendar-weekdays" aria-hidden="true">${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(day=>`<span>${day}</span>`).join('')}</div><div class="calendar-grid" role="group" aria-label="${monthLabel(calendarMonth)} spending calendar">${days.map(day=>day?`<button class="calendar-day ${day.date===today()?'is-today':''} ${day.date===calendarDate?'is-selected':''} ${day.count?'has-spending':''}" data-calendar-date="${day.date}" aria-pressed="${day.date===calendarDate}" aria-label="${dateLabel(day.date)}, ${currency(day.amount)}, ${day.count} expenses${day.cover?', with photos':''}"><span class="calendar-date-number">${day.day}</span>${day.cover?`<img class="calendar-cover" src="${photoUrl(day.cover)}" alt="" loading="lazy">`:''}${day.count?`<span class="calendar-spend">${compactMoney(day.amount)}</span>`:'<span class="quiet-day">·</span>'}${day.cover?`<span class="calendar-camera">${icon('camera')}</span>`:''}</button>`:'<span class="calendar-blank" aria-hidden="true"></span>').join('')}</div><p class="calendar-hint">Amounts in RM · tap a day to see every detail</p></section><section id="calendar-day-details" class="calendar-day-details" aria-live="polite">${calendarDayDetails()}</section>`;
}
function compactMoney(amount) {
 return amount>=1000?new Intl.NumberFormat('en-GB',{notation:'compact',maximumFractionDigits:1}).format(amount):amount.toFixed(2);
}
function calendarDayDetails() {
 const records=filterExpenses(dailyRecords(),{date:calendarDate});
 return `<div class="section-header"><div><span class="section-kicker">A PAGE FROM YOUR DIARY</span><h2>${dateLabel(calendarDate)}</h2></div><strong class="selected-day-total">${currency(total(records))}</strong></div>${records.length?`<div class="expense-list">${expenseList(records)}</div>`:`<div class="empty-state calendar-empty">${icon('sun')}<h3>A quiet little day</h3><p>No expenses recorded for this date.</p><button class="secondary" data-action="add">${icon('plus')} Add expense</button></div>`}`;
}
function changeCalendarMonth(month) {
 if(!/^\d{4}-\d{2}$/.test(month))return;
 calendarMonth=month;
 calendarDate=month===today().slice(0,7)?today():month+'-01';
 render();
}
function bindCalendarDay() {
 document.querySelectorAll('[data-calendar-date]').forEach(button=>button.onclick=()=>{
  calendarDate=button.dataset.calendarDate;
  document.querySelectorAll('[data-calendar-date]').forEach(day=>{const selected=day===button;day.classList.toggle('is-selected',selected);day.setAttribute('aria-pressed',String(selected));});
  $('#calendar-day-details').innerHTML=calendarDayDetails();
  $('#calendar-day-details').querySelectorAll('[data-expense]').forEach(b=>b.onclick=()=>expenseDetails(b.dataset.expense));
  $('#calendar-day-details').querySelectorAll('[data-action="add"]').forEach(b=>b.onclick=actions.add);
 });
}
function photoWall() {
 const groups=groupMemories(state.expenses,memoryMonth), count=memoryEntries(state.expenses,memoryMonth).length;
 return `<div class="memories-toolbar"><span class="memory-count">${icon('heart')} ${count} little memor${count===1?'y':'ies'}</span><div class="memory-month-filter"><label for="memory-month">${memoryMonth?monthLabel(memoryMonth):'All months'}</label><input type="month" id="memory-month" aria-label="Filter memories by month" value="${memoryMonth}">${memoryMonth?`<button class="text-link" data-action="all-memories">Show all</button>`:''}</div></div>${groups.length?groups.map(group=>`<section class="memory-month"><div class="section-header"><h2>${monthLabel(group.month)}</h2><span class="period-tag">${group.entries.length} photo${group.entries.length===1?'':'s'}</span></div><div class="memory-wall">${group.entries.map(({expense,photo})=>memoryCard(expense,photo)).join('')}</div></section>`).join(''):`<div class="panel empty-state memories-empty">${icon('camera')}<h3>${memoryMonth?'A blank page this month':'A home for your little moments'}</h3><p>${memoryMonth?'Choose another month to find your photo memories.':'Add a photo to an expense and keep a little piece of your day.'}</p><button class="primary" data-action="add">${icon('plus')} Add expense</button></div>`}`;
}
function memoryDetails(expenseId,photoId) {
 const expense=state.expenses.find(e=>e.id===expenseId),photo=expense?.photos?.find(p=>p.id===photoId);
 if(!photo)return;
 const d=dialog(`${modalHeading(html(photo.caption||expense.remark||expense.category),photo.caption?html(expense.remark||expense.category):'')}<img class="full-photo" src="${photoUrl(photo)}" alt="${html(photo.caption||expense.remark||expense.category)}"><div class="memory-detail-caption"><span>${dateLabel(expense.date)}</span><strong>${currency(expense.amount)}</strong></div><button class="primary memory-expense-button">View expense details</button>`,'photo-modal');
 $('.memory-expense-button',d).onclick=()=>{d.close();expenseDetails(expenseId);};
}

function memoryTabs() {
 return `<div class="memory-tabs" role="group" aria-label="Memory views">${[['photos','camera','Photo wall'],['albums','book','Little albums'],['recap','sparkle','Monthly card']].map(([key,symbol,label])=>`<button type="button" data-memory-tab="${key}" class="${memoryTab===key?'active':''}" aria-pressed="${memoryTab===key}">${icon(symbol)}<span>${label}</span></button>`).join('')}</div>`;
}
function memories() {
 return `${memoryTabs()}${memoryTab==='albums'?albumsView():memoryTab==='recap'?recapView():photoWall()}`;
}
function albumsView() {
 const album=state.albums.find(a=>a.id===selectedAlbumId);
 if(album) {
  const summary=albumSummary(album,state.expenses);
  return `<button class="text-link" data-action="all-albums">${icon('left')} All little albums</button><section class="album-hero album-${album.color}"><span class="album-tape" aria-hidden="true"></span><div class="album-hero-top"><span class="section-kicker">A LITTLE CHAPTER OF YOUR LIFE</span><div><button class="icon-button" data-album-edit="${html(album.id)}" aria-label="Edit album">${icon('edit')}</button><button class="icon-button" data-album-delete="${html(album.id)}" aria-label="Delete album">${icon('trash')}</button></div></div><h2>${html(album.name)}</h2>${album.note?`<p>${html(album.note)}</p>`:''}<div class="album-totals"><strong>${currency(summary.amount)}</strong><span>${summary.count} expense${summary.count===1?'':'s'} · ${summary.photos} photo${summary.photos===1?'':'s'}</span></div><button class="secondary" data-album-select="${html(album.id)}">${icon('plus')} Choose expenses</button></section><div class="album-content-tabs" role="group" aria-label="Album content"><button data-album-content="expenses" class="${albumContent==='expenses'?'active':''}" aria-pressed="${albumContent==='expenses'}">Expenses</button><button data-album-content="photos" class="${albumContent==='photos'?'active':''}" aria-pressed="${albumContent==='photos'}">Photos</button></div>${albumContent==='photos'?albumPhotos(summary.records):summary.records.length?`<div class="expense-list">${expenseList(summary.records)}</div>`:`<div class="panel empty-state">${icon('book')}<h3>Your next little chapter</h3><p>Choose expenses from your diary to bring this album to life.</p><button class="primary" data-album-select="${html(album.id)}">Choose expenses</button></div>`}`;
 }
 return `<div class="section-header album-list-heading"><div><span class="section-kicker">TRIPS, BIRTHDAYS & EVERYDAY JOYS</span><h2>Your little albums</h2></div><button class="primary" data-action="new-album">${icon('plus')} New album</button></div>${state.albums.length?`<div class="album-grid">${[...state.albums].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)).map(album=>{
  const summary=albumSummary(album,state.expenses);
  return `<button class="album-card album-${album.color}" data-album-id="${html(album.id)}"><span class="album-spine" aria-hidden="true"></span><span class="album-card-cover">${summary.cover?`<img src="${photoUrl(summary.cover)}" alt="" loading="lazy">`:icon('heart')}</span><span class="album-card-copy"><strong>${html(album.name)}</strong><span>${summary.count} expense${summary.count===1?'':'s'} · ${summary.photos} photo${summary.photos===1?'':'s'}</span><b>${currency(summary.amount)}</b></span></button>`;
 }).join('')}</div>`:`<div class="panel empty-state albums-empty">${icon('book')}<h3>A little home for every chapter</h3><p>Keep a trip, a birthday or your favourite café visits together, with all their expenses and photos.</p><button class="primary" data-action="new-album">${icon('plus')} Make your first album</button></div>`}`;
}
function albumPhotos(expenses) {
 const entries=memoryEntries(expenses);
 return entries.length?`<div class="memory-wall album-photo-wall">${entries.map(({expense,photo})=>memoryCard(expense,photo)).join('')}</div>`:`<div class="panel empty-state">${icon('camera')}<h3>A few memories to come</h3><p>Photos from the expenses in this album will appear here.</p></div>`;
}
function memoryCard(expense,photo) {
 return `<button class="memory-card" data-memory-expense="${html(expense.id)}" data-memory-photo="${html(photo.id)}" aria-label="Open ${html(photo.caption||expense.remark||expense.category)} memory, ${dateLabel(expense.date)}"><span class="memory-image"><img src="${photoUrl(photo)}" alt="${html(photo.caption||expense.remark||expense.category)}" loading="lazy">${photo.id===coverPhoto(expense)?.id?`<span class="memory-cover-label">${icon('heart')} Cover</span>`:''}</span><span class="memory-caption"><strong>${html(photo.caption||expense.remark||expense.category)}</strong><span>${dateLabel(expense.date)}</span><span class="memory-card-foot"><span>${html(expense.category)}</span><b>${currency(expense.amount)}</b></span></span></button>`;
}
function albumForm(existing) {
 const d=dialog(`${modalHeading(existing?'Edit little album':'A new little chapter')}<form id="album-form"><label class="form-label" for="album-name">Album name</label><input id="album-name" maxlength="48" required placeholder="Penang little getaway" value="${html(existing?.name||'')}"><label class="form-label album-note-label" for="album-note">A little note <span class="muted">(optional)</span></label><textarea id="album-note" maxlength="200" rows="3" placeholder="The people, places and little things to remember…">${html(existing?.note||'')}</textarea><fieldset class="album-color-field"><legend>Cover colour</legend><div class="album-colors">${Object.entries(ALBUM_COLORS).map(([key,label])=>`<button type="button" class="album-color-swatch album-${key} ${key===(existing?.color||'rose')?'selected':''}" data-album-color="${key}" aria-label="${label}" aria-pressed="${key===(existing?.color||'rose')}">${icon('heart')}</button>`).join('')}</div></fieldset><p class="form-error" id="album-error" role="alert"></p><button class="primary save-button" type="submit">${existing?'Save album':'Create album'}</button></form>`,'album-form-modal');
 let color=existing?.color||'rose';
 d.querySelectorAll('[data-album-color]').forEach(b=>b.onclick=()=>{color=b.dataset.albumColor;d.querySelectorAll('[data-album-color]').forEach(s=>{s.classList.toggle('selected',s===b);s.setAttribute('aria-pressed',String(s===b));});});
 $('#album-form',d).onsubmit=async event=>{
  event.preventDefault();const name=$('#album-name',d).value.trim();if(!name){$('#album-error',d).textContent='Give your album a little name.';return;}
  const button=$('.save-button',d);button.disabled=true;
  try {
   const now=new Date().toISOString(),album={id:existing?.id||crypto.randomUUID(),name,note:$('#album-note',d).value.trim(),color,expenseIds:existing?.expenseIds||[],createdAt:existing?.createdAt||now,updatedAt:now};
   const albums=existing?state.albums.map(a=>a.id===album.id?album:a):[...state.albums,album];
   if(await commit({...state,albums},existing?'Album updated':'A new little chapter is ready')){
    selectedAlbumId=album.id;memoryTab='albums';albumContent='expenses';d.close();page='memories';location.hash='memories';render();
    if(!existing&&state.expenses.length)albumExpensePicker(album);
   }
  } finally {if(d.open)button.disabled=false;}
 };
 $('#album-name',d).focus();
}
function albumExpensePicker(album) {
 const selected=new Set(album.expenseIds);
 const d=dialog(`${modalHeading('Fill your little album',html(album.name))}<label class="search-field album-picker-search">${icon('search')}<input id="album-expense-search" type="search" placeholder="Find a remark or category…" aria-label="Search expenses for album"></label><div id="album-expense-list" class="album-expense-list"></div><div class="album-picker-footer"><p id="album-selection-summary" aria-live="polite"></p><button class="primary" id="save-album-expenses">Save selection</button></div>`,'album-picker-modal');
 const refreshSummary=()=>{const records=state.expenses.filter(e=>selected.has(e.id));$('#album-selection-summary',d).textContent=`${records.length} selected · ${currency(total(records))}`;};
 const draw=()=>{
  const search=$('#album-expense-search',d).value.trim().toLowerCase(),records=filterExpenses(state.expenses).filter(e=>!search||(e.remark+' '+e.category).toLowerCase().includes(search));
  $('#album-expense-list',d).innerHTML=records.length?records.map(e=>`<label class="album-expense-choice"><input type="checkbox" data-album-expense="${html(e.id)}" ${selected.has(e.id)?'checked':''}><span class="album-choice-copy"><strong>${html(e.remark||e.category)}</strong><small>${dateLabel(e.date)} · ${html(e.category)}</small></span><strong class="album-choice-amount">${currency(e.amount)}</strong></label>`).join(''):'<p class="muted album-picker-empty">No matching expenses.</p>';
  d.querySelectorAll('[data-album-expense]').forEach(input=>input.onchange=()=>{if(input.checked)selected.add(input.dataset.albumExpense);else selected.delete(input.dataset.albumExpense);refreshSummary();});refreshSummary();
 };
 $('#album-expense-search',d).oninput=draw;draw();
 $('#save-album-expenses',d).onclick=async event=>{const button=event.currentTarget;button.disabled=true;try{if(await commit({...state,albums:state.albums.map(a=>a.id===album.id?{...a,expenseIds:[...selected],updatedAt:new Date().toISOString()}:a)},'Your little album is updated'))d.close();}finally{if(d.open)button.disabled=false;}};
}
function recapView() {
 const recap=monthlyRecap(state.expenses,recapMonth);
 return `<div class="recap-controls panel"><div class="section-header"><div><span class="section-kicker">A LITTLE KEEPSAKE</span><h2>Your monthly card</h2></div><label><span class="sr-only">Monthly card month</span><input type="month" id="recap-month" value="${recapMonth}"></label></div><label class="recap-privacy"><input type="checkbox" id="recap-hide-amounts" ${recapHideAmounts?'checked':''}><span>Hide amounts on my card</span>${icon('heart')}</label><button class="primary" id="download-monthly-card">${icon('download')} Download card · PNG</button><p class="recap-download-note">Your cover photos and notes, kept together in one card.</p></div><article class="monthly-recap-card" id="monthly-card-preview"><span class="recap-tape" aria-hidden="true"></span><div class="recap-card-brand"><strong>pocket.</strong><span>${monthLabel(recapMonth)}</span></div><h2>A month of little moments</h2><div class="recap-card-total"><span>${recapHideAmounts?'A LITTLE PRIVACY, A LOT OF MEMORIES':'MY MONTHLY SPENDING'}</span><strong>${recapHideAmounts?'Kept just for me':currency(recap.amount)}</strong></div><div class="recap-card-stats"><div><strong>${recap.count} expense${recap.count===1?'':'s'}</strong><span>little entries in my diary</span></div><div><strong>${html(recap.favourite?.category||'A fresh little page')}</strong><span>most often this month</span></div></div>${recap.photos.length?`<div class="recap-photo-grid photos-${recap.photos.length}">${recap.photos.map(({expense,photo})=>`<figure><img src="${photoUrl(photo)}" alt="${html(photo.caption||expense.remark||expense.category)}"><figcaption>${html(photo.caption||expense.remark||expense.category)}</figcaption></figure>`).join('')}</div>`:`<div class="recap-no-photos">${icon('heart')}<strong>Everyday things, lovingly kept.</strong><span>No photo memories this month</span></div>`}<p class="recap-card-footer">A little diary. A month to remember.</p></article>`;
}

function bindScrapbookControls() {
 document.querySelectorAll('[data-memory-tab]').forEach(b=>b.onclick=()=>{memoryTab=b.dataset.memoryTab;if(memoryTab==='albums')selectedAlbumId=null;render();});
 document.querySelectorAll('[data-album-id]').forEach(b=>b.onclick=()=>{selectedAlbumId=b.dataset.albumId;albumContent='expenses';render();});
 document.querySelectorAll('[data-album-edit]').forEach(b=>b.onclick=()=>albumForm(state.albums.find(a=>a.id===b.dataset.albumEdit)));
 document.querySelectorAll('[data-album-select]').forEach(b=>b.onclick=()=>albumExpensePicker(state.albums.find(a=>a.id===b.dataset.albumSelect)));
 document.querySelectorAll('[data-album-delete]').forEach(b=>b.onclick=()=>{
  const album=state.albums.find(a=>a.id===b.dataset.albumDelete);
  confirmDialog('Delete this little album?',`Remove “${album.name}”? Its expenses and photos will stay in your diary.`,'Delete album',async()=>{if(await commit({...state,albums:state.albums.filter(a=>a.id!==album.id)},'Album removed; your expenses are still here')){selectedAlbumId=null;render();return true;}return false;});
 });
 document.querySelectorAll('[data-album-content]').forEach(b=>b.onclick=()=>{albumContent=b.dataset.albumContent;render();});
 if($('#recap-month'))$('#recap-month').onchange=e=>{if(e.target.value){recapMonth=e.target.value;render();}};
 if($('#recap-hide-amounts'))$('#recap-hide-amounts').onchange=e=>{recapHideAmounts=e.target.checked;render();};
 if($('#download-monthly-card'))$('#download-monthly-card').onclick=async event=>{
  const button=event.currentTarget;button.disabled=true;button.textContent='Making your little keepsake…';
  try {const blob=await renderRecapCard(monthlyRecap(state.expenses,recapMonth),{hideAmounts:recapHideAmounts});downloadFile(blob,`pocket-monthly-card-${recapMonth}${recapHideAmounts?'-private':''}.png`);notify('Your monthly card is ready');}
  catch(error){notify(error.message||'The card could not be made. Please try again.');}
  finally {if(button.isConnected){button.disabled=false;button.innerHTML=icon('download')+' Download card · PNG';}}
 };
}
function photoNotesEditor(photos,coverId,onApply) {
 const draft=photos.map(photo=>({...photo,caption:photo.caption||''})),urls=new Map(draft.map(p=>[p.id,URL.createObjectURL(p.blob)]));
 let selected=coverId||draft[0]?.id||'';
 const d=dialog(`${modalHeading('Little photo notes','Choose a cover and add a few words. These save with your expense.')}<div class="photo-notes-list">${draft.map((photo,i)=>`<section class="photo-note-editor"><div class="photo-note-image"><img src="${urls.get(photo.id)}" alt="Expense photo ${i+1}"><button type="button" data-set-cover="${html(photo.id)}" class="${photo.id===selected?'is-cover':''}" aria-pressed="${photo.id===selected}">${icon('heart')}<span>${photo.id===selected?'Cover photo':'Set as cover'}</span></button></div><label><span>Photo ${i+1} · a little note</span><textarea data-photo-caption="${html(photo.id)}" maxlength="160" rows="2" placeholder="This cake deserves a second visit…">${html(photo.caption)}</textarea></label></section>`).join('')}</div><button class="primary save-button" id="apply-photo-notes">Keep these little notes</button>`,'photo-notes-modal');
 d.querySelectorAll('[data-set-cover]').forEach(b=>b.onclick=()=>{selected=b.dataset.setCover;d.querySelectorAll('[data-set-cover]').forEach(button=>{const chosen=button===b;button.classList.toggle('is-cover',chosen);button.setAttribute('aria-pressed',String(chosen));$('span',button).textContent=chosen?'Cover photo':'Set as cover';});});
 d.querySelectorAll('[data-photo-caption]').forEach(input=>input.oninput=()=>{draft.find(p=>p.id===input.dataset.photoCaption).caption=input.value;});
 $('#apply-photo-notes',d).onclick=()=>{onApply(draft.map(p=>({...p,caption:p.caption.trim()})),selected);d.close();};
 d.addEventListener('close',()=>{for(const url of urls.values())URL.revokeObjectURL(url);});
}

function bindMain() {
 bindScrapbookControls();
 document.querySelectorAll('[data-action]').forEach(button=>button.onclick=()=>actions[button.dataset.action]?.());
 document.querySelectorAll('[data-category-detail]').forEach(button=>button.onclick=()=>{filters={month:button.dataset.categoryMonth,date:'',category:button.dataset.categoryDetail,search:''};categoryOrigin=true;page='history';location.hash='history';render();window.scrollTo(0,0);});
 document.querySelectorAll('[data-expense]').forEach(button=>button.onclick=()=>expenseDetails(button.dataset.expense));
 document.querySelectorAll('[data-memory-photo]').forEach(b=>b.onclick=()=>memoryDetails(b.dataset.memoryExpense,b.dataset.memoryPhoto));
 if(page==='calendar'){
  $('#calendar-month').onchange=e=>{if(e.target.value)changeCalendarMonth(e.target.value);};
  document.querySelectorAll('[data-calendar-step]').forEach(b=>b.onclick=()=>changeCalendarMonth(shiftMonth(calendarMonth,Number(b.dataset.calendarStep))));bindCalendarDay();
 }
 if(page==='memories'&&$('#memory-month'))$('#memory-month').onchange=e=>{memoryMonth=e.target.value;render();};
 if(page==='history'){
  $('#search').oninput=event=>{filters.search=event.target.value;updateHistory();};
  ['month','date','category'].forEach(key=>$('#filter-'+key).onchange=event=>{filters[key]=event.target.value;updateHistory();});
 }
 if(page==='insights'){
  $('#insights-month').onchange=event=>{if(event.target.value){insightMonth=event.target.value;render();}};
  document.querySelectorAll('[data-month-step]').forEach(b=>b.onclick=()=>{const d=new Date(insightMonth+'-01T12:00:00');d.setMonth(d.getMonth()+Number(b.dataset.monthStep));insightMonth=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;render();});
 }
}
function updateHistory(){const records=filterExpenses(state.expenses,filters);const context=$('.category-history-context>span');if(context)context.textContent=(filters.category||'All categories')+' · '+(filters.month?monthLabel(filters.month):'All months');$('.filtered-summary').innerHTML=`<span><strong id="record-count">${records.length}</strong> expense${records.length===1?'':'s'}<span class="muted"> · Filtered total</span></span><strong id="filtered-total">${currency(total(records))}</strong>`;$('#history-results').innerHTML=expenseList(records);$('#history-results').querySelectorAll('[data-expense]').forEach(b=>b.onclick=()=>expenseDetails(b.dataset.expense));}
const actions={
 'back-insights':()=>{categoryOrigin=false;location.hash='insights';},
 'all-albums':()=>{selectedAlbumId=null;render();}, 'new-album':()=>albumForm(), 'make-monthly-card':()=>{recapMonth=insightMonth;memoryTab='recap';page='memories';location.hash='memories';render();window.scrollTo(0,0);},
 backup:()=>backupDialog(), 'all-memories':()=>{memoryMonth='';render();},
 add:()=>expenseForm(undefined,page==='calendar'?calendarDate:today()), settings:()=>preferences(), export:()=>{const blob=new Blob([csvExport(state.expenses)],{type:'text/csv;charset=utf-8;'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`pocket-expenses-${today()}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notify('Expenses exported');},
 'clear-samples':()=>confirmDialog('Clear sample expenses?','Only the sample records will be removed. Your own expenses will stay.','Clear samples',()=>commit({...state,expenses:state.expenses.filter(e=>!e.id.startsWith('sample_'))},'Sample expenses cleared')),
 'reset-filters':()=>{categoryOrigin=false;filters={month:'',date:'',category:'',search:''};render();},
 'all-months':()=>{filters.month='';$('#filter-month').value='';updateHistory();}
};
function dialog(content,cls='') {
 const previous=document.activeElement;
 const d=document.createElement('dialog');d.className='modal '+cls;d.innerHTML=content;document.body.append(d);
 const heading=d.querySelector('h2');if(heading){heading.id='dialog-'+crypto.randomUUID();d.setAttribute('aria-labelledby',heading.id);}
 d.addEventListener('click',event=>{if(event.target===d){const r=d.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)d.close();}});
 d.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>d.close());
 d.addEventListener('close',()=>{d.remove();if(previous?.isConnected)previous.focus();else $('[data-action="add"]')?.focus();});
 d.showModal();return d;
}
const modalHeading=(title,subtitle='')=>`<div class="modal-header"><div><h2 id="dialog-title">${title}</h2>${subtitle?`<p class="muted">${subtitle}</p>`:''}</div><button class="icon-button" type="button" data-close aria-label="Close">${icon('close')}</button></div>`;
function expenseForm(existing,initialDate=today()) {
 const d=dialog(`${modalHeading(existing?'Edit expense':'Add expense')}<form id="expense-form" novalidate><label class="amount-label" for="amount">Amount</label><div class="amount-input"><span>RM</span><input id="amount" name="amount" type="text" inputmode="decimal" placeholder="0.00" autocomplete="off" value="${existing?existing.amount.toFixed(2):''}" required aria-describedby="form-error" maxlength="12" autofocus></div><fieldset class="categories-field"><legend>Category</legend><div class="category-picker">${state.categories.filter(c=>!c.hidden||c.name===existing?.category).map(c=>`<button type="button" class="category-option ${existing?.category===c.name?'selected':''}" data-category="${html(c.name)}" aria-pressed="${existing?.category===c.name?'true':'false'}">${icon(c.icon)}<span>${html(c.name)}</span></button>`).join('')}</div></fieldset><label class="form-label" for="remark">Remark <span class="muted">(optional)</span></label><input id="remark" name="remark" type="text" placeholder="What was it for?" maxlength="160" value="${html(existing?.remark||'')}"><div class="photo-field"><div class="photo-field-heading"><label class="form-label" for="expense-photos">Photos <span class="muted">(optional)</span></label><span class="photo-limit" id="photo-count"></span></div><div class="photo-previews" id="photo-previews"></div><button type="button" class="text-link photo-metadata-button" id="edit-photo-notes" hidden>${icon('heart')} Photo notes & cover</button><label class="photo-upload" for="expense-photos">${icon('camera')}<span>Add photos</span><input class="sr-only" type="file" id="expense-photos" accept="image/*" multiple aria-describedby="photo-help photo-error"></label><p class="photo-help" id="photo-help">Up to ${MAX_PHOTOS} photos · saved on this device</p><p class="form-error" id="photo-error" role="alert"></p></div><label class="form-date"><span>${icon('calendar')}Date</span><input id="expense-date" name="date" type="date" required value="${existing?.date||initialDate}"></label><p class="selected-date" id="expense-date-label">${dateLabel(existing?.date||initialDate)}</p>${state.albums.length?`<details class="expense-albums"><summary>${icon('book')} Little albums <span class="muted">(optional)</span></summary><div>${state.albums.map(album=>`<label><input type="checkbox" data-expense-album="${html(album.id)}" ${(album.expenseIds.includes(existing?.id)||(!existing&&page==='memories'&&memoryTab==='albums'&&selectedAlbumId===album.id))?'checked':''}><span>${html(album.name)}</span></label>`).join('')}</div></details>`:''}<p class="form-error" id="form-error" role="alert"></p><button class="primary save-button" type="submit">${icon('check')}${existing?'Save Changes':'Save Expense'}</button></form>`,'expense-modal');
 let category=existing?.category||'', photos=(existing?.photos||[]).map(p=>({...p,caption:p.caption||''})), coverId=coverPhoto(existing||{photos:[]})?.id||'', preparing=false, saving=false;
 const previewUrls=new Map();
 const dateInput=$('#expense-date',d),dateLabelNode=$('#expense-date-label',d),dateCaption=$('.form-date>span',d);
 let dailyDate=existing?.date||initialDate,selectedMonth=dailyDate.slice(0,7);
 const updateDateMode=()=>{const fixed=state.categories.find(c=>c.name===category)?.id==='fixed_expenses';dateInput.type=fixed?'month':'date';dateInput.value=fixed?selectedMonth:dailyDate;dateCaption.textContent=fixed?'For month':'Date';dateLabelNode.textContent=fixed?'One manual entry for this month. Shown separately from daily expenses.':dateLabel(dailyDate);};
 updateDateMode();
 const refreshPhotos=()=>{
  if(!photos.some(p=>p.id===coverId))coverId=photos[0]?.id||'';
  $('#edit-photo-notes',d).hidden=!photos.length;
  $('#photo-count',d).textContent=`${photos.length}/${MAX_PHOTOS}`;
  $('#photo-previews',d).innerHTML=photos.map((photo,i)=>{
   if(!previewUrls.has(photo.id))previewUrls.set(photo.id,URL.createObjectURL(photo.blob));
   return `<div class="photo-preview"><img src="${previewUrls.get(photo.id)}" alt="${html(photo.caption||'Expense photo '+(i+1))}">${photo.id===coverId?`<span class="draft-cover-label">${icon('heart')} Cover</span>`:''}${photo.caption?`<span class="draft-photo-caption">${html(photo.caption)}</span>`:''}<button type="button" class="remove-photo" data-remove-photo="${html(photo.id)}" aria-label="Remove photo ${i+1}">${icon('close')}</button></div>`;
  }).join('');
  $('#expense-photos',d).disabled=photos.length>=MAX_PHOTOS||preparing;
  $('.photo-upload',d).classList.toggle('upload-disabled',$('#expense-photos',d).disabled);
  d.querySelectorAll('[data-remove-photo]').forEach(b=>b.onclick=()=>{
   const id=b.dataset.removePhoto;photos=photos.filter(p=>p.id!==id);URL.revokeObjectURL(previewUrls.get(id));previewUrls.delete(id);$('#photo-error',d).textContent='';refreshPhotos();
  });
 };
 $('#edit-photo-notes',d).onclick=()=>photoNotesEditor(photos,coverId,(updated,id)=>{photos=updated;coverId=id;refreshPhotos();});
 refreshPhotos();
 d.addEventListener('close',()=>{for(const url of previewUrls.values())URL.revokeObjectURL(url);});
 dateInput.oninput=()=>{if(dateInput.type==='month')selectedMonth=dateInput.value;else dailyDate=dateInput.value;if(dateInput.value)updateDateMode();};
 $('#expense-photos',d).onchange=async event=>{
  const files=[...event.target.files];if(!files.length)return;
  $('#photo-error',d).textContent='';
  if(files.length>MAX_PHOTOS-photos.length){$('#photo-error',d).textContent=`You can keep up to ${MAX_PHOTOS} photos per expense. Choose fewer photos.`;event.target.value='';return;}
  preparing=true;$('.save-button',d).disabled=true;$('.photo-upload span',d).textContent='Preparing photos…';refreshPhotos();
  try {
   // Prepare the whole selection before changing the draft; a failed image never removes existing photos.
   const prepared=[];for(const file of files)prepared.push(await preparePhoto(file));
   if(d.open){photos.push(...prepared);refreshPhotos();}
  } catch(error){if(d.open)$('#photo-error',d).textContent=error.message;}
  finally {preparing=false;if(d.open){event.target.value='';$('.save-button',d).disabled=false;$('.photo-upload span',d).textContent='Add photos';refreshPhotos();}}
 };
 d.querySelectorAll('[data-category]').forEach(b=>b.onclick=()=>{category=b.dataset.category;updateDateMode();d.querySelectorAll('[data-category]').forEach(c=>{c.classList.toggle('selected',c===b);c.setAttribute('aria-pressed',String(c===b));});$('#form-error',d).textContent='';});
 $('#expense-form',d).onsubmit=async event=>{
  event.preventDefault();if(preparing||saving)return;
  let date=dateInput.value;try{if(dateInput.type==='month')date=fixedDate(date);}catch(error){$('#form-error',d).textContent=error.message;return;}
  const values={amount:$('#amount',d).value.trim(),category,remark:$('#remark',d).value.trim(),date};
  const error=validateExpense(values,state.categories);
  if(error){$('#form-error',d).textContent=error;if(!values.amount||Number(values.amount)<=0)$('#amount',d).focus();return;}
  saving=true;$('.save-button',d).disabled=true;
  try {
   const now=new Date().toISOString(),record={id:existing?.id||crypto.randomUUID(),...values,photos,coverPhotoId:coverId,amount:Math.round(Number(values.amount)*100)/100,createdAt:existing?.createdAt||now,updatedAt:now};
   const expenses=existing?state.expenses.map(e=>e.id===existing.id?record:e):[record,...state.expenses];
   const selectedAlbums=new Set([...d.querySelectorAll('[data-expense-album]:checked')].map(input=>input.dataset.expenseAlbum));
   const albums=state.albums.map(album=>{const ids=album.expenseIds.filter(id=>id!==record.id);if(selectedAlbums.has(album.id))ids.push(record.id);return {...album,expenseIds:ids,updatedAt:ids.join('|')===album.expenseIds.join('|')?album.updatedAt:now};});
   if(await commit({...state,expenses,albums},existing?'Expense updated':'Expense saved'))d.close();
  } finally {saving=false;if(d.open)$('.save-button',d).disabled=false;}
 };
 $('#amount',d).focus();if(existing)$('#amount',d).select();
}

function expenseDetails(id) {
 const e=state.expenses.find(e=>e.id===id);if(!e)return;
 const d=dialog(`${modalHeading('Expense details')}<div class="detail-main">${badge(e.category)}<p>${html(e.category)}</p><h3>${currency(e.amount)}</h3></div><dl class="detail-fields"><div><dt>Date</dt><dd>${dateLabel(e.date)}</dd></div>${e.remark?`<div><dt>Remark</dt><dd>${html(e.remark)}</dd></div>`:''}</dl>${e.photos?.length?`<div class="detail-photos" aria-label="Expense photos">${orderedPhotos(e).map((photo,i)=>`<figure class="detail-photo"><button type="button" data-view-photo="${html(photo.id)}" aria-label="Open photo ${i+1}"><img src="${photoUrl(photo)}" alt="${html(photo.caption||'Photo '+(i+1)+' for '+(e.remark||e.category))}">${photo.id===coverPhoto(e)?.id?'<span class="detail-cover-label">Cover</span>':''}</button>${photo.caption?`<figcaption>${html(photo.caption)}</figcaption>`:''}</figure>`).join('')}</div>`:''}<div class="detail-actions"><button class="secondary danger-text" id="delete-expense">${icon('trash')} Delete</button><button class="primary" id="edit-expense">${icon('edit')} Edit expense</button></div>`,'detail-modal');
 d.querySelectorAll('[data-view-photo]').forEach(b=>b.onclick=()=>{const photo=e.photos.find(p=>p.id===b.dataset.viewPhoto);dialog(`${modalHeading(html(photo.caption||'A little memory'),html(e.remark||e.category))}<img class="full-photo" src="${photoUrl(photo)}" alt="${html(e.remark||e.category)}"><p class="photo-caption">${dateLabel(e.date)}</p>`,'photo-modal');});
 if(isFixed(e)){$('.detail-fields dt',d).textContent='For month';$('.detail-fields dd',d).textContent=monthLabel(e.date.slice(0,7));}
 $('#edit-expense',d).onclick=()=>{d.close();expenseForm(e);};
 $('#delete-expense',d).onclick=()=>confirmDialog('Delete this expense?',`${currency(e.amount)} · ${e.category}${e.remark?' · '+e.remark:''}. This cannot be undone.`,'Delete',async()=>{if(await commit({...state,expenses:state.expenses.filter(x=>x.id!==id)},'Expense deleted')){d.close();return true;}return false;});
}
function confirmDialog(title,description,label,confirm) {
 const d=dialog(`${modalHeading(html(title))}<p class="confirmation-description">${html(description)}</p><div class="confirm-actions"><button class="secondary" data-close>Cancel</button><button class="danger" id="confirm-action">${html(label)}</button></div>`,'confirm-modal');$('#confirm-action',d).onclick=async()=>{const button=$('#confirm-action',d);button.disabled=true;try{if(await confirm()!==false)d.close();}finally{button.disabled=false;}};$('[data-close]:not(.icon-button)',d).focus();
}
function downloadFile(blob,name) {
 const url=URL.createObjectURL(blob),anchor=document.createElement('a');
 anchor.href=url;anchor.download=name;anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
async function downloadCompleteBackup() {
 const snapshot=await expenseRepository.load();
 const contents=await serializeBackup(snapshot);
 downloadFile(new Blob([contents],{type:'application/json'}),`pocket-complete-backup-${today()}.json`);
 notify('Your expenses and photos are backed up');
}
function backupDialog() {
 const summary=backupSummary(state);
 const d=dialog(`${modalHeading('Keep every little memory','A complete copy of your diary, photos included.')}<div class="backup-inventory"><span><strong>${summary.expenses}</strong> expenses</span><span><strong>${summary.photos}</strong> photos</span><span><strong>${summary.categories}</strong> categories</span><span><strong>${summary.albums}</strong> albums</span></div><section class="backup-action-card"><span class="backup-card-icon">${icon('download')}</span><div><h3>Download a complete backup</h3><p>Everything you have saved, together in one file.</p></div><button class="primary" id="download-complete-backup">Download backup</button></section><section class="backup-action-card restore-action-card"><span class="backup-card-icon">${icon('upload')}</span><div><h3>Bring your diary back</h3><p>Choose a Pocket complete backup. You can review it before replacing anything.</p></div><label class="secondary backup-file-button" for="restore-backup">${icon('archive')} Choose backup file<input class="sr-only" id="restore-backup" type="file" accept=".json,application/json"></label></section><div id="backup-preview" aria-live="polite"></div><p class="form-error" id="backup-error" role="alert"></p><p class="backup-local-note">${icon('shield')} Your backup stays with you. Nothing is sent to a server.</p>`,'backup-modal');
 let prepared, reading=false;
 const download=$('#download-complete-backup',d);
 const runDownload=async button=>{
  button.disabled=true;$('#backup-error',d).textContent='';
  try {await downloadCompleteBackup();}catch(error){$('#backup-error',d).textContent=error.message||'The backup could not be created. Your data has not changed.';}
  finally {button.disabled=false;}
 };
 download.onclick=()=>runDownload(download);
 $('#restore-backup',d).onchange=async event=>{
  if(reading)return;
  const file=event.target.files[0];if(!file)return;
  prepared=undefined;$('#backup-preview',d).innerHTML='';$('#backup-error',d).textContent='';
  if(file.size>MAX_BACKUP_BYTES){$('#backup-error',d).textContent='Choose a complete backup smaller than 256 MB.';event.target.value='';return;}
  reading=true;event.target.disabled=true;$('#backup-preview',d).textContent='Opening your little memories…';
  try {
   const imported=parseBackup(await file.text());await verifyBackupPhotos(imported);
   if(!d.open)return;
   prepared=imported;const details=backupSummary(imported);
   $('#backup-preview',d).innerHTML=`<section class="backup-preview-card"><span class="section-kicker">READY TO RESTORE</span><h3>${html(file.name)}</h3><div class="restore-counts"><span>${details.expenses} expenses</span><span>${details.photos} photos</span><span>${details.categories} categories</span><span>${details.albums} albums</span></div>${details.firstDate?`<p>${dateLabel(details.firstDate)}<br>to ${dateLabel(details.lastDate)}</p>`:'<p>This backup contains an empty diary.</p>'}<p class="restore-replacement-note">Restoring replaces the expenses, categories, albums and photos in your signed-in account.</p><button class="primary" id="restore-preview-confirm">Restore this backup</button><button class="text-link" id="backup-current-first">Download current backup first</button></section>`;
   $('#backup-current-first',d).onclick=event=>runDownload(event.currentTarget);
   $('#restore-preview-confirm',d).onclick=()=>confirmDialog('Replace your current diary?',`Restore ${details.expenses} expenses, ${details.photos} photos and ${details.albums} albums from this backup. The ${state.expenses.length} expenses currently on this device will be replaced.`,'Replace and restore',async()=>{
    if(!prepared)return false;
    if(await commit({...state,expenses:prepared.expenses,categories:prepared.categories,albums:prepared.albums},'Your little diary is restored')) {d.close();location.hash='home';window.scrollTo(0,0);return true;}
    return false;
   });
  } catch(error) {if(d.open){$('#backup-preview',d).innerHTML='';$('#backup-error',d).textContent=error.message||'This backup could not be opened. Your current data has not changed.';}}
  finally {reading=false;if(d.open){event.target.disabled=false;event.target.value='';}}
 };
}
function preferences() {
 const d=dialog(`${modalHeading('Preferences')}<div class="preference-section"><h3>Your data</h3><button class="secondary preferences-backup" id="preferences-backup">${icon('archive')} Complete backup & restore</button><p class="muted">Saved privately to your signed-in account. Export a copy whenever you like.</p><button class="secondary" id="preferences-export">${icon('download')} Export all expenses</button>${state.expenses.some(e=>e.id.startsWith('sample_'))?'<button class="text-link clear-in-settings" id="preferences-clear">Clear sample expenses</button>':''}</div><div class="preference-section"><h3>Custom categories</h3><p class="muted">Keep your everyday choices simple. Add only what you need.</p><div id="custom-categories">${customCategories()}</div><form id="add-category-form" class="add-category-form"><label class="sr-only" for="category-name">New category name</label><input id="category-name" placeholder="New category name" maxlength="32" required><button class="primary" type="submit">Add</button></form><p id="category-error" class="form-error" role="alert"></p></div>`,'preferences-modal');
 $('#preferences-backup',d).onclick=()=>{d.close();backupDialog();};
 $('#preferences-export',d).onclick=actions.export;
 if($('#preferences-clear',d))$('#preferences-clear',d).onclick=()=>confirmDialog('Clear sample expenses?','Only sample records will be removed. Your own expenses will stay.','Clear samples',async()=>{if(await commit({...state,expenses:state.expenses.filter(e=>!e.id.startsWith('sample_'))},'Sample expenses cleared')){$('#preferences-clear',d)?.remove();return true;}return false;});
 $('#add-category-form',d).onsubmit=async event=>{event.preventDefault();const name=$('#category-name',d).value.trim();if(!name||state.categories.some(c=>c.name.toLowerCase()===name.toLowerCase())){$('#category-error',d).textContent='Enter a unique category name.';return;}if(await commit({...state,categories:[...state.categories,{id:crypto.randomUUID(),name,icon:'tag',custom:true,hidden:false}]},'Category added')){$('#category-name',d).value='';$('#category-error',d).textContent='';refreshCustom(d);}};
 bindCustom(d);
}
function customCategories(){return state.categories.map((c,i)=>`<div class="custom-category"><span>${icon(c.icon)}${html(c.name)}${c.hidden?'<small>Hidden</small>':''}</span><div><button class="icon-button" data-move="${html(c.id)}" data-direction="-1" aria-label="Move ${html(c.name)} up" ${i===0?'disabled':''}>↑</button><button class="icon-button" data-move="${html(c.id)}" data-direction="1" aria-label="Move ${html(c.name)} down" ${i===state.categories.length-1?'disabled':''}>↓</button><button class="icon-button" data-rename="${html(c.id)}" aria-label="Rename ${html(c.name)}">${icon('edit')}</button><button class="text-link" data-hide="${html(c.id)}">${c.hidden?'Show':'Hide'}</button>${c.custom&&!state.expenses.some(e=>e.category===c.name)?`<button class="icon-button danger-text" data-delete-category="${html(c.id)}" aria-label="Delete ${html(c.name)}">${icon('trash')}</button>`:''}</div></div>`).join('');}
function refreshCustom(d){$('#custom-categories',d).innerHTML=customCategories();bindCustom(d);}
function bindCustom(d){
 const section=$('#custom-categories',d).closest('.preference-section');$('h3',section).textContent='Categories';$('p',section).textContent='Rename any category or use the arrows to change its order. Existing expenses stay linked.';
 d.querySelectorAll('[data-move]').forEach(b=>b.onclick=async()=>{const categories=[...state.categories],from=categories.findIndex(c=>c.id===b.dataset.move),to=from+Number(b.dataset.direction);if(from<0||to<0||to>=categories.length)return;[categories[from],categories[to]]=[categories[to],categories[from]];if(await commit({...state,categories},'Category order updated'))refreshCustom(d);});
 d.querySelectorAll('[data-hide]').forEach(b=>b.onclick=async()=>{await commit({...state,categories:state.categories.map(c=>c.id===b.dataset.hide?{...c,hidden:!c.hidden}:c)},'Category updated');refreshCustom(d);});
 d.querySelectorAll('[data-delete-category]').forEach(b=>b.onclick=()=>{const c=state.categories.find(c=>c.id===b.dataset.deleteCategory);confirmDialog('Delete this category?',c.name+' will be removed from your choices.','Delete',async()=>{if(await commit({...state,categories:state.categories.filter(x=>x.id!==c.id)},'Category deleted')){refreshCustom(d);return true;}return false;});});
 d.querySelectorAll('[data-rename]').forEach(b=>b.onclick=()=>{const c=state.categories.find(c=>c.id===b.dataset.rename);const rename=dialog(`${modalHeading('Rename category')}<form id="rename-form"><label class="form-label" for="rename-name">Category name</label><input id="rename-name" value="${html(c.name)}" maxlength="32" required><p class="form-error" id="rename-error" role="alert"></p><button class="primary save-button" type="submit">Save name</button></form>`,'confirm-modal');$('#rename-form',rename).onsubmit=async event=>{event.preventDefault();const name=$('#rename-name',rename).value.trim();if(!name||state.categories.some(x=>x.id!==c.id&&x.name.toLowerCase()===name.toLowerCase())){$('#rename-error',rename).textContent='Enter a unique category name.';return;}if(await commit({...state,categories:state.categories.map(x=>x.id===c.id?{...x,name}:x),expenses:state.expenses.map(e=>e.category===c.name?{...e,category:name,updatedAt:new Date().toISOString()}:e)},'Category renamed')){if(filters.category===c.name){filters.category=name;render();}refreshCustom(d);rename.close();}};});
}
window.addEventListener('hashchange',()=>{const next=location.hash.slice(1);if(['home','history','calendar','memories','insights'].includes(next)){page=next;render();window.scrollTo(0,0);}});
async function refreshFromOtherTab() {
 try {
  const fresh=await expenseRepository.load();
  if(fresh.revision===state.revision)return;
  state=fresh;document.querySelectorAll('dialog').forEach(d=>d.close());render();prunePhotoUrls();notify('Expenses refreshed from another tab');
 } catch {notify('Could not refresh saved expenses');}
}
if(syncChannel)syncChannel.onmessage=refreshFromOtherTab;
window.addEventListener('focus',()=>{if(state)refreshFromOtherTab();});
if(state)render();

import {fixedDate} from './fixed.js';

