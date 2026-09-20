// Intake only prepares a draft. The existing explicit submit is the only save action.
let intakeVersion=0, intakeController=null, intakeBusy=false, shotUrl=null;
const fields=['sportsbook','game','wager','payout','odds','promo','legs'];
function reviewReset(){
  $('#reviewed').checked=false;
  $('#intakeReview').hidden=!selectedShot;
  for(const name of fields) $('#form').elements[name].classList.remove('uncertain');
  $('#uncertainList').replaceChildren();
}
async function readShot(file){
  const version=++intakeVersion;
  intakeController?.abort();
  selectedShot=file||null;
  if(shotUrl)URL.revokeObjectURL(shotUrl);
  shotUrl=null;
  reviewReset();
  $('#msg').textContent='';
  $('#saveBet').disabled=false;
  for(const name of fields)$('#form').elements[name].readOnly=false;
  intakeBusy=false;
  if(!file){$('#previewWrap').hidden=true;return;}
  // Clear prior draft immediately so another picture cannot inherit old amounts or legs.
  for(const name of fields) $('#form').elements[name].value='';
  $('#bonusBet').checked=false;
  $('#previewWrap').hidden=false;
  shotUrl=URL.createObjectURL(file);$('#shotPreview').src=shotUrl;
  if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>8*1024*1024){
    $('#photoMsg').textContent='Choose a JPEG, PNG or WebP image under 8 MB.';
    $('#saveBet').disabled=true;return;
  }
  intakeBusy=true;$('#saveBet').disabled=true;
  for(const name of fields)$('#form').elements[name].readOnly=true;
  $('#photoMsg').textContent='Reading picture… Nothing has been saved.';
  intakeController=new AbortController();
  const controller=intakeController;
  const timeout=setTimeout(()=>controller.abort(),55000);
  try{
    const picture=await fileData(file);
    if(version!==intakeVersion)return;
    const response=await fetch('/api/intake',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(picture),signal:controller.signal});
    const result=await response.json();
    if(version!==intakeVersion)return;
    if(!response.ok)throw Error(result.error||'Could not read the picture.');
    for(const name of fields){
      const value=result.draft[name];
      $('#form').elements[name].value=name==='legs' ? value.map((x,i)=>x||`[REVIEW LEG ${i+1}]`).join('\n') : value??'';
    }
    $('#bonusBet').checked=result.draft.bonusBet===true;
    const issues=result.uncertainFields||[];
    for(const key of issues){const name=key.startsWith('legs')?'legs':key;$('#form').elements[name]?.classList.add('uncertain');}
    for(const message of [...(result.warnings||[]),...issues.map(key=>`Check ${key.replace(/legs\.(\d+)\./,(_,i)=>`leg ${Number(i)+1} `)}: unreadable, missing, or uncertain.`)]){
      const li=document.createElement('li');li.textContent=message;$('#uncertainList').append(li);
    }
    $('#photoMsg').textContent='Draft ready. Compare every field and leg with the picture, fill missing values, then confirm below. Reading confidence is an estimate.';
  }catch(error){
    if(version!==intakeVersion)return;
    $('#photoMsg').textContent=(error.name==='AbortError'?'Picture reading timed out.':error.message)+' Enter and review the ticket manually, or choose another picture. Nothing has been saved.';
  }finally{
    clearTimeout(timeout);
    if(version===intakeVersion){intakeBusy=false;$('#saveBet').disabled=false;for(const name of fields)$('#form').elements[name].readOnly=false;}
  }
}
$('#cameraShot').onchange=e=>readShot(e.target.files[0]);
$('#galleryShot').onchange=e=>readShot(e.target.files[0]);
$('#form').addEventListener('input',e=>{if(e.target.id!=='reviewed')$('#reviewed').checked=false;});
$('#form').addEventListener('submit',e=>{
  if(intakeBusy || selectedShot&&(!$('#reviewed').checked || /\[REVIEW LEG \d+\]/.test($('#form').elements.legs.value))){
    e.preventDefault();e.stopImmediatePropagation();
    $('#msg').textContent='Complete missing legs and confirm that you reviewed all fields before saving.';
  }
},true);
$('#form').addEventListener('reset',()=>{
  ++intakeVersion;intakeController?.abort();selectedShot=null;intakeBusy=false;
  if(shotUrl)URL.revokeObjectURL(shotUrl);shotUrl=null;
  reviewReset();$('#saveBet').disabled=false;
  $('#photoMsg').textContent='Choose a screenshot to prepare a draft for review.';
});
