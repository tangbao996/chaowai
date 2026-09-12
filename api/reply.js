const SYSTEM = `你是「吵架外挂」的核心模型，一名反应很快、懂中文互联网语感的聊天回击军师。

你的目标不是无脑骂人，而是：先看懂对方的套路，再给出短、准、自然、能直接复制发送的回复。用户希望“像真人”“像贴吧老哥会接梗”，不要客服腔、心理咨询腔、作文腔、AI腔。

【贴吧老哥风格库：只学习表达机制，不照抄固定句子】
1. 反问卸力：把对方的审判权还回去，例如“不是哥们，这事还得先过你审批？”
2. 顺杆反杀：顺着对方的话说半句，再把荒谬处点出来。
3. 装傻拆招：假装没听懂，让对方的阴阳失去效果。
4. 预判梗：识别“急了、破防了、就这、典、孝、你说得对”等低成本终结词，别认真自证，直接指出套路。
5. 冷幽默：一本正经地荒诞化对方的过度关注或越界。
6. 一句封喉：能一句结束就不要三句，不重复解释。
7. 反客为主：从“我为什么要证明自己”切换成“你为什么这么越界/上心”。
8. 有梗但不脏：高级回击优先靠节奏、反差、反问和预判，不靠堆脏话。

【关系规则】
对象：保留感情余地，普通争吵不要轻易上升到分手羞辱。
前任：边界清楚，不显得纠缠。
朋友：可以损、有梗，但避免真戳不可逆痛点。
同事：不留职场把柄，事实和边界优先。
领导：高情商、留痕、不背锅，不直接羞辱。
亲戚：表面客气，实际上把边界堵住。
网友：可以更直接、更有梗，但不要陷入无限互骂。

【火力】
1 温和：有态度但不攻击。
2 克制：明确反驳。
3 带刺：明显回击，有梗。
4 强硬：短而有压迫感，不给继续越界空间。
5 核武：最大化语言技巧与爽感，但仍禁止现实威胁、隐私曝光、歧视仇恨、死亡诅咒、鼓励暴力、性羞辱、攻击疾病/残障/家人等。
火力越高，不等于粗口越多。

【重要判断】
- 不默认用户永远正确。若用户明显理亏，在 diagnosisText 里简短指出，并给更适合止损的回复。
- 识别对方是在：嘲讽、阴阳、甩锅、挑衅、PUA式贬低、转移话题、扣帽子、冷处理、正常表达不满，还是玩梗。
- 如果对方只是正常表达不满，不要把冲突强行升级。
- 不编造事实，不教用户造谣。

【语言要求】
- 主要回复每条建议 8~45 个汉字，必要时可略长。
- 像中国年轻人真实聊天，不用“我理解你的感受”“建议你尝试沟通”等套话。
- 「贴吧老哥」模式要有梗、反应快、像跟帖神回复，但不要复刻具体网友名句。
- 不要解释太多，用户要的是能发出去的话。

只输出严格 JSON，不要 Markdown，不要代码围栏。`;

function clamp(n,min=1,max=5){return Math.max(min,Math.min(max,Number(n)||min));}

function styleNote(style){
  const map={
    '高情商':'重点是体面、不吃亏、不给对方抓把柄。',
    '不吃亏':'重点是把边界和态度说清楚，不主动升级。',
    '阴阳一下':'用反问、顺杆、冷幽默，尽量不直接骂。',
    '强硬反击':'短、硬、明确结束越界。',
    '结束争论':'不给新话题，不自证，一句收口。',
    '贴吧老哥':'优先使用贴吧式反问、预判梗、冷幽默、顺杆反杀和一句封喉；自然、有梗、别像段子生成器。'
  };
  return map[style]||map['不吃亏'];
}

function historyText(history){
  if(!Array.isArray(history)||!history.length) return '无历史对话。';
  return history.slice(-8).map((x,i)=>{
    const ta=String(x.ta||'').slice(0,500);
    const me=String(x.me||'').slice(0,500);
    return `第${i+1}回合\nTA：${ta}\n我：${me}`;
  }).join('\n');
}

async function callDeepSeek(body){
  const key=process.env.DEEPSEEK_API_KEY;
  if(!key) return null;

  const model=process.env.DEEPSEEK_MODEL||'deepseek-v4-flash';
  const isPredict=body.mode==='predict';
  const schema=isPredict
    ? `返回 JSON：{"predictions":["最可能回复1","最可能回复2","最可能回复3"],"counterattack":"提前准备的一句反击","strategy":"对方最可能采用的套路"}`
    : `返回 JSON：{"diagnosisTitle":"10字左右战局判断","diagnosisText":"1到2句，判断套路并说明最佳策略","replies":{"A":{"text":"最稳、真能发","risk":1},"B":{"text":"更有梗、更带刺","risk":2},"C":{"text":"当前火力允许的最强回复","risk":3}},"recommended":"A或B或C","reason":"一句话解释为什么最适合真发","satisfaction":1到5,"overallRisk":1到5}`;

  const user=`${isPredict?'预测对方下一步，并准备反击':'分析当前战局并生成三档回复'}。
关系：${body.relation||'网友'}
目标风格：${body.style||'不吃亏'}
风格补充：${styleNote(body.style)}
火力：${clamp(body.fire,1,5)}/5

历史回合：
${historyText(body.history)}

TA最新一句：
${String(body.message||'').slice(0,4000)}

${schema}
确保字段齐全，所有 risk/satisfaction/overallRisk 都是 1~5 的整数。`;

  const r=await fetch('https://api.deepseek.com/chat/completions',{
    method:'POST',
    headers:{
      'Content-Type':'application/json',
      'Authorization':`Bearer ${key}`
    },
    body:JSON.stringify({
      model,
      messages:[
        {role:'system',content:SYSTEM},
        {role:'user',content:user}
      ],
      response_format:{type:'json_object'},
      thinking:{type:'disabled'},
      max_tokens:900,
      temperature:1.0
    })
  });

  if(!r.ok){
    const err=await r.text().catch(()=>String(r.status));
    console.error('DeepSeek error',r.status,err.slice(0,500));
    return null;
  }
  const d=await r.json();
  const text=d?.choices?.[0]?.message?.content||'';
  try{
    const parsed=JSON.parse(text.replace(/^```json\s*|\s*```$/g,''));
    parsed.engine='deepseek';
    parsed.model=model;
    return parsed;
  }catch(e){
    console.error('DeepSeek JSON parse error',text.slice(0,500));
    return null;
  }
}

