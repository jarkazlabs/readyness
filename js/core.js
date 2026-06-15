(function(root,factory){
  const core=factory();
  if(typeof module==="object"&&module.exports)module.exports=core;
  root.ReadynessCore=core;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  function isSentenceWithThreeWords(text){
    const value=String(text||"").trim();
    return /[.!?]$/.test(value)&&value.split(/\s+/).filter(Boolean).length>=3;
  }

  function normalizeRequest(request,fallbackUser="Nicht zugewiesen"){
    const normalized={...request};
    normalized.responsible=normalized.responsible||normalized.createdBy||fallbackUser;
    normalized.targetDepartment=normalized.targetDepartment||normalized.category||"Nicht zugeordnet";
    normalized.participants=[...new Set([...(normalized.participants||[]),normalized.createdBy,normalized.responsible].filter(Boolean))];
    normalized.inputs=(normalized.inputs||[]).map(input=>({...input,next:!!input.next}));
    normalized.decisions=(normalized.decisions||[]).map(decision=>({
      ...decision,
      next:!!decision.next,
      documentedBy:decision.documentedBy||"",
      documentedAt:decision.documentedAt||""
    }));
    normalized.log=normalized.log||[];
    return normalized;
  }

  function score(request){
    const inputs=request.inputs||[];
    const decisions=request.decisions||[];
    const total=inputs.length+decisions.length;
    if(!total)return 0;
    const completed=inputs.filter(input=>input.done).length+decisions.filter(decision=>decision.decided).length;
    return Math.round((completed/total)*100);
  }

  function nextStepItem(request){
    const inputs=request.inputs||[];
    const decisions=request.decisions||[];
    const markedInput=inputs.findIndex(input=>input.next&&!input.done);
    if(markedInput>=0)return{type:"input",idx:markedInput,item:inputs[markedInput],marked:true};
    const markedDecision=decisions.findIndex(decision=>decision.next&&!decision.decided);
    if(markedDecision>=0)return{type:"decision",idx:markedDecision,item:decisions[markedDecision],marked:true};
    const inputIndex=inputs.findIndex(input=>!input.done);
    if(inputIndex>=0)return{type:"input",idx:inputIndex,item:inputs[inputIndex],marked:false};
    const decisionIndex=decisions.findIndex(decision=>!decision.decided);
    if(decisionIndex>=0)return{type:"decision",idx:decisionIndex,item:decisions[decisionIndex],marked:false};
    return null;
  }

  return{isSentenceWithThreeWords,normalizeRequest,score,nextStepItem};
});
