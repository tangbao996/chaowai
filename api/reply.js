const BASE_SYSTEM = `你是「吵架外挂 V0.4」的中文互联网回击引擎。
你的任务不是讲道理，不是心理咨询，不是客服式沟通；而是准确抓住对方这句话里最可笑、最越界、最双标、最装、最站不住脚的一个点，生成短、狠、损、自然、像真人临场接出来的回击。

风格重点：贴吧、QQ群、游戏群、评论区、朋友互损的中文互联网语感。高火力允许普通粗口，但粗口必须服务于笑点和反杀，不能只是堆脏字。

硬规则：
- 不自证，不写小作文，不教育对方。
- 不编造对方现实经历、收入、家庭、外貌、疾病等未知事实。
- 不攻击受保护特征，不做人肉开盒，不现实威胁，不鼓励暴力，不死亡诅咒，不攻击家人，不性羞辱。
- 允许攻击对方当前话术本身，例如：爱管闲事、装权威、逻辑离谱、戏多、双标、甩锅、低成本玩梗、理解偏差、强行审判。
- 句子要像人说的，不要像“AI在完成任务”。
- 禁止万能句：我理解、尊重你的选择、每个人都有、建议你、保持边界、无需认可、你管好自己、请理性沟通。
`;

const GEN_SYSTEM = BASE_SYSTEM + `
你现在是“贴吧候选生成器”。不要急着给最终答案。
你要围绕同一句话，从完全不同的角度造出 12 条候选。至少覆盖这些打法中的 6 种：
1 反问卸权；2 顺杆反杀；3 角色错位；4 假夸真损；5 冷幽默；6 预判封路；7 拆词；8 一句封喉；9 荒谬类比；10 反向关心；11 镜像回旋；12 低成本脏口。

“贴吧味”的核心不是固定口头禅，而是：
- 把对方那点莫名其妙的优越感架起来嘲讽；
- 把越界的人写成自封官职、临时股东、审批员、财务总监、道德法官之类；
- 顺着对方逻辑推到荒谬；
- 句子短，有突然拐弯；
- 允许欠、损、脏一点，但不要像机器人背梗。

高火力下可以自然出现少量普通粗口，例如“傻逼、扯淡、闲得蛋疼、有病吧、屁事真多”，每条最多 1~2 个，不要条条都用。

只输出 JSON。`;

const JUDGE_SYSTEM = BASE_SYSTEM + `
你现在是“贴吧毒舌总编”。你会看到 12 条候选。你的任务不是变文明，而是把它们往“更像真实老哥临场回的”方向筛和改。

评分优先级：
1 针对性 30%：必须咬住对方原话，不是换场景也能用的万能句；
2 贴吧感 30%：自然、欠、损、突然拐弯、像跟帖；
3 杀伤力 25%：让对方难接，不靠长篇解释；
4 新鲜度 15%：不能是网上烂大街模板。

直接淘汰：
- “你管得真宽”“谁问你了”“急了急了”这种单独拿出来就没内容的低级模板；
- AI味反问；
- 连续堆脏话；
- 过于完整、像作文的句子；
- 三条只是同一句逐级加重。

最终必须给：A 真能发、B 最有贴吧神回复感、C 当前关系和火力允许的最狠版本。
B和C可以比普通社交回复更损、更脏，但仍遵守硬规则。
只输出 JSON。`;

function clamp(n,min=1,max=5){return Math.max(min,Math.min(max,Number(n)||min));}
function safeText(s,n=220){return String(s||'').replace(/\s+/g,' ').trim().slice(0,n);}
function relationCap(relation,fire){
  const f=clamp(fire);
  if(relation==='领导') return Math.min(f,2);
  if(relation==='同事') return Math.min(f,3);
  if(relation==='对象') return Math.min(f,4);
  return f;
}
function styleNote(style){
  return ({
    '高情商':'能真发，但别客服腔。',
    '不吃亏':'不主动升级，但必须把对方框架打回去。',
    '阴阳一下':'冷幽默、假夸真损、装傻拆招。',
    '贴吧老哥':'最大化贴吧跟帖感、意外梗、反问卸权、角色错位。',
    '化粪池':'嘴臭和节目效果优先，允许普通粗口，但必须有梗、有针对性。',
    '疯狗模式':'连续轰炸感优先：短句、高密度、快节奏、明显粗口和嘲讽，但不得现实威胁、攻击家人或做性羞辱。',
    '番茄连招':'高速联想连招：从对方原话抽一个锚词，围绕它做重复前缀、词义跳跃、荒诞升级和突然收尾；像失控的口头连招，但必须针对原话。',
    '强硬反击':'短、硬、不给继续越界空间。',
    '结束争论':'一句收口，不给新素材。'
  })[style] || '不吃亏。';
}
function historyText(history){
  if(!Array.isArray(history)||!history.length) return '无';
  return history.slice(-8).map((x,i)=>`第${i+1}回合 TA：${safeText(x.ta,400)} 我：${safeText(x.me,400)}`).join('\n');
}

