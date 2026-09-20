let pendingDelete=null,deleteBusy=false;
$('#bets').addEventListener('click',event=>{
  const button=event.target.closest('[data-delete-id]');
  if(!button||deleteBusy)return;
  const bet=allBets.find(b=>b.id===button.dataset.deleteId);
  if(!bet)return;
  pendingDelete=bet.id;
  $('#deleteSummary').textContent=`${bet.game} — ${money(bet.wager)} wager → ${money(bet.payout)} to pay`;
  $('#deleteLegs').replaceChildren();
  for(const leg of bet.legs||[]){const li=document.createElement('li');li.textContent=typeof leg==='string'?leg:leg.label;$('#deleteLegs').append(li);}
  $('#deleteError').textContent='';
  $('#deleteDialog').showModal();
});
$('#cancelDelete').onclick=()=>{if(!deleteBusy){pendingDelete=null;$('#deleteDialog').close();}};
$('#deleteDialog').addEventListener('cancel',event=>{if(deleteBusy)event.preventDefault();else pendingDelete=null;});
$('#confirmDelete').onclick=async()=>{
  if(!pendingDelete||deleteBusy)return;
  const id=pendingDelete;deleteBusy=true;
  $('#confirmDelete').disabled=true;$('#cancelDelete').disabled=true;
  $('#confirmDelete').textContent='Deleting…';$('#deleteError').textContent='';
  try{
    const response=await fetch('/api/bets/'+encodeURIComponent(id),{method:'DELETE',headers:{'content-type':'application/json'},body:JSON.stringify({confirm:true}),signal:AbortSignal.timeout(15000)});
    if(!response.ok&&response.status!==404){let result={};try{result=await response.json()}catch{}throw Error(result.error||'Could not delete ticket. Please try again.');}
    allBets=allBets.filter(b=>b.id!==id);renderBets();
    pendingDelete=null;$('#deleteDialog').close();
    try{await refresh();$('#stamp').textContent='Ticket deleted.';}catch{$('#stamp').textContent='Ticket deleted. Totals will update when the connection returns.';}
  }catch(error){$('#deleteError').textContent=error.name==='TimeoutError'?'The request timed out. Refresh to check whether the ticket was deleted before retrying.':error.message||'Could not delete ticket. Please try again.';}
  finally{deleteBusy=false;$('#confirmDelete').disabled=false;$('#cancelDelete').disabled=false;$('#confirmDelete').textContent='Yes, delete this ticket';}
};
