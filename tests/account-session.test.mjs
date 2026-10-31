import test from 'node:test';
import assert from 'node:assert/strict';
import {client,sessionGuard,requireAccount} from '../dist/session.js';
import {createCloudRepository} from '../dist/cloud.js';
const user={id:'test-account',email_confirmed_at:'2026-10-31T00:00:00Z',is_anonymous:false};
test('logout invalidates a pending identity verification, including a same-user relogin',async()=>{
 const previous=client.auth.getUser;
 try {
  for(const relogin of [false,true]){
   sessionGuard.id=user.id;sessionGuard.locked=false;sessionGuard.epoch++;
   let resolve;client.auth.getUser=()=>new Promise(r=>{resolve=r;});
   const pending=requireAccount();
   sessionGuard.locked=!relogin;sessionGuard.epoch++;
   resolve({data:{user},error:null});
   await assert.rejects(pending,/sign in again/);
  }
 }finally{client.auth.getUser=previous;sessionGuard.locked=true;}
});
test('a stale empty-diary response cannot hydrate a new session',async()=>{
 const previousUser=client.auth.getUser,previousFrom=client.from;
 try {
  sessionGuard.id=user.id;sessionGuard.locked=false;sessionGuard.epoch++;
  client.auth.getUser=async()=>({data:{user},error:null});
  let resolve,started;const queried=new Promise(r=>{started=r;});
  client.from=()=>({select:()=>({eq:()=>({maybeSingle:()=>{started();return new Promise(r=>{resolve=r;});}})})});
  const repo=createCloudRepository(()=>({categories:[],expenses:[{id:'sample'}]}));
  const pending=repo.load();await queried;sessionGuard.epoch++;
  resolve({data:null,error:null});await assert.rejects(pending,/Account changed/);
 }finally{client.auth.getUser=previousUser;client.from=previousFrom;sessionGuard.locked=true;}
});
