const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
function setup(ok=true){
  const nodes={},calls=[];
  const node=()=>({textContent:'',disabled:false,open:false,events:{},addEventListener(name,fn){this.events[name]=fn},replaceChildren(){this.children=[]},append(x){this.children.push(x)},showModal(){this.open=true},close(){this.open=false}});
  const context=vm.createContext({$:id=>nodes[id]||(nodes[id]=node()),document:{createElement:node},allBets:[{id:'one',game:'Game A',wager:15,payout:1044.45,legs:['Leg A','Leg B']},{id:'two',game:'Game B',wager:25,payout:825,legs:['Other leg']}],money:x=>'$'+x,AbortSignal,renderBets(){},async refresh(){},async fetch(url,options){calls.push({url,options});return {ok,status:ok?200:500,json:async()=>({error:'Test server failure'})}}});
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../public/delete-ui.js'),'utf8'),context);
  const open=id=>nodes['#bets'].events.click({target:{closest:()=>({dataset:{deleteId:id}})}});
  return {nodes,calls,context,open};
}
test('opening and cancelling confirmation never sends DELETE',()=>{
  const t=setup();t.open('one');assert.equal(t.nodes['#deleteDialog'].open,true);assert.match(t.nodes['#deleteSummary'].textContent,/1044.45/);assert.equal(t.nodes['#deleteLegs'].children.length,2);assert.equal(t.calls.length,0);
  t.nodes['#cancelDelete'].onclick();assert.equal(t.nodes['#deleteDialog'].open,false);assert.equal(t.calls.length,0);
});
test('confirmation deletes only the selected ticket and refreshes the list',async()=>{
  const t=setup();t.open('two');await t.nodes['#confirmDelete'].onclick();assert.equal(t.calls.length,1);assert.equal(t.calls[0].url,'/api/bets/two');assert.equal(t.calls[0].options.method,'DELETE');assert.equal(t.context.allBets.length,1);assert.equal(t.context.allBets[0].id,'one');assert.equal(t.nodes['#deleteDialog'].open,false);
});
test('failure stays visible in the dialog and retains the ticket',async()=>{
  const t=setup(false);t.open('one');await t.nodes['#confirmDelete'].onclick();assert.equal(t.context.allBets.length,2);assert.equal(t.nodes['#deleteDialog'].open,true);assert.match(t.nodes['#deleteError'].textContent,/Test server failure/);assert.equal(t.nodes['#confirmDelete'].disabled,false);
});
