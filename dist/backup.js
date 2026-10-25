import {validateExpense} from './data.js';
import {MAX_PHOTOS} from './photos.js';

export const BACKUP_FORMAT = 'pocket-complete-backup';
export const MAX_BACKUP_BYTES = 256 * 1024 * 1024;
const icons = new Set(['food','transport','shopping','bills','entertainment','health','travel','personal','others','tag']);
const photoTypes = new Set(['image/jpeg','image/png','image/webp']);
const fail = message => {throw new Error(message);};
const validText = (value,max=160) => typeof value==='string' && value.length<=max;
const validId = value => typeof value==='string' && /^[A-Za-z0-9_-]{1,128}$/.test(value);
const validTime = value => typeof value==='string' && Number.isFinite(Date.parse(value));

function encode(bytes) {
 let binary='';
 for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));
 return btoa(binary);
}
function hasImageSignature(bytes,type) {
 if(type==='image/jpeg')return bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
 if(type==='image/png')return [137,80,78,71,13,10,26,10].every((n,i)=>bytes[i]===n);
 return type==='image/webp'&&String.fromCharCode(...bytes.subarray(0,4))==='RIFF'&&String.fromCharCode(...bytes.subarray(8,12))==='WEBP';
}
export function backupSummary(state) {
 const dates=state.expenses.map(e=>e.date).sort();
 return {expenses:state.expenses.length,photos:state.expenses.reduce((sum,e)=>sum+(e.photos?.length||0),0),categories:state.categories.length,firstDate:dates[0]||null,lastDate:dates.at(-1)||null};
}
export async function serializeBackup(state) {
 const expenses=[];
 for(const expense of state.expenses) {
  const photos=[];
  for(const photo of expense.photos||[]) {
   photos.push({id:photo.id,name:photo.name,width:photo.width,height:photo.height,createdAt:photo.createdAt,type:photo.blob.type,data:encode(new Uint8Array(await photo.blob.arrayBuffer()))});
  }
  const {id,amount,category,remark,date,createdAt,updatedAt}=expense;
  expenses.push({id,amount,category,remark,date,createdAt,updatedAt,photos});
 }
 const text=JSON.stringify({format:BACKUP_FORMAT,version:1,exportedAt:new Date().toISOString(),categories:state.categories,expenses});
 if(new Blob([text]).size>MAX_BACKUP_BYTES)fail('This backup is larger than the 256 MB file limit.');
 return text;
}
export function parseBackup(text) {
 let input;
 try {input=JSON.parse(text);}catch{fail('This is not a readable Pocket backup. Choose the complete backup JSON file.');}
 if(!input||input.format!==BACKUP_FORMAT||input.version!==1||!validTime(input.exportedAt))fail('This file is not a supported Pocket complete backup.');
 if(!Array.isArray(input.categories)||!input.categories.length||!Array.isArray(input.expenses))fail('The backup is missing its expenses or categories.');
 const categoryIds=new Set(),names=new Set(),expenseIds=new Set(),photoIds=new Set();
 const categories=input.categories.map(c=>{
  if(!c||!validId(c.id)||!validText(c.name,32)||!c.name.trim()||!icons.has(c.icon)||typeof c.custom!=='boolean'||typeof c.hidden!=='boolean')fail('The backup contains an invalid category.');
  const key=c.name.toLowerCase();
  if(categoryIds.has(c.id)||names.has(key))fail('The backup contains duplicate categories.');
  categoryIds.add(c.id);names.add(key);
  return {id:c.id,name:c.name,icon:c.icon,custom:c.custom,hidden:c.hidden};
 });
 const expenses=input.expenses.map(e=>{
  if(!e||!validId(e.id)||expenseIds.has(e.id)||typeof e.amount!=='number'||!validText(e.remark)||!validTime(e.createdAt)||!validTime(e.updatedAt)||validateExpense({...e,amount:String(e.amount)},categories))fail('The backup contains an invalid or duplicate expense.');
  expenseIds.add(e.id);
  if(!Array.isArray(e.photos)||e.photos.length>MAX_PHOTOS)fail('An expense in this backup has an invalid photo list.');
  const photos=e.photos.map(p=>{
   if(!p||!validId(p.id)||photoIds.has(p.id)||!validText(p.name,512)||!validTime(p.createdAt)||!photoTypes.has(p.type)||!Number.isInteger(p.width)||!Number.isInteger(p.height)||p.width<1||p.height<1||p.width>1600||p.height>1600||typeof p.data!=='string'||p.data.length>32*1024*1024||(p.data.length%4!==0||!/^[A-Za-z0-9+/]*={0,2}$/.test(p.data)))fail('The backup contains an invalid photo attachment.');
   photoIds.add(p.id);
   let bytes;
   try{bytes=Uint8Array.from(atob(p.data),c=>c.charCodeAt(0));}catch{fail('A photo in the backup could not be read.');}
   if(!hasImageSignature(bytes,p.type))fail('A photo in the backup is damaged or has an unsupported format.');
   return {id:p.id,name:p.name,width:p.width,height:p.height,createdAt:p.createdAt,blob:new Blob([bytes],{type:p.type})};
  });
  return {id:e.id,amount:e.amount,category:e.category,remark:e.remark,date:e.date,createdAt:e.createdAt,updatedAt:e.updatedAt,photos};
 });
 return {version:2,expenses,categories,exportedAt:input.exportedAt};
}
export async function verifyBackupPhotos(state) {
 for(const expense of state.expenses)for(const photo of expense.photos) {
  let bitmap;
  try {
   bitmap=await createImageBitmap(photo.blob);
   if(bitmap.width!==photo.width||bitmap.height!==photo.height)fail('A photo in the backup has incorrect dimensions.');
  } catch {fail('A photo in this backup could not be opened. Your current data has not changed.');}
  finally {bitmap?.close();}
 }
}
