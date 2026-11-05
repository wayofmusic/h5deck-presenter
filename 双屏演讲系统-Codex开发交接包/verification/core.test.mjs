import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { initialState, transition, validateDeck, elapsed } from '../core/state.mjs';
const manifest = JSON.parse(fs.readFileSync(new URL('../decks/reuse-demo/deck.json',import.meta.url)));
const script = JSON.parse(fs.readFileSync(new URL('../decks/reuse-demo/script.json',import.meta.url)));
test('step navigation and direct navigation have different semantics, including backwards at boundaries', () => {
  let s = initialState(manifest,'session','epoch');
  const run = action => s = transition(s,{action},manifest,1000);
  run('NEXT_STEP'); assert.equal(s.slideId,'demo-steps'); assert.equal(s.revealStep,1);
  run('NEXT_STEP'); assert.equal(s.revealStep,2);
  run('NEXT_STEP'); assert.equal(s.revealStep,3);
  run('NEXT_STEP'); assert.equal(s.slideId,'demo-end');
  run('PREV_STEP'); assert.equal(s.slideId,'demo-steps'); assert.equal(s.revealStep,3);
  run('PREV_STEP'); assert.equal(s.revealStep,2);
  run('PREV_SLIDE'); assert.equal(s.slideId,'demo-start');
  run('PREV_STEP'); assert.equal(s.slideId,'demo-start');
  run('NEXT_SLIDE'); run('NEXT_SLIDE'); assert.equal(s.slideId,'demo-end');
});
test('timer is based on a shared absolute clock and pause is idempotent', () => {
  let s = initialState(manifest,'s','e');
  s = transition(s,{action:'TIMER_START'},manifest,1000);
  assert.equal(elapsed(s.presentationTimer,31000),30000);
  s = transition(s,{action:'TIMER_START'},manifest,2000);
  assert.equal(s.presentationTimer.startedAt,1000);
  s = transition(s,{action:'TIMER_PAUSE'},manifest,41000);
  assert.equal(elapsed(s.presentationTimer,51000),40000);
  s = transition(s,{action:'TIMER_PAUSE'},manifest,61000);
  assert.equal(elapsed(s.presentationTimer,61000),40000);
});
test('invalid content and illegal widget actions are rejected', () => {
  assert.equal(validateDeck(manifest,script),true);
  const bad = structuredClone(manifest); bad.slides[1].id = bad.slides[0].id;
  assert.throws(() => validateDeck(bad,script),/重复/);
  assert.throws(() => validateDeck(manifest,{}),/讲稿/);
  assert.throws(() => transition(initialState(manifest,'s','e'),{action:'WIDGET_ACTION',key:'selectedScene',value:10},manifest),/无效/);
});
test('snapshot restore preserves page, steps, running timer and valid component state', () => {
  const configured={...manifest,widgets:{trainingMode:{type:'integer',initial:0,min:0,max:1}}};
  let before = initialState(configured,'old','old'); before.slideId = 'demo-steps'; before.revealStep = 3;
  before.presentationTimer = {elapsedMs:2000,startedAt:1000}; before.publicWidgetState.trainingMode = 1;
  const after = transition(initialState(configured,'new','new'),{action:'RESTORE_DISPLAY',snapshot:before},configured,5000);
  assert.equal(after.sessionId,'new'); assert.equal(after.slideId,'demo-steps'); assert.equal(after.revealStep,3);
  assert.equal(elapsed(after.presentationTimer,5000),6000); assert.equal(after.publicWidgetState.trainingMode,1);
});
