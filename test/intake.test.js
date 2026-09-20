const {test}=require('node:test');
const assert=require('node:assert/strict');
const {normalize,validateImage,analyze}=require('../intake');
const field=value=>({value,confidence:.99,evidence:String(value)});
const ticket=()=>({isTicket:true,completeTicket:true,visibleLegCount:2,sportsbook:field('DraftKings'),game:field('MIA @ SF'),wager:field(25),payout:field(825),odds:field('+3200'),promo:field('100% boost'),bonusBet:field(false),legs:[{label:field('Christian McCaffrey 60+ Rushing Yards'),game:field('MIA @ SF'),odds:field('-120')},{label:field('SF 49ers -9.5'),game:field('MIA @ SF'),odds:field('-110')}],warnings:[]});
const image={mime:'image/png',data:'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII='};
test('preserves numbers, every leg, and explicit review contract',()=>{
  const result=normalize(ticket());
  assert.equal(result.draft.wager,25);assert.equal(result.draft.payout,825);
  assert.deepEqual(result.draft.legs,['Christian McCaffrey 60+ Rushing Yards','SF 49ers -9.5']);
  assert.equal(result.saved,false);assert.equal(result.reviewRequired,true);assert.deepEqual(result.uncertainFields,[]);
});
test('uncertain amounts and leg thresholds never enter the draft',()=>{
  const raw=ticket();raw.wager.confidence=.89;raw.legs[0].label.confidence=.5;
  const result=normalize(raw);assert.equal(result.draft.wager,null);assert.equal(result.draft.legs[0],null);
  assert.ok(result.uncertainFields.includes('legs.0.label'));assert.equal(result.draft.legs.length,2);
});
test('cropped ticket and missing leg count require review',()=>{
  const raw=ticket();raw.completeTicket=false;raw.visibleLegCount=6;raw.payout=field(null);
  const result=normalize(raw);assert.equal(result.draft.payout,null);assert.ok(result.uncertainFields.includes('legs'));
});
test('unsupported or forged pictures fail before a paid request',async()=>{
  for(const bad of [{mime:'image/svg+xml',data:image.data},{mime:'image/jpeg',data:image.data},{mime:'image/png',data:'bad!'},{mime:'image/png',data:'A'.repeat(12*1024*1024)}])assert.throws(()=>validateImage(bad));
  await assert.rejects(analyze(image,{apiKey:''}),e=>e.status===503);
});
test('missing evidence, out of range numbers, and non-tickets fail closed',()=>{
  const raw=ticket();raw.wager=field(-10);raw.odds.evidence='';
  assert.equal(normalize(raw).draft.wager,null);assert.equal(normalize(raw).draft.odds,null);
  assert.throws(()=>normalize({isTicket:false}),e=>e.status===422);
});
test('uses strict image schema, server authorization, no storage or tools',async()=>{
  const result=await analyze(image,{apiKey:'test-secret',fetchImpl:async(url,opts)=>{
    const body=JSON.parse(opts.body);assert.equal(url,'https://api.openai.com/v1/responses');assert.equal(body.store,false);
    assert.equal(opts.headers.Authorization,'Bearer test-secret');assert.equal(body.text.format.strict,true);
    assert.equal(body.input[0].content[1].detail,'high');assert.equal(body.tools,undefined);
    return {ok:true,json:async()=>({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(ticket())}]}]})};
  }});assert.equal(result.draft.wager,25);
});
test('provider failures, refusals, truncation and malformed output return no draft or secrets',async()=>{
  const responses=[{ok:false,status:401},{ok:false,status:429},{ok:true,json:async()=>({status:'incomplete'})},{ok:true,json:async()=>({status:'completed',output:[{content:[{type:'refusal',refusal:'no'}]}]})},{ok:true,json:async()=>({status:'completed',output:[{content:[{type:'output_text',text:'not json'}]}]})}];
  for(const response of responses) await assert.rejects(analyze(image,{apiKey:'SECRET',fetchImpl:async()=>response}),e=>!e.message.includes('SECRET')&&e.status>=400);
  await assert.rejects(analyze(image,{apiKey:'SECRET',fetchImpl:async()=>{throw Error('SECRET')}}),e=>e.status===504&&!e.message.includes('SECRET'));
});
test('number-only selections cannot become saved leg labels',()=>{
  const raw=ticket();raw.legs[0].label=field('60+');
  const result=normalize(raw);assert.equal(result.draft.legs[0],null);assert.ok(result.uncertainFields.includes('legs.0.label'));
});
test('cropped tickets cannot promote subgroup odds to ticket odds',()=>{
  const raw=ticket();raw.completeTicket=false;raw.odds=field('+355');raw.visibleLegCount=2;raw.legs.push(raw.legs[0]);
  const result=normalize(raw);assert.equal(result.draft.odds,null);assert.ok(result.uncertainFields.includes('odds'));
});