async function callModel({system,user,temperature,max_tokens,model}){
  const key=process.env.DEEPSEEK_API_KEY;
  if(!key) return null;
  const r=await fetch('https://api.deepseek.com/chat/completions',{
    method:'POST',
    headers:{'Content-Type':'application/json','Authorization':`Bearer ${key}`},
    body:JSON.stringify({
      model,
      messages:[{role:'system',content:system},{role:'user',content:user}],
      response_format:{type:'json_object'},
      thinking:{type:'disabled'},
      temperature,
      max_tokens
    })
  });
  if(!r.ok){
    const t=await r.text().catch(()=>String(r.status));
    console.error('DeepSeek error',r.status,t.slice(0,500));
    return null;
  }
  const d=await r.json();
  const text=d?.choices?.[0]?.message?.content||'';
  try{return JSON.parse(text.replace(/^```json\s*|\s*```$/g,''));}
  catch(e){console.error('JSON parse error',text.slice(0,700));return null;}
}

async function predict(body,model){
  const fire=relationCap(body.relation||'网友',body.fire||3);
  const user=`关系：${body.relation||'网友'}\n风格：${body.style||'贴吧老哥'}\n火力：${fire}/5\n历史：${historyText(body.history)}\nTA最新一句：${safeText(body.message,4000)}\n\n预测TA最可能接的三种话术，并给一条提前反击。只输出：{"predictions":["","",""] ,"counterattack":"","strategy":"","trap":""}`;
  const d=await callModel({system:BASE_SYSTEM,user,temperature:1.05,max_tokens:900,model});
  if(!d) return null;
  return {predictions:Array.isArray(d.predictions)?d.predictions.slice(0,3).map(x=>safeText(x,100)):[],counterattack:safeText(d.counterattack,140),strategy:safeText(d.strategy,120),trap:safeText(d.trap,120),engine:'deepseek',model};
}

async function generateCandidates(body,model){
  const raw=clamp(body.fire||3);
  const fire=relationCap(body.relation||'网友',raw);
  const isMadDog = body.style==='疯狗模式';
  const isTomato = body.style==='番茄连招';
  const profanity = isMadDog
    ? '强度要求：连续轰炸感拉满。允许明显粗口和高密度嘲讽，短句连发，但禁止现实威胁、攻击家人、性羞辱、疾病残障攻击和仇恨内容。'
    : isTomato
      ? '强度要求：重点不是脏，而是连招节奏。必须从原话抽一个锚词，做4到9段快速联想，重复、变形、跳义、荒诞升级，最后突然收尾。'
      : (body.style==='化粪池'||fire>=5)
        ? '强度要求：明显嘴臭。12条里至少一半要有明显攻击性；可以有少量普通粗口，但不要条条都脏。'
        : fire>=4 ? '强度要求：明显比普通阴阳更狠，不能文明收口。' : '强度要求：有刺、有梗。';
  const user=`
关系：${body.relation||'网友'}
风格：${body.style||'贴吧老哥'}
风格说明：${styleNote(body.style)}
用户火力：${raw}/5
关系约束后火力：${fire}/5
${profanity}
历史：${historyText(body.history)}
TA最新一句：${safeText(body.message,4000)}

先用一句话指出“这句最值得嘲的点”，再生成12条候选。
要求：
- 每条 6~42 个汉字，最多两句；
- 每条都写 tactic；
- 12条不能只是同义改写；
- 至少3条要有明显“突然拐弯”的意外感；
- 至少3条是极短一句封喉；
- 不要为了强度编造事实。
${isMadDog ? `- 疯狗模式额外要求：至少6条采用“短句连续轰炸”，每条可有2到5个短分句；不要文明总结，不要讲道理；粗口只攻击当前话术和行为，不碰家人、身体伤害、性暴力。` : ''}
${isTomato ? `- 番茄连招额外要求：至少8条必须是“连招型”。先提取一个anchor（最好来自TA原话），然后用 anchor+词A → anchor+词B → 语义突然跳转 → 荒诞升级 → 一句暴击收尾。允许重复词制造节奏，允许故意越来越离谱，但必须还能听出是在回这句话。不要复刻任何现成网络台词。` : ''}

输出 JSON：{"target":"最值得打的点","candidates":[{"id":1,"text":"","tactic":"","heat":1},{"id":2,"text":"","tactic":"","heat":1}]}
heat 为1到5。`;
  const d=await callModel({system:GEN_SYSTEM,user,temperature:(isMadDog||isTomato||body.style==='化粪池'||fire>=5)?1.55:1.32,max_tokens:(isTomato?2600:2200),model});
  if(!d || !Array.isArray(d.candidates)) return null;
  const candidates=d.candidates.slice(0,12).map((x,i)=>({id:Number(x.id)||i+1,text:safeText(x.text,120),tactic:safeText(x.tactic,24),heat:clamp(x.heat)})).filter(x=>x.text);
  return {target:safeText(d.target,100),candidates,fire};
}

