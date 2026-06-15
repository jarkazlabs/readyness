const test=require("node:test");
const assert=require("node:assert/strict");
const {isSentenceWithThreeWords,normalizeRequest,score,nextStepItem}=require("../js/core.js");

test("Readyness gewichtet Inputs und Entscheidungen gleich",()=>{
  const request={
    inputs:[{done:true},{done:false},{done:false}],
    decisions:[{decided:true}]
  };
  assert.equal(score(request),50);
});

test("Jeder offene Punkt verhindert 100 Prozent Readyness",()=>{
  const request={
    inputs:[{done:true}],
    decisions:[{decided:false}]
  };
  assert.equal(score(request),50);
});

test("Ein leeres Vorhaben startet bei null Prozent",()=>{
  assert.equal(score({inputs:[],decisions:[]}),0);
});

test("Eine markierte nächste Klärung hat Vorrang",()=>{
  const request={
    inputs:[{name:"Erster Input",done:false}],
    decisions:[{question:"Wichtige Entscheidung?",decided:false,next:true}]
  };
  const step=nextStepItem(request);
  assert.equal(step.type,"decision");
  assert.equal(step.marked,true);
});

test("Erledigte Markierungen werden übersprungen",()=>{
  const request={
    inputs:[{name:"Erledigt",done:true,next:true},{name:"Offen",done:false}],
    decisions:[]
  };
  const step=nextStepItem(request);
  assert.equal(step.item.name,"Offen");
  assert.equal(step.marked,false);
});

test("Entscheidungen benötigen mindestens einen vollständigen Satz",()=>{
  assert.equal(isSentenceWithThreeWords("Wir wählen Variante A."),true);
  assert.equal(isSentenceWithThreeWords("Variante A"),false);
});

test("Alte Vorhaben erhalten das neue Rollenmodell",()=>{
  const normalized=normalizeRequest({
    createdBy:"Miriam Lang",
    category:"Marketing",
    inputs:[],
    decisions:[]
  });
  assert.equal(normalized.responsible,"Miriam Lang");
  assert.equal(normalized.targetDepartment,"Marketing");
  assert.deepEqual(normalized.participants,["Miriam Lang"]);
});
