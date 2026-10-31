import test from 'node:test';
import assert from 'node:assert/strict';
import {validateCardDrafts} from '../dist/card-drafts.js';
import {serializeBackup,parseBackup} from '../dist/backup.js';
import {seedState} from '../dist/data.js';
test('monthly drafts retain title, notes, privacy and photo order in backups',async()=>{const s=seedState();s.cardDrafts={'2026-10':{title:'October joys',note:'A small trip',hideAmounts:true,photoIds:['photo_b','photo_a']}};assert.deepEqual(parseBackup(await serializeBackup(s)).cardDrafts,s.cardDrafts);assert.deepEqual(validateCardDrafts(),{});});
test('invalid months, duplicate photos and oversized notes are rejected',()=>{const d={title:'Title',note:'',hideAmounts:false,photoIds:[]};assert.throws(()=>validateCardDrafts({'2026-13':d}));assert.throws(()=>validateCardDrafts({'2026-10':{...d,photoIds:['a','a']}}));assert.throws(()=>validateCardDrafts({'2026-10':{...d,note:'x'.repeat(161)}}));});

