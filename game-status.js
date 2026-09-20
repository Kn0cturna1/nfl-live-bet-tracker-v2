'use strict';
const clean=s=>String(s||'').toUpperCase().replace(/[^A-Z0-9]+/g,' ').trim();
function contains(text,name){const n=clean(name);return n.length>=2&&(` ${clean(text)} `).includes(` ${n} `);}
function matchEvents(bet,events){
  const placed=Date.parse(bet.placedAt);
  if(!Number.isFinite(placed))return [];
  // A newly entered ticket is matched only to nearby games, never a later rematch.
  return events.filter(event=>{
    const time=Date.parse(event.date),teams=event.teams||[];
    return time>=placed-12*3600000 && time<=placed+7*86400000 && teams.length===2 &&
      teams.every(t=>[t.abbreviation,t.displayName,t.name,t.shortDisplayName].some(n=>contains(bet.game,n)));
  });
}
function classify(bet,events){
  const games=matchEvents(bet,events);
  const settled=['WON','LOST','SETTLED','VOID','CASHED_OUT'].includes(String(bet.status).toUpperCase());
  const gameState=settled?'post':games.some(g=>g.state==='in')?'in':games.length&&games.every(g=>g.completed)?'post':games.length&&games.every(g=>g.state==='pre')?'pre':'unknown';
  return {gameState,liveNow:!settled&&gameState==='in',games:games.map(({id,date,state,completed,detail})=>({id,date,state,completed,detail}))};
}
let cache={at:0,events:[]};
async function scoreboard(){
  if(Date.now()-cache.at<15000)return cache.events;
  const response=await fetch('https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard',{headers:{'user-agent':'nfl-live-bet-tracker-v2/1.0'},signal:AbortSignal.timeout(5000)});
  if(!response.ok)throw Error('Scoreboard unavailable');
  const data=await response.json();
  if(!Array.isArray(data.events))throw Error('Invalid scoreboard');
  const events=data.events.map(e=>{const c=e.competitions?.[0],s=c?.status?.type||e.status?.type||{};return {id:e.id,date:e.date,teams:(c?.competitors||[]).map(x=>x.team),state:s.state,completed:s.completed===true,detail:s.detail||s.description||''};});
  cache={at:Date.now(),events};return events;
}
module.exports={matchEvents,classify,scoreboard};
