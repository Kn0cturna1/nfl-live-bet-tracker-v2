const $=s=>document.querySelector(s),money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n||0);
function esc(x){return String(x||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function legObj(x,i){return typeof x==='string'?{label:x,status:'LIVE',progress:0,current:null,target:null,index:i}: {...x,label:x.label||x.name||`Leg ${i+1}`,status:String(x.status||'LIVE').toUpperCase(),progress:Number.isFinite(Number(x.progress))?Math.max(0,Math.min(100,Number(x.progress))):0,index:i}}
function statusClass(s){return ['HIT','LIVE','AT RISK','LOST'].includes(s)?s.toLowerCase().replace(' ','-'):'live'}
function ticketView(b){const legs=(b.legs||[]).map(legObj),hit=legs.filter(l=>l.status==='HIT').length,lost=legs.some(l=>l.status==='LOST'),risk=legs.some(l=>l.status==='AT RISK'),pct=legs.length?Math.round(legs.reduce((s,l)=>s+(l.status==='HIT'?100:l.status==='LOST'?0:l.progress),0)/legs.length):0,tstatus=lost?'LOST':hit===legs.length&&legs.length?'HIT':risk?'AT RISK':'LIVE';return `<article class="ticket"><div class="tickethead"><div><h2>${esc(b.game)}</h2><span class="muted">${esc(b.sportsbook||'')} · ${esc(b.odds||'')}</span></div><b class="pill ${statusClass(tstatus)}">${tstatus}</b></div><div class="ticketmoney"><span><b>${money(b.wager)}</b> wager</span><span><b>${money(b.payout)}</b> to pay</span>${b.bonusBet?'<span class="bonus">BONUS BET</span>':''}</div>${b.promo?`<p class="muted promo">${esc(b.promo)}</p>`:''}<div class="overall"><div><b>${hit}/${legs.length} legs hit</b><strong>${pct}%</strong></div><div class="bar"><i style="width:${pct}%"></i></div></div><div class="leglist">${legs.map((l,i)=>`<div class="leg"><div class="legnum">${i+1}</div><div class="legbody"><div class="legtop"><b>${esc(l.label)}</b><span class="legstatus ${statusClass(l.status)}">${esc(l.status)}</span></div>${l.current!=null||l.target!=null?`<div class="numbers"><span>Current <b>${esc(l.current??'—')}</b></span><span>Target <b>${esc(l.target??'—')}</b></span><strong>${l.status==='HIT'?100:l.progress}%</strong></div>`:`<div class="numbers"><span>Progress</span><strong>${l.status==='HIT'?100:l.progress}%</strong></div>`}<div class="bar small"><i style="width:${l.status==='HIT'?100:l.progress}%"></i></div></div></div>`).join('')}</div></article>`}
let allBets=[],betFilter='LIVE';function isSettled(b){return ['WON','LOST','SETTLED'].includes(String(b.status||'').toUpperCase())}function renderBets(){const shown=betFilter==='ALL'?allBets:betFilter==='SETTLED'?allBets.filter(isSettled):allBets.filter(b=>!isSettled(b));$('#bets').innerHTML=shown.map(ticketView).join('')||`<p>No ${betFilter.toLowerCase()} bets.</p>`;document.querySelectorAll('.betFilters button').forEach(x=>x.classList.toggle('active',x.dataset.filter===betFilter))}async function refresh(){const r=await fetch('/api/bets',{cache:'no-store'});if(!r.ok)throw Error('load');const d=await r.json(),open=d.bets.filter(b=>!isSettled(b));allBets=d.bets;$('#risk').textContent=money(open.filter(b=>!b.bonusBet).reduce((s,b)=>s+Number(b.wager),0));$('#return').textContent=money(open.reduce((s,b)=>s+Number(b.payout),0));$('#count').textContent=open.length;$('#stamp').textContent='Updated '+new Date().toLocaleTimeString();renderBets()}
document.querySelectorAll('.betFilters button').forEach(b=>b.onclick=()=>{betFilter=b.dataset.filter;renderBets()});
let selectedShot=null;
$('#openAdd').onclick=()=>$('#dlg').showModal();$('#close').onclick=()=>$('#dlg').close();
function fileData(file){return new Promise((ok,no)=>{const r=new FileReader();r.onload=()=>{const s=String(r.result),i=s.indexOf(',');ok({mime:file.type||'image/jpeg',data:s.slice(i+1)})};r.onerror=no;r.readAsDataURL(file)})}

let saving=false, savedPendingImage=null;
$('#form').onsubmit=async e=>{
  e.preventDefault();if(saving)return;saving=true;$('#saveBet').disabled=true;
  const shot=selectedShot;
  const f=new FormData(e.target),b={sportsbook:f.get('sportsbook'),game:f.get('game'),wager:Number(f.get('wager')),payout:Number(f.get('payout')),odds:f.get('odds'),promo:f.get('promo'),bonusBet:f.get('bonusBet')==='on',placedAt:new Date().toISOString(),legs:String(f.get('legs')).split('\n').map(x=>x.trim()).filter(Boolean)};
  for(const control of e.target.querySelectorAll('input,textarea'))control.disabled=true;
  try{
    if(!savedPendingImage){
      $('#msg').textContent='Checking duplicate and saving…';
      const r=await fetch('/api/bets',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(b)}),j=await r.json();
      if(!r.ok)throw Error(j.error||'Could not save');
      savedPendingImage={id:j.id,shot};
    }
    if(savedPendingImage.shot){
      $('#msg').textContent='Bet saved. Uploading picture…';
      const image=await fileData(savedPendingImage.shot),ir=await fetch('/api/bets/'+encodeURIComponent(savedPendingImage.id)+'/image',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(image)});
      if(!ir.ok)throw Error('Bet saved, but picture upload failed. Press Save again to retry the picture only.');
    }
    savedPendingImage=null;e.target.reset();selectedShot=null;$('#previewWrap').hidden=true;
    $('#msg').textContent='Saved.';await refresh();$('#dlg').close();
  }catch(error){$('#msg').textContent=error.message||'Could not save. Check your connection.';}
  finally{saving=false;$('#saveBet').disabled=false;for(const control of e.target.querySelectorAll('input,textarea'))control.disabled=!!savedPendingImage;}
};
refresh().catch(()=>$('#stamp').textContent='Could not load tickets');
setInterval(()=>refresh().catch(()=>$('#stamp').textContent='Could not refresh tickets'),30000);
