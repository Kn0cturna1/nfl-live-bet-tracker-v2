// Test-only in-memory adapter. Never loaded by npm start or production.
const Module=require('node:module'),original=Module._load;
const rows=[],deletedIds=new Set(),images=new Map();
Module._load=function(name,...rest){
  if(name==='pg')return {Pool:class {async query(sql,v){
    if(sql.startsWith('INSERT INTO bets')){
      if(sql.includes('WHERE NOT EXISTS')&&deletedIds.has(v[0]))return {rows:[],rowCount:0};
      const row={id:v[0],fingerprint:v[1],sportsbook:v[2],game:v[3],placed_at:v[4],wager:v[5],payout:v[6],odds:v[7],promo:v[8],bonus_bet:v[9],status:v[10],legs:JSON.parse(v[11])};rows.push(row);return {rows:[row],rowCount:1};
    }
    if(sql.startsWith('WITH removed AS (DELETE FROM bets')){
      const index=rows.findIndex(r=>r.id===v[0]);if(index<0)return {rows:[],rowCount:0};
      rows.splice(index,1);images.delete(v[0]);deletedIds.add(v[0]);return {rows:[{id:v[0]}],rowCount:1};
    }
    if(sql.startsWith('SELECT 1 FROM bets'))return {rows:[],rowCount:rows.some(r=>r.id===v[0])?1:0};
    if(sql.startsWith('INSERT INTO bet_images')){images.set(v[0],{mime:v[1],image:v[2]});return {rows:[],rowCount:1};}
    if(sql.startsWith('SELECT mime,image'))return {rows:images.has(v[0])?[images.get(v[0])]:[],rowCount:images.has(v[0])?1:0};
    if(sql.startsWith('SELECT * FROM bets'))return {rows,rowCount:rows.length};
    return {rows:[],rowCount:0};
  }}};
  return original.call(this,name,...rest);
};
// Keep ESPN and image extraction offline during the HTTP regression test.
global.fetch=async()=>{throw Error('External requests disabled in test')};