function fallback(body){
  const {message='',relation='网友',style='不吃亏',fire=3,mode}=body;
  if(mode==='predict') return predictFallback(body);
  const m=String(message).replace(/\s+/g,' ').trim();
  const insult=/工资|没用|废物|垃圾|穷|丢人|你也配|就这|本事|蠢|脑子/.test(m);
  const canned=/急了|破防|典|孝|乐|就这/.test(m);
  const blame=/都是你|怪你|你负责|你自己看着办|你来处理|你导致/.test(m);
  let diagnosisTitle=canned?'对方在用低成本梗收尾':insult?'对方在贬低你':blame?'对方在往你身上甩锅':'对方在试图占据话语上风';
  let diagnosisText=`先别自证。你们是${relation}关系，这一轮更适合“${style}”：回应一次，把边界扔回去。`;
  let A='你有你的看法，我有我的选择，有事说事就行。';
  let B=style==='贴吧老哥'?'不是哥们，这事什么时候轮到你审批了？':'你这么上心，不知道的还以为这事归你管。';
  let C=canned?'下一句是不是还要接“急了”？流程我都替你走完了。':'评价别人之前，先把自己的分寸管好。';
  if(relation==='领导'){A='收到，我会按要求处理；具体责任和标准也麻烦确认一下，避免后面信息对不上。';B='我可以配合，但责任边界最好先确认清楚。';C=B;}
  return {diagnosisTitle,diagnosisText,replies:{A:{text:A,risk:1},B:{text:B,risk:clamp(Number(fire)-1)},C:{text:C,risk:clamp(Number(fire))}},recommended:relation==='领导'?'A':'B',reason:relation==='领导'?'最稳，回应了要求，也把责任边界留住。':'有梗但没把冲突直接拉满，更适合真发。',satisfaction:clamp(Number(fire)+1),overallRisk:clamp(Number(fire)-1),engine:'demo',demo:true};
}

function predictFallback(body){
  const canned=/急了|破防|典|孝|乐|就这/.test(String(body.message||''));
  return {predictions:canned?['“哈哈，又急了。”','“破防就别回了。”','“你说得对，你都对。”']:['“我就随口说一句，你至于吗？”','“你现在怎么这么敏感？”','“行行行，你说什么都对。”'],counterattack:canned?'你看，下一句我都替你写好了。还有新词吗？':'不是放大，是把边界说清楚。你有事直接说事。',strategy:canned?'继续用“急了/破防”回避内容':'把冒犯说成“开玩笑/随口说”',engine:'demo',demo:true};
}

async function probeDeepSeek(){
  const key=process.env.DEEPSEEK_API_KEY;
  if(!key) return {configured:false,reachable:false,model:null};
  const model=process.env.DEEPSEEK_MODEL||'deepseek-v4-flash';
  try{
    const r=await fetch('https://api.deepseek.com/chat/completions',{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':`Bearer ${key}`},
      body:JSON.stringify({
        model,
        messages:[{role:'user',content:'只输出 OK'}],
        thinking:{type:'disabled'},
        max_tokens:8,
        temperature:0
      })
    });
    if(!r.ok){
      const text=await r.text().catch(()=> '');
      return {configured:true,reachable:false,model,status:r.status,error:text.slice(0,160)};
    }
    const d=await r.json();
    return {configured:true,reachable:true,model,reply:String(d?.choices?.[0]?.message?.content||'').slice(0,40)};
  }catch(e){
    return {configured:true,reachable:false,model,error:String(e?.message||e).slice(0,160)};
  }
}

module.exports=async function handler(req,res){
  if(req.method==='GET'){
    if(String(req.query?.probe||'')==='1') return res.status(200).json(await probeDeepSeek());
    return res.status(200).json({configured:Boolean(process.env.DEEPSEEK_API_KEY),model:process.env.DEEPSEEK_MODEL||'deepseek-v4-flash'});
  }
  if(req.method!=='POST') return res.status(405).json({error:'Method not allowed'});
  const body=req.body||{};
  if(!String(body.message||'').trim()) return res.status(400).json({error:'message required'});
  try{
    const ai=await callDeepSeek(body);
    return res.status(200).json(ai||fallback(body));
  }catch(e){
    console.error(e);
    return res.status(200).json(fallback(body));
  }
};
