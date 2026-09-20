const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const path=require('node:path');
test('HTTP intake failure cannot mutate existing bets; manual saving remains available',async()=>{
  const child=spawn(process.execPath,['--require','./test/fake-db.cjs','server.js'],{cwd:path.join(__dirname,'..'),env:{...process.env,PORT:'3137',DATABASE_URL:'test',OPENAI_API_KEY:''},stdio:['ignore','pipe','pipe']});
  try{
    await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Server start timeout')),5000);child.stdout.on('data',()=>{clearTimeout(timer);resolve()});child.on('error',reject);child.on('exit',code=>{if(code)reject(Error('Server failed'))})});
    const root='http://127.0.0.1:3137';
    const before=await (await fetch(root+'/api/bets')).json();assert.equal(before.bets.length,4);
    const post=async(body)=>fetch(root+'/api/intake',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
    assert.equal((await post({mime:'image/png',data:'invalid'})).status,400);
    assert.equal((await post({mime:'image/png',data:'iVBORw0KGgo='})).status,503);
    const after=await (await fetch(root+'/api/bets')).json();assert.deepEqual(after.bets,before.bets);
    const bad=await fetch(root+'/api/bets',{method:'POST',body:JSON.stringify({wager:null,payout:100,legs:['test']})});assert.equal(bad.status,400);
    const good=await fetch(root+'/api/bets',{method:'POST',body:JSON.stringify({sportsbook:'Test',game:'Test game',wager:5,payout:10,legs:['Test leg']})});assert.equal(good.status,201);
    assert.equal((await fetch(root+'/health')).status,200);
    assert.match(await (await fetch(root+'/')).text(),/intake-ui.js/);
  }finally{child.kill();}
});
