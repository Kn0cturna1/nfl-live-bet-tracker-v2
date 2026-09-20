// Test-only in-memory adapter. Never loaded by npm start or production.
const Module=require('node:module'),original=Module._load;
const rows=[];
Module._load=function(name,...rest){
  if(name==='pg')return {Pool:class {async query(sql,v){
    if(sql.startsWith('INSERT INTO bets')){
      const row={id:v[0],fingerprint:v[1],sportsbook:v[2],game:v[3],placed_at:v[4],wager:v[5],payout:v[6],odds:v[7],promo:v[8],bonus_bet:v[9],status:v[10],legs:JSON.parse(v[11])};rows.push(row);return {rows:[row],rowCount:1};
    }
    if(sql.startsWith('SELECT * FROM bets'))return {rows,rowCount:rows.length};
    return {rows:[],rowCount:0};
  }}};
  return original.call(this,name,...rest);
};
// Keep ESPN and image extraction offline during the HTTP regression test.
global.fetch=async()=>{throw Error('External requests disabled in test')};
