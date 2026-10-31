import {client,requireAccount,sessionGuard} from './session.js';
const bucket=()=>client.storage.from('pocket-photos');
const checked=r=>{if(r.error)throw new Error(r.error.code==='40001'?'Expenses changed in another tab. Reload before saving.':r.error.message);return r.data;};
const digest=async blob=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer())),v=>v.toString(16).padStart(2,'0')).join('');
export function createCloudRepository(seedState){return {
 async load(){
  const epoch=sessionGuard.epoch,uid=await requireAccount();
  const row=checked(await client.from('pocket_diaries').select('document,revision').eq('user_id',uid).maybeSingle());
  if(!row){if(epoch!==sessionGuard.epoch)throw new Error('Account changed.');const empty=seedState();return {...empty,expenses:[],albums:[],version:2,revision:0};}
  const state=structuredClone(row.document);state.revision=row.revision;
  for(const e of state.expenses)for(const p of e.photos||[]){
   if(!p.path?.startsWith(uid+'/'))throw new Error('Invalid photo ownership.');
   p.blob=checked(await bucket().download(p.path));
   if(await digest(p.blob)!==p.hash)throw new Error('Photo verification failed.');
  }
  if(uid!==await requireAccount()||epoch!==sessionGuard.epoch)throw new Error('Account changed.');
  return state;
 },
 async save(state){
  const epoch=sessionGuard.epoch,uid=await requireAccount();const document=structuredClone(state);delete document.revision;
  for(const e of document.expenses)for(const p of e.photos||[]){
   if(!(p.blob instanceof Blob))throw new Error('A photo could not be read.');
   p.hash=await digest(p.blob);p.path=uid+'/'+p.id+'/'+p.hash;
   const upload=await bucket().upload(p.path,p.blob,{contentType:p.blob.type,upsert:false});
   if(upload.error&&String(upload.error.statusCode)!=='409')throw new Error(upload.error.message);
   const verified=checked(await bucket().download(p.path));
   if(await digest(verified)!==p.hash)throw new Error('Photo upload verification failed. Your previous diary is unchanged.');
   delete p.blob;
  }
  if(uid!==await requireAccount()||sessionGuard.locked||epoch!==sessionGuard.epoch)throw new Error('Account changed.');
  const row=checked(await client.rpc('pocket_save',{payload:document,expected_revision:state.revision}));
  if(uid!==await requireAccount()||epoch!==sessionGuard.epoch)throw new Error('Account changed.');
  return {...state,revision:row.revision};
 }
};}
