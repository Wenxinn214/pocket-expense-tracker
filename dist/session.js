import {createClient} from './vendor/supabase.js';
export const client=createClient('https://somwoklownoqbovsyefk.supabase.co','sb_publishable_Uct5xAU4EUpabvwDLTJtZA_5wxepEmQ');
export const sessionGuard={id:null,locked:true};
export async function requireAccount(){
 if(sessionGuard.locked)throw new Error('Please sign in again.');
 const {data,error}=await client.auth.getUser();
 if(error||!data.user?.email_confirmed_at||data.user.is_anonymous||data.user.id!==sessionGuard.id)throw new Error('Please sign in again.');
 return data.user.id;
}
