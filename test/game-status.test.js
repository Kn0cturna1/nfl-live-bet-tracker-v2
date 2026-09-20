const {test}=require('node:test'),assert=require('node:assert/strict');
const {classify}=require('../game-status');
const bet={game:'MIA Dolphins @ SF 49ers',placedAt:'2026-09-19T01:19:00Z',status:'OPEN'};
const event=(state,extras={})=>({id:'test',date:'2026-09-20T20:25:00Z',state,completed:state==='post',teams:[{abbreviation:'MIA',name:'Dolphins'},{abbreviation:'SF',name:'49ers'}],...extras});
test('only confirmed in-progress games are live',()=>{
  assert.equal(classify(bet,[event('in')]).liveNow,true);
  for(const state of ['pre','post','unknown'])assert.equal(classify(bet,[event(state)]).liveNow,false);
  assert.equal(classify(bet,[]).liveNow,false);
});
test('recent placement is not evidence of a live game',()=>{
  assert.equal(classify({...bet,placedAt:'2026-09-20T19:00:00Z'},[event('pre')]).gameState,'pre');
});
test('settled tickets never reappear as live',()=>{
  assert.equal(classify({...bet,status:'LOST'},[event('in')]).liveNow,false);
});
test('old tickets and unrelated matchups cannot match a live rematch',()=>{
  assert.equal(classify({...bet,placedAt:'2025-09-19T00:00:00Z'},[event('in')]).liveNow,false);
  assert.equal(classify({...bet,game:'DET Lions @ BUF Bills'},[event('in')]).liveNow,false);
  assert.equal(classify({...bet,game:'SF 49ers'},[event('in')]).liveNow,false);
});
test('names and abbreviations work; finals remain available as finished',()=>{
  assert.equal(classify({...bet,game:'MIA vs SF Sun 1:25 PM'},[event('post')]).gameState,'post');
  assert.equal(classify({...bet,game:'Dolphins vs 49ers'},[event('in')]).liveNow,true);
});