async function judge(body,gen,model){
  const user=`
原话：${safeText(body.message,4000)}
关系：${body.relation||'网友'}
风格：${body.style||'贴吧老哥'}
有效火力：${gen.fire}/5
最值得打的点：${gen.target}

候选：
${gen.candidates.map(x=>`${x.id}. [${x.tactic}/火力${x.heat}] ${x.text}`).join('\n')}

请做真正的毒舌总编：
- 可以直接重写候选，不必原样照抄；
- A要“真能发但不软”；B要“最像贴吧神回复”；C要“最狠但仍有梗”；
- B、C必须明显比A更有杀伤力；
- 如果候选普遍太文明，主动重写得更损，不要迁就候选；
- 不得编造事实，不得触碰硬规则。
${body.style==='疯狗模式' ? `- 疯狗模式：B/C必须明显有连续轰炸和上头感，不能只是一句精致阴阳。可以粗口密集一点，但不能出现现实暴力威胁、家人羞辱或性暴力内容。` : ''}
${body.style==='番茄连招' ? `- 番茄连招：B/C必须保留“锚词反复 + 词义跳跃 + 越来越离谱 + 突然收尾”的连招结构。B偏好笑，C偏狠。不要把它改回普通一句话。` : ''}

输出严格 JSON：
{"diagnosisTitle":"8到16字","diagnosisText":"1到2句","tactic":"本轮主打法","replies":{"A":{"text":"","risk":1,"tag":""},"B":{"text":"","risk":2,"tag":""},"C":{"text":"","risk":3,"tag":""}},"recommended":"A或B或C","reason":"","satisfaction":1,"overallRisk":1}`;
  return callModel({system:JUDGE_SYSTEM,user,temperature:(body.style==='番茄连招'?1.08:body.style==='疯狗模式'?1.02:0.95),max_tokens:1500,model});
}

function normalize(d,model,fire){
  if(!d) return null;
  d.diagnosisTitle=safeText(d.diagnosisTitle||'这句挺会给自己加戏',40);
  d.diagnosisText=safeText(d.diagnosisText,220);
  d.tactic=safeText(d.tactic||'临场反杀',40);
  d.replies=d.replies||{};
  for(const k of ['A','B','C']){
    const x=d.replies[k]||{};
    d.replies[k]={text:safeText(x.text,180),risk:clamp(x.risk),tag:safeText(x.tag||'回击',16)};
  }
  d.recommended=['A','B','C'].includes(d.recommended)?d.recommended:'B';
  d.reason=safeText(d.reason,160);
  d.satisfaction=clamp(d.satisfaction||4);
  d.overallRisk=clamp(d.overallRisk||3);
  d.engine='deepseek';d.model=model;d.effectiveFire=fire;d.pipeline='double-pass';
  return d;
}

function fallback(body){
  return {
    diagnosisTitle:'这句挺会给自己加戏',
    diagnosisText:'别顺着TA的框架解释，抓住越界和莫名其妙的审判感反打。',
    tactic:'角色错位',
    replies:{
      A:{text:'你这业务范围挺广啊，这也归你审批？',risk:1,tag:'卸权'},
      B:{text:'不知道的还以为你是我钱包失散多年的监护人。',risk:2,tag:'错位'},
      C:{text:'闲得蛋疼就数自己余额，别跑我这儿兼职财务总监。',risk:3,tag:'嘴臭'}
    },
    recommended:'B',reason:'有针对性，够损但还留着回旋余地。',satisfaction:4,overallRisk:3,engine:'demo',pipeline:'fallback'
  };
}

module.exports=async function handler(req,res){
  if(req.method!=='POST') return res.status(405).json({error:'Method not allowed'});
  const body=req.body||{};
  const model=process.env.DEEPSEEK_STYLE_MODEL||process.env.DEEPSEEK_MODEL||'deepseek-v4-flash';
  try{
    if(body.mode==='predict'){
      const p=await predict(body,model);
      return res.status(200).json(p||{predictions:[],counterattack:'',strategy:'',trap:'',engine:'demo'});
    }
    const gen=await generateCandidates(body,model);
    if(!gen) return res.status(200).json(fallback(body));
    const judged=await judge(body,gen,model);
    return res.status(200).json(normalize(judged,model,gen.fire)||fallback(body));
  }catch(e){
    console.error(e);
    return res.status(200).json(fallback(body));
  }
}
