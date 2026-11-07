(() => {
  const root=document.querySelector('#learning-assistant');
  if(!root)return;
  const $=selector=>root.querySelector(selector);
  const launcher=$('#learning-assistant-launcher'),panel=$('#learning-assistant-panel'),messagesHost=$('#learning-assistant-messages'),input=$('#learning-assistant-input');
  let activePath='origins',messages=[],hints={},context=null,active=false,open=false,controller=null,owner='guest',loadRevision=0,sessionReady=true,lastRequest=null,pendingMessage=null,saveTimer=null;
  const pathNames={origins:'发现与命名',framework:'年代、文化与古城',pits:'器物坑与雕像',connections:'工艺、金沙与“蜀”'};
  const collectionFor=path=>`learning_${path}_assistant`,localKeyFor=path=>`sanxingdui-learning-${path}-assistant-v1`;

  function taskLabel(id){return ({discovery:'发现史料互动',place:'辨认地名',scope:'比较遗址范围',record:'学习记录',chronology:'年代是怎样推出来的？',culture:'一处遗址等于一种文化吗？','stone-bronze':'从石器到青铜器，能推出什么？',walls:'城墙如何拼出一座古城？',dating:'年代之辩',nature:'器物坑的性质',identity:'雕像身份',origins:'器物来源与比较',craft:'工艺是怎样比较的？',jinsha:'三星堆与金沙：关系如何比较？',shu:'考古材料与“蜀”：称谓如何对读？'})[id]||pathNames[activePath]||'当前研学任务';}
  function stageLabel(stage){return ({reading:'阅读材料',evidence:'整理证据',judgment:'形成判断'})[stage]||'当前任务';}
  function setStatus(message,error=false){const node=$('#learning-assistant-status');node.textContent=message||'';node.classList.toggle('is-error',Boolean(error));}
  function currentContext(){return ({origins:window.LearningOrigins,framework:window.LearningFramework,pits:window.LearningPits,connections:window.LearningConnections})[activePath]?.getAssistantContext?.()||null;}

  function persistSession(path=activePath){
    const value={version:1,messages:messages.slice(-60).map(({role,content,taskId,taskTitle,materialId,submittedAtSend,sources,operation,local})=>({role,content,taskId,taskTitle,materialId,submittedAtSend,sources,operation,local})),hints,updatedAt:new Date().toISOString()};
    void window.AccountData?.save(collectionFor(path),'session',value,localKeyFor(path)).catch(error=>setStatus(error.message||'会话保存失败；本次对话仍保留在页面中。',true));
  }
  function saveSession(){const path=activePath;clearTimeout(saveTimer);saveTimer=setTimeout(()=>persistSession(path),350);}

  function addMessage(message,persist=true){messages.push(message);if(messages.length>60)messages=messages.slice(-60);renderMessages();if(persist)saveSession();}
  function appendText(host,tag,className,text){const node=document.createElement(tag);if(className)node.className=className;node.textContent=text||'';host.append(node);return node;}
  function renderMessages(){
    messagesHost.replaceChildren();
    if(!messages.length){const guide=context?.stage==='reading'?'先看材料的作者、时间和叙述关系。你可以解释当前材料，也可以选中一句话后请助手解释。':context?.stage==='evidence'?'先比较材料的来源、形成时间和记述关系，再按需获取分层提示。':context?.stage==='judgment'?'先形成自己的判断；助手可以检查你的理由，也能带你回看相关材料。':'围绕当前任务提问。';appendText(messagesHost,'p','learning-assistant-empty',`${guide} 打开助手不会自动发送请求。`);return;}
    let lastTask='';
    for(const message of messages){
      if(message.taskId&&message.taskId!==lastTask){appendText(messagesHost,'p','learning-assistant-task-mark',`任务切换 · ${message.taskTitle||taskLabel(message.taskId)}`);lastTask=message.taskId;}
      const bubble=document.createElement('article');bubble.className=`learning-assistant-message ${message.role==='user'?'is-user':'is-assistant'}${message.pending?' is-pending':''}`;messagesHost.append(bubble);
      const body=appendText(bubble,'div','learning-assistant-body',message.content||'');
      if(message.local){const badge=document.createElement('b');badge.className='learning-assistant-local-badge';badge.textContent='阅读提示 · 本地预设';bubble.prepend(badge);}
      if(message.role==='assistant'&&!message.pending&&(message.content||'').length>520){body.classList.add('is-collapsed');const expand=document.createElement('button');expand.type='button';expand.className='learning-assistant-expand';expand.dataset.assistantExpand='';expand.setAttribute('aria-expanded','false');expand.textContent='展开更多';bubble.append(expand);}
      if(message.sources?.length){const list=document.createElement('div');list.className='learning-assistant-sources';for(const source of message.sources){const card=document.createElement('div');card.className='learning-assistant-source';const author=[source.author,source.attribution].filter(Boolean).join(' · ');appendText(card,'b','',source.title||'课程材料');if(author)appendText(card,'span','',author);if(source.locator)appendText(card,'span','',source.locator);if(source.reviewStatus)appendText(card,'span','',`复核状态：${source.reviewStatus}`);if(source.materialId){const locate=document.createElement('button');locate.type='button';locate.textContent='回看这段材料';locate.dataset.assistantLocate=source.materialId;card.append(locate);}list.append(card);}bubble.append(list);}
    }
    messagesHost.scrollTop=messagesHost.scrollHeight;
  }

  function renderActions(){
    const host=$('#learning-assistant-actions');host.replaceChildren();
    if(!context)return;
    const actions=context.stage==='reading'?
      [['explain',context.selectedText?'解释选中的句子':'解释这段材料'],['hint','提示我关注哪里']]:
      context.stage==='evidence'?
        [['hint','给我一点提示'],['ask','怎样判断材料的作用']]:
        [['check-reason','检查我的理由'],['ask','我该回看哪些材料']];
    for(const [action,label] of actions){const button=document.createElement('button');button.type='button';button.dataset.assistantAction=action;button.textContent=label;host.append(button);}
    if(context.reasonText?.trim()){const review=document.createElement('button');review.type='button';review.dataset.assistantAction='check-reason';review.textContent='检查我的理由';host.append(review);}
    if(context.materialId){const key=`${context.taskId}:${context.materialId}`;const level=Number(hints[key]||0);if(level>0&&level<3){const more=document.createElement('button');more.type='button';more.dataset.assistantAction='hint-more';more.textContent='再给一点提示';host.append(more);}if(level>0){const tryButton=document.createElement('button');tryButton.type='button';tryButton.dataset.assistantAction='try';tryButton.textContent='我再试试';host.append(tryButton);}}
    if(lastRequest&&$('#learning-assistant-status').classList.contains('is-error')){const retry=document.createElement('button');retry.type='button';retry.dataset.assistantAction='retry';retry.textContent='重试';host.append(retry);}
  }

  function updateContext(next){
    context=next||null;const visible=Boolean(active&&context&&new URLSearchParams(location.search).get('page')==='learning'&&new URLSearchParams(location.search).get('path')===activePath);
    root.hidden=!visible;
    if(!visible){closePanel(false);return;}
    $('#learning-assistant-context').textContent=`${pathNames[activePath]} · ${context.taskTitle||taskLabel(context.taskId)}`;
    $('#learning-assistant-stage-note').textContent=context.selectedText?'已选中当前材料的一段文字；解释会优先围绕这段原文，并保留来源归属。':context.stage==='reading'?'先读当前材料，再选择需要的帮助。':context.stage==='evidence'?'围绕当前证据卡，先观察材料能说明什么。':'可以检查自己的判断理由，或回看相关材料。';
    renderActions();
  }

  function openPanel(){if(!active||!context)return;open=true;panel.hidden=false;launcher.setAttribute('aria-expanded','true');renderMessages();input.focus({preventScroll:true});}
  function closePanel(returnFocus=true){if(!open&&!panel.hidden)return;open=false;panel.hidden=true;launcher.setAttribute('aria-expanded','false');if(returnFocus&&active)launcher.focus({preventScroll:true});}

  async function loadSession(){
    clearTimeout(saveTimer);const revision=++loadRevision,path=activePath;sessionReady=false;owner=window.AccountData?.userId?`user:${window.AccountData.userId}`:'guest';messages=[];hints={};renderMessages();
    try{const session=await window.AccountData?.load(collectionFor(path),'session',localKeyFor(path),{messages:[],hints:{}});if(revision!==loadRevision)return;if(session?.messages&&Array.isArray(session.messages))messages=session.messages.filter(item=>item&&['user','assistant'].includes(item.role)&&typeof item.content==='string').slice(-60);hints=session?.hints&&typeof session.hints==='object'?session.hints:{};sessionReady=true;renderMessages();renderActions();}
    catch(error){if(revision===loadRevision){sessionReady=true;setStatus(error?.message||'会话读取失败。',true);}}
  }

  function createPayload(operation,question='',options={}){
    const snapshot=structuredClone(currentContext()||context);
    if(!snapshot)return null;
    return {path:snapshot.path||activePath,taskId:snapshot.taskId,stage:snapshot.stage,materialId:snapshot.materialId,operation,question,selectedText:snapshot.selectedText||'',submitted:snapshot.submitted===true,choice:snapshot.choice||'',hintLevel:options.hintLevel||1,reason:options.reason||'',history:messages.slice(-16).map(({role,content,taskId,materialId,submittedAtSend})=>({role,content,taskId,materialId,submittedAtSend}))};
  }

  function localReadingHint(payload){
    if(payload.operation==='check_reason')return '先看三点：你提出了什么判断、引用了哪条材料、材料为什么能支持这个判断。最值得补强的通常是最后一步。追问自己：这条材料能直接证明结论，还是只能提供一条线索？';
    if(payload.operation==='hint')return payload.hintLevel===1?'阅读提示：先观察材料中出现了哪些人物、时间和地点，再比较不同记录写下来的时间与事件之间的关系。':payload.hintLevel===2?'阅读提示：回到当前材料，找出明确写出的时间词和叙述者身份；注意区分事件发生时间、记录形成时间与转引时间。':'阅读提示：把每条线索和你的判断逐一对应，并说明它能支持到什么程度；单条转述未必能证明完整经过。';
    if(payload.operation==='explain')return '阅读提示：先把长句拆成“谁做了什么、依据来自谁的记述”。留意原始记载、书中转引和编辑说明的区别；有分歧时保留不确定性。';
    return '阅读提示：回到当前材料，圈出人物、时间、地点和来源身份，再问自己这条记录能直接说明什么、还不能说明什么。来源卡中的页序可帮助你定位原文。';
  }

  async function run(payload){
    if(controller||!payload)return;
    if(!sessionReady){setStatus('正在读取当前账号的学习助手会话，请稍后再发送。');return;}
    lastRequest=payload;const turnId=crypto.randomUUID(),sessionRevision=loadRevision;const taskTitle=taskLabel(payload.taskId);
    addMessage({role:'user',content:payload.operation==='check_reason'?'请助手看看我的理由':payload.question||({explain:'解释这段材料',hint:'给我一点提示'}[payload.operation]||'请结合当前任务帮助我'),taskId:payload.taskId,taskTitle,materialId:payload.materialId,submittedAtSend:payload.submitted,operation:payload.operation});
    const answer={role:'assistant',content:'',taskId:payload.taskId,taskTitle,materialId:payload.materialId,submittedAtSend:payload.submitted,operation:payload.operation,pending:true};messages.push(answer);pendingMessage=answer;renderMessages();saveSession();
    controller=new AbortController();$('#learning-assistant-send').disabled=true;$('#learning-assistant-stop').hidden=false;setStatus('正在结合当前材料整理…');
    let frame='';
    try{
      const response=await fetch('/api/learning/assistant',{method:'POST',headers:{'content-type':'application/json','accept':'text/event-stream'},body:JSON.stringify(payload),signal:controller.signal,credentials:'same-origin'});
      if(!response.ok){const err=await response.json().catch(()=>({}));throw new Error(err.error||`请求失败（${response.status}）。`);}
      const reader=response.body.getReader(),decoder=new TextDecoder();
      const consume=block=>{const lines=block.split(/\r?\n/);let event='message',data='';for(const line of lines){if(line.startsWith('event:'))event=line.slice(6).trim();else if(line.startsWith('data:'))data+=line.slice(5).trim();}if(!data)return;const value=JSON.parse(data);if(event==='token'){answer.content+=value.text||'';const nodes=messagesHost.querySelectorAll('.learning-assistant-message.is-assistant');const bubble=nodes[nodes.length-1],body=bubble?.querySelector('.learning-assistant-body');if(body)body.textContent=answer.content;messagesHost.scrollTop=messagesHost.scrollHeight;}else if(event==='sources')answer.sources=value.sources||[];else if(event==='status')setStatus(value.message||'正在整理…');else if(event==='error')throw new Error(value.error||'生成失败。');};
      while(true){const {value,done}=await reader.read();if(done)break;frame+=decoder.decode(value,{stream:true});const blocks=frame.split(/\r?\n\r?\n/);frame=blocks.pop()||'';for(const block of blocks)consume(block);}
      if(frame.trim())consume(frame);
      if(!answer.content.trim())throw new Error('没有收到回答内容，请重试。');
      answer.pending=false;setStatus('');renderMessages();saveSession();
    }catch(error){
      if(sessionRevision!==loadRevision)return;
      answer.pending=false;
      if(error.name==='AbortError'){lastRequest=null;setStatus('已停止生成；你输入的内容和已收到的回答已保留。');}
      else{answer.local=true;answer.content=localReadingHint(payload);setStatus(`${error.message||'助手暂时不可用。'}已提供本地阅读提示，可检查配置后重试。`,true);}
      renderMessages();saveSession();
    }finally{if(turnId){controller=null;pendingMessage=null;$('#learning-assistant-send').disabled=false;$('#learning-assistant-stop').hidden=true;renderActions();}}
  }

  function hintLevel(){const key=`${context.taskId}:${context.materialId||''}`;const level=Math.min(3,Number(hints[key]||0)+1);hints[key]=level;saveSession();renderActions();return level;}
  function explain(){if(!context?.materialId){setStatus('请先进入一段具体材料。');return;}void run(createPayload('explain',''))}
  function hint(){if(!context?.materialId){setStatus('请先进入一段具体材料。');return;}void run(createPayload('hint','',{hintLevel:hintLevel()}))}
  function checkReason(fieldId){const field=document.getElementById(fieldId)||(fieldId==='lp-reason'?document.querySelector('[data-reason]'):null)||document.querySelector('[data-assistant-reason]')||root.querySelector('[data-assistant-reason]'),reason=field?.value?.trim()||context?.reasonText?.trim()||'';if(!reason){setStatus('先写下你的判断理由，再请助手检查。');field?.focus();return;}
    if(activePath!=='origins'){const payload=createPayload('check_reason','',{reason});if(payload){payload.question='请检查这段学习记录中的判断理由。';void run(payload);}return;}
    const base=currentContext();if(!base)return;
    let taskId=base.taskId,stage=base.stage,materialId=base.materialId,choice=base.choice,submitted=base.submitted;
    if(fieldId==='learning-record-evidence'){taskId='discovery';stage='judgment';materialId='discovery';submitted=Boolean(base.taskId==='discovery'&&base.stage==='judgment'&&base.materialId==='discovery'&&base.submitted);choice=submitted?base.choice:'';}
    if(fieldId==='learning-record-name'){taskId='place';stage='evidence';materialId='hanzhou-old-administration';submitted=Boolean(base.taskId==='place'&&base.materialId==='hanzhou-old-administration'&&base.submitted);choice=submitted?base.choice:'';}
    const payload={...createPayload('check_reason',''),taskId,stage,materialId,choice,submitted,reason,question:'请检查这段学习记录中的判断理由。'};if(payload?.taskId&&payload.materialId)void run(payload);else setStatus('找不到与这段理由对应的课程材料，请先打开相关任务。',true);
  }

  root.addEventListener('click',event=>{
    if(event.target.closest('#learning-assistant-launcher')){openPanel();return;}
    if(event.target.closest('#learning-assistant-close')){closePanel();return;}
    if(event.target.closest('#learning-assistant-stop')){controller?.abort();return;}
    const locate=event.target.closest('[data-assistant-locate]');if(locate){({origins:window.LearningOrigins,framework:window.LearningFramework,pits:window.LearningPits,connections:window.LearningConnections})[activePath]?.revisitAssistantMaterial?.(locate.dataset.assistantLocate);return;}
    const reason=event.target.closest('[data-assistant-check-reason]');if(reason){event.preventDefault();event.stopPropagation();checkReason(reason.dataset.assistantCheckReason);return;}
    const expand=event.target.closest('[data-assistant-expand]');if(expand){const body=expand.closest('.learning-assistant-message')?.querySelector('.learning-assistant-body');if(body){const expanded=expand.getAttribute('aria-expanded')==='true';body.classList.toggle('is-collapsed',expanded);expand.setAttribute('aria-expanded',String(!expanded));expand.textContent=expanded?'展开更多':'收起';}return;}
    const action=event.target.closest('[data-assistant-action]')?.dataset.assistantAction;
    if(action==='explain')explain();else if(action==='hint'||action==='hint-more')hint();else if(action==='check-reason'){const field=activePath==='origins'?(context?.taskId==='place'?'learning-record-name':'learning-record-evidence'):'';checkReason(field);}else if(action==='try'){input.placeholder='试着把材料线索和你的判断连起来…';input.focus({preventScroll:true});setStatus('先写下你的判断；需要时再要下一层提示。');}else if(action==='retry'&&lastRequest){$('#learning-assistant-status').classList.remove('is-error');void run(lastRequest);}else if(action==='ask'){const q=event.target.closest('[data-assistant-action]').textContent;void run(createPayload('ask',q));}
  });
  document.addEventListener('click',event=>{const button=event.target.closest('[data-assistant-check-reason]');if(button){event.preventDefault();checkReason(button.dataset.assistantCheckReason);}});
  $('#learning-assistant-form').addEventListener('submit',event=>{event.preventDefault();const question=input.value.trim();if(!question){setStatus('先输入一个与当前学习任务有关的问题。');input.focus();return;}void run(createPayload('ask',question));});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&open){event.preventDefault();controller?.abort();closePanel();}});
  window.addEventListener('learning-origins:activate',()=>{if(activePath!=='origins')persistSession(activePath);controller?.abort();closePanel(false);activePath='origins';active=true;root.hidden=false;void loadSession();updateContext(currentContext());});
  window.addEventListener('learning-origins:deactivate',()=>{if(activePath!=='origins')return;persistSession('origins');active=false;controller?.abort();closePanel(false);root.hidden=true;});
  window.addEventListener('learning-origins:context-changed',event=>{updateContext(event.detail||currentContext());});
  window.addEventListener('learning-assistant:activate',event=>{activePath=event.detail?.path||'';if(!pathNames[activePath])return;active=true;root.hidden=false;closePanel(false);void loadSession();updateContext(currentContext());});
  window.addEventListener('learning-assistant:deactivate',event=>{if(event.detail?.path&&event.detail.path!==activePath)return;persistSession(activePath);active=false;controller?.abort();closePanel(false);root.hidden=true;context=null;});
  window.addEventListener('learning-assistant:context-changed',event=>{if(event.detail?.path===activePath)updateContext(event.detail);});
  window.addEventListener('account-user-changed',()=>{clearTimeout(saveTimer);controller?.abort();closePanel(false);messages=[];hints={};context=null;owner='guest';renderMessages();updateContext(null);if(active)void loadSession();});
  window.addEventListener('pagehide',()=>{if(controller)controller.abort();persistSession(activePath);});
})();
