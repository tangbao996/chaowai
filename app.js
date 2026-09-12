const $=s=>document.querySelector(s);
let relation='对象',style='不吃亏',lastPayload=null,lastResult=null;
let history=[];
const message=$('#message'),count=$('#count'),fire=$('#fire'),fireLabel=$('#fireLabel');
const labels={1:'1级 · 文明人',2:'2级 · 阴阳',3:'3级 · 贴吧',4:'4级 · 嘴臭',5:'5级 · 化粪池'};
message.addEventListener('input',()=>count.textContent=message.value.length);
fire.addEventListener('input',()=>fireLabel.textContent=labels[fire.value]);
function bindChips(id,setter){document.querySelectorAll(`#${id} .chip`).forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll(`#${id} .chip`).forEach(x=>x.classList.remove('active'));btn.classList.add('active');setter(btn.dataset.value)}))}
bindChips('relationChips',v=>relation=v);bindChips('styleChips',v=>style=v);
function stars(n){n=Math.max(1,Math.min(5,Number(n)||1));return '★'.repeat(n)+'☆'.repeat(5-n)}
function showToast(t='已复制'){const x=$('#toast');x.textContent=t;x.classList.add('show');setTimeout(()=>x.classList.remove('show'),1500)}
async function callApi(payload){const r=await fetch('/api/reply',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});if(!r.ok)throw new Error('请求失败');return r.json()}
function render(data){
  lastResult=data;
  $('#diagnosisTitle').textContent=data.diagnosisTitle;
  $('#diagnosisText').textContent=data.diagnosisText;
  const tactic=$('#tacticBadge'); if(tactic) tactic.textContent=`打法 · ${data.tactic||'临场反杀'}`;
  const badge=$('#engineBadge');
  if(badge){badge.textContent=data.engine==='deepseek'?'DeepSeek AI':'演示模式';badge.classList.toggle('demo',data.engine!=='deepseek')}
  ['A','B','C'].forEach(k=>{
    $(`#reply${k}`).textContent=data.replies[k].text;
    $(`#risk${k}`).textContent=`翻车 ${stars(data.replies[k].risk)}`;
    const tag=$(`#tag${k}`); if(tag) tag.textContent=data.replies[k].tag||'';
  });
  document.querySelectorAll('.reply-card').forEach(c=>c.classList.remove('recommended'));
  $(`#card${data.recommended||'B'}`).classList.add('recommended');
  $('#recommended').textContent=`推荐 ${data.recommended||'B'}`;
  $('#reason').textContent=data.reason||'';
  $('#satisfaction').textContent=stars(data.satisfaction);
  $('#overallRisk').textContent=stars(data.overallRisk);
  $('#result').classList.remove('hidden');
  $('#prediction').classList.add('hidden');
}
$('#submit').addEventListener('click',async()=>{
  const text=message.value.trim();if(!text){showToast('先把TA的话贴进来');return}
  lastPayload={message:text,relation,style,fire:Number(fire.value),history};
  $('#loading').classList.remove('hidden');$('#result').classList.add('hidden');$('#submit').disabled=true;
  try{render(await callApi(lastPayload));}
  catch(e){showToast('网络开小差了，再试一次');}
  finally{$('#loading').classList.add('hidden');$('#submit').disabled=false}
});
document.querySelectorAll('.copy').forEach(b=>b.addEventListener('click',async()=>{const t=document.getElementById(b.dataset.target).textContent;await navigator.clipboard.writeText(t);showToast('已复制，先想2秒再发')}));
$('#again').addEventListener('click',()=>{
  if(lastPayload&&lastResult){
    const rec=lastResult.recommended||'B';
    const my=lastResult.replies?.[rec]?.text||'';
    history.push({ta:lastPayload.message,me:my});
    history=history.slice(-8);
  }
  message.value='';count.textContent='0';message.focus();window.scrollTo({top:0,behavior:'smooth'});showToast(`已记住前${history.length}回合，把TA新回复贴进来`)
});
$('#predict').addEventListener('click',async()=>{
  if(!lastPayload)return;$('#predict').textContent='预测中…';$('#predict').disabled=true;
  try{
    const d=await callApi({...lastPayload,mode:'predict',history});
    $('#predictionList').innerHTML=(d.predictions||[]).map(x=>`<li>${escapeHtml(x)}</li>`).join('');
    $('#counterattack').textContent=d.counterattack||'';
    $('#prediction').classList.remove('hidden');
  }catch(e){showToast('预测失败，再点一次')}
  finally{$('#predict').textContent='预测TA下一句';$('#predict').disabled=false}
});
function escapeHtml(s){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
