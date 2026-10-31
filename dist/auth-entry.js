import {client,sessionGuard} from './session.js';
import {isDemo} from './demo.js';
const root=document.querySelector('#app');
function placeAccountBar(bar){(document.querySelector('.workspace')||root).prepend(bar);}
let started=false;
function lock(){sessionGuard.locked=true;sessionGuard.epoch++;window.dispatchEvent(new Event('pocket:lock'));document.querySelectorAll('dialog').forEach(d=>d.close());root.replaceChildren();}
function form(mode='login',message=''){
 root.innerHTML='<main class="account-page"><section class="panel"><p class="eyebrow">YOUR PRIVATE POCKET</p><h1></h1><p class="page-subtitle">Your expenses and photos, saved to your own account.</p><form><label class="form-label" for="account-email">Email</label><input id="account-email" type="email" autocomplete="email" required><label class="form-label" for="account-password">Password</label><input id="account-password" type="password" minlength="12" required><p role="status" class="form-error"></p><button class="primary save-button" type="submit"></button></form><button class="text-link" id="account-toggle"></button><button class="text-link" id="account-reset">Forgot password?</button></section></main>';
 root.querySelector('h1').textContent=mode==='signup'?'A little space, just for you.':mode==='recovery'?'Choose a new password.':'Welcome back.';
 const password=root.querySelector('#account-password');password.autocomplete=mode==='login'?'current-password':'new-password';
 const status=root.querySelector('[role=status]');status.textContent=message;
 root.querySelector('[type=submit]').textContent=mode==='signup'?'Create account':mode==='recovery'?'Save password':'Sign in';
 root.querySelector('#account-toggle').textContent=mode==='login'?'New here? Create an account':'Already registered? Sign in';
 root.querySelector('#account-toggle').onclick=()=>form(mode==='login'?'signup':'login');
 const demo=document.createElement('a');demo.href='/?demo=1';demo.className='primary';demo.textContent='View demo · No sign-up';root.querySelector('section').append(demo);
 root.querySelector('#account-reset').onclick=async()=>{const email=root.querySelector('#account-email');if(!email.reportValidity())return;const r=await client.auth.resetPasswordForEmail(email.value,{redirectTo:location.origin+'/'});status.textContent=r.error?r.error.message:'If that account exists, a reset link has been sent.';};
 root.querySelector('form').onsubmit=async event=>{
  event.preventDefault();const button=root.querySelector('[type=submit]');button.disabled=true;
  try{const email=root.querySelector('#account-email').value.trim();
   const result=mode==='signup'?await client.auth.signUp({email,password:password.value,options:{emailRedirectTo:location.origin+'/'}}):mode==='recovery'?await client.auth.updateUser({password:password.value}):await client.auth.signInWithPassword({email,password:password.value});
   if(result.error)throw result.error;
   password.value='';
   if(mode==='signup'&&!result.data.session)status.textContent='Check your email to verify your account, then sign in.';
   else await enter();
  }catch(error){status.textContent=error.message||'Could not sign in. Please try again.';}finally{button.disabled=false;}
 };
}
async function enter(){
 const {data,error}=await client.auth.getUser();
 if(error||!data.user?.email_confirmed_at||data.user.is_anonymous){lock();form();return;}
 sessionGuard.id=data.user.id;sessionGuard.locked=false;const epoch=++sessionGuard.epoch;
 if(started){location.reload();return;}started=true;
 await import('./app.js');
 if(sessionGuard.locked||sessionGuard.epoch!==epoch){lock();form();return;}
 const bar=document.createElement('div');bar.className='account-bar';
 const label=document.createElement('span');label.textContent=data.user.email;
 const logout=document.createElement('button');logout.className='secondary';logout.textContent='Sign out';
 logout.onclick=async()=>{lock();bar.remove();const r=await client.auth.signOut();form('login',r.error?'Sign-out could not be completed. Please retry.':'Signed out.');};
 bar.append(label,logout);placeAccountBar(bar);
 const permitted=await client.rpc('pocket_can_import');
 if(!permitted.error&&permitted.data===true){const button=document.createElement('button');button.className='secondary';button.textContent='Import old diary from this device';bar.prepend(button);button.onclick=async()=>{
  button.disabled=true;
  try{
   const {expenseRepository,seedState}=await import('./data.js');
   const current=await expenseRepository.load();
   if(current.expenses.length||current.albums.length)throw new Error('Your cloud diary already has records. Use a complete backup to review and restore instead.');
   const databases=await indexedDB.databases();
   if(!databases.some(d=>d.name==='pocket.expenses')&&!localStorage.getItem('pocket.expenses.v1'))throw new Error('No old diary was found in this browser. Open Pocket on the device where you kept it.');
   const {createExpenseRepository}=await import('./storage.js');
   const old=await createExpenseRepository(seedState).load();
   const {serializeBackup}=await import('./backup.js');
   const backup=await serializeBackup(old);const url=URL.createObjectURL(new Blob([backup],{type:'application/json'}));
   const a=document.createElement('a');a.href=url;a.download='pocket-before-account-import.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
   await expenseRepository.save({...old,revision:current.revision});
   const actual=JSON.parse(await serializeBackup(await expenseRepository.load()));const expected=JSON.parse(backup);delete actual.exportedAt;delete expected.exportedAt;
   if(JSON.stringify(actual)!==JSON.stringify(expected))throw new Error('Import needs review. Your original local diary is still intact.');
   location.reload();
  }catch(error){button.textContent=error.message;button.disabled=false;}
 };}
}
client.auth.onAuthStateChange((event,session)=>{
 if(event==='PASSWORD_RECOVERY'){lock();form('recovery');}
 else if(started&&(!session||session.user.id!==sessionGuard.id)){lock();document.querySelector('.account-bar')?.remove();form();}
});
if(isDemo){await import('./app.js');const bar=document.createElement('div');bar.className='account-bar';bar.innerHTML='<span>DEMO · Fictional data · Changes reset when refreshed</span><a class="secondary" href="/">Exit demo / Sign in</a><a class="secondary" href="/?demo=1">Reset demo</a>';document.body.append(bar);}else if(location.hash.includes('type=recovery')){await client.auth.getSession();form('recovery');}else await enter();

