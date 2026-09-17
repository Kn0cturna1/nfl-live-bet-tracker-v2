const http=require('http');
const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const PORT=Number(process.env.PORT||3000);
const DATA=process.env.DATA_FILE||path.join(process.cwd(),'data','bets.json');
const seed={bets:[
{id:'dk-639252269024186022',sportsbook:'DraftKings',game:'DET Lions @ BUF Bills',placedAt:'2026-09-17T00:28:23-07:00',wager:35,payout:525,odds:'+1400',promo:'Bet & Get',status:'OPEN',legs:['Josh Allen 2+ Passing Touchdowns','Jahmyr Gibbs 70+ Rushing Yards','Jahmyr Gibbs Anytime TD Scorer','Jared Goff 2+ Passing Touchdowns','Josh Allen Anytime TD Scorer','James Cook 78+ Rushing Yards']},
{id:'dk-639252229396516919',sportsbook:'DraftKings',game:'DET Lions @ BUF Bills',placedAt:'2026-09-16T23:22:20-07:00',wager:15,payout:195,odds:'+1200',promo:'+50% Parlay Boost',status:'OPEN',legs:['BUF Bills -4.5','Josh Allen Anytime TD Scorer','Jahmyr Gibbs 90+ Rushing + Receiving Yards','Josh Allen 220+ Passing Yards','Josh Allen 30+ Rushing Yards']},
{id:'dk-639252220974350103',sportsbook:'DraftKings',game:'DET Lions @ BUF Bills',placedAt:'2026-09-16T23:08:17-07:00',wager:10,payout:110,odds:'+1100',promo:'$10 Bonus Bet',bonusBet:true,status:'OPEN',legs:['BUF Bills Moneyline','D.J. Moore 5+ Receptions','Jahmyr Gibbs 70+ Rushing Yards','Josh Allen 250+ Passing Yards','James Cook Anytime TD Scorer','Jahmyr Gibbs Anytime TD Scorer']}
]};
function ensure(){try{fs.mkdirSync(path.dirname(DATA),{recursive:true});if(!fs.existsSync(DATA))fs.writeFileSync(DATA,JSON.stringify(seed,null,2));}catch(e){console.error('data-init',e.message)}}
function load(){ensure();try{return JSON.parse(fs.readFileSync(DATA,'utf8'))}catch{return seed}}
function save(x){fs.mkdirSync(path.dirname(DATA),{recursive:true});fs.writeFileSync(DATA,JSON.stringify(x,null,2));}
function json(res,code,obj){res.writeHead(code,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify(obj))}
function body(req){return new Promise((ok,no)=>{let s='';req.on('data',c=>{s+=c;if(s.length>1e6)req.destroy()});req.on('end',()=>{try{ok(JSON.parse(s||'{}'))}catch(e){no(e)}});req.on('error',no)})}
function norm(s){return String(s||'').trim().replace(/\s+/g,' ')}
function fp(b){return crypto.createHash('sha256').update([b.sportsbook,b.game,b.placedAt,b.wager,b.payout,(b.legs||[]).join('|')].map(norm).join('~').toLowerCase()).digest('hex').slice(0,24)}
function valid(b){return b&&Number(b.wager)>=0&&Number(b.payout)>0&&Array.isArray(b.legs)&&b.legs.length>0}
const server=http.createServer(async(req,res)=>{const u=new URL(req.url,'http://x');if(u.pathname==='/health')return json(res,200,{ok:true});if(u.pathname==='/api/bets'&&req.method==='GET')return json(res,200,load());if(u.pathname==='/api/bets'&&req.method==='POST'){try{const b=await body(req);if(!valid(b))return json(res,400,{error:'Review required: wager, payout and at least one leg are required.'});const d=load();const fingerprint=fp(b);if(d.bets.some(x=>x.fingerprint===fingerprint||b.id&&x.id===b.id))return json(res,409,{error:'Duplicate ticket',duplicate:true});const row={...b,id:b.id||'bet-'+Date.now(),fingerprint,status:b.status||'OPEN'};d.bets.unshift(row);save(d);return json(res,201,row)}catch{return json(res,400,{error:'Invalid request'})}}if(u.pathname==='/api/intake'&&req.method==='POST')return json(res,501,{error:'Screenshot OCR/vision is not enabled yet. Use the review form; no ticket was saved.'});if(req.method==='GET'){const f=u.pathname==='/'?'index.html':u.pathname.slice(1);const p=path.join(process.cwd(),'public',f);if(p.startsWith(path.join(process.cwd(),'public'))&&fs.existsSync(p)){const ext=path.extname(p);res.writeHead(200,{'content-type':ext==='.css'?'text/css; charset=utf-8':ext==='.js'?'text/javascript; charset=utf-8':'text/html; charset=utf-8'});return fs.createReadStream(p).pipe(res)}}res.writeHead(404);res.end('Not found')});
server.listen(PORT,'0.0.0.0',()=>{ensure();console.log('bet-tracker-v2 listening',PORT)});