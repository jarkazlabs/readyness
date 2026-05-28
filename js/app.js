const STORAGE_KEY = "readyness-prototype-v11";
let state,currentId,editingRequest=false,activeInputIndex=null,activeDecisionIndex=null,deleteTarget=null;

const demo={requests:[{id:"REQ-2025-045",title:"Verpackung Rückleuchte",description:"Erstellung der Verpackung für die neue Rückleuchte – inklusive Druckdaten, Freigaben und Produkthandling.",createdBy:"Sascha Büchel",createdAt:"20. Mai 2025",category:"Verpackung",deadline:"2025-05-28",inputs:[
{name:"Produktbilder",done:false,owner:"Lukas H.",dept:"Produktdesign",desc:"Front-, Rückseite und 3/4-Ansicht",comments:["Lukas H.: Ich kläre, ob die 3/4-Ansicht bereits verfügbar ist."]},
{name:"Produktdaten / Spezifikationen",done:true,owner:"Anna K.",dept:"Vertrieb",desc:"Maße, Gewicht und Material",comments:["Anna K.: Artikeldaten wurden aus der aktuellen Liste übernommen."]},
{name:"Verpackungsbasis",done:false,owner:"Sascha Büchel",dept:"Marketing",desc:"Referenz oder bestehende Vorlage",comments:[]},
{name:"Freigabe Vertrieb",done:false,owner:"Thomas W.",dept:"Sales Lead",desc:"Vertrieb bestätigt Anforderungen",comments:[]},
{name:"Finale Produktentscheidung",done:false,owner:"Miriam L.",dept:"Produktmanagement",desc:"Einzelprodukt oder nur im Set?",comments:[]}
],decisions:[
{question:"Wird die Rückleuchte als Einzelprodukt oder nur im Set verkauft?",reason:"Diese Entscheidung beeinflusst Verpackung, POS-Placement und Stückzahlen.",owner:"Miriam L.",decided:false,decision:"",comments:[]},
{question:"Welche Verpackungsbasis soll verwendet werden?",reason:"Auswahl beeinflusst Material, Druckfläche und Stabilität.",owner:"Sascha Büchel",decided:false,decision:"",comments:[]}
],log:["Anna K. hat Produktdaten / Spezifikationen als vorhanden markiert.","Sascha Büchel hat einen Entscheidungspunkt erstellt."]}]};

function $(id){return document.getElementById(id)}
function save(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}
function load(){state=JSON.parse(localStorage.getItem(STORAGE_KEY)||"null")||structuredClone(demo);currentId=state.requests[0].id}
function current(){return state.requests.find(r=>r.id===currentId)}
function fmtDate(v){if(!v)return"—";return new Date(v+"T12:00:00").toLocaleDateString("de-DE",{day:"2-digit",month:"long",year:"numeric"})}
function initials(n){return(n||"?").split(" ").map(p=>p[0]).join("").slice(0,2).toUpperCase()}
function esc(s){return String(s||"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function toast(t){$("toast").textContent=t;$("toast").classList.add("show");setTimeout(()=>$("toast").classList.remove("show"),2200)}
function score(r){const total=r.inputs.length+r.decisions.length;if(!total)return 0;return Math.round(((r.inputs.filter(i=>i.done).length+r.decisions.filter(d=>d.decided).length)/total)*100)}
function ringColor(s){
  if(s>=100) return "#16a34a";
  if(s<25) return "#d92d20";
  if(s<50) return "#f97316";
  if(s<75) return "#f59e0b";
  return "#22c55e";
}

function hasValidInputComment(i){
  return (i.comments||[]).some(c=>{
    const parts=String(c).split(":");
    const text=parts.length>1?parts.slice(1).join(":").trim():String(c).trim();
    return text.length>=15;
  });
}


function commentsHtml(list){
  return (list||[]).map(c=>`<div class="comment">${esc(c)}</div>`).join("") || `<div class="empty-comments"><div><strong>Noch keine Kommentare.</strong><div class="small">Sobald ein Kommentar vorhanden ist, wird er hier angezeigt.</div></div></div>`;
}

function readinessText(r){const mi=r.inputs.filter(i=>!i.done).length, od=r.decisions.filter(d=>!d.decided).length;if(mi===0&&od===0)return"Alle wesentlichen Inputs und Entscheidungen sind geklärt. Der Request ist bereit für die Umsetzung.";return`Es fehlen noch ${mi} Input(s) und ${od} Entscheidungspunkt(e). Der Request sollte noch nicht in die Umsetzung gehen.`}
function nextStep(r){const i=r.inputs.find(x=>!x.done),d=r.decisions.find(x=>!x.decided);if(i)return`${i.name} von ${i.owner} klären`;if(d)return`Entscheidung von ${d.owner} einholen`;return"Bereit zur Umsetzung"}

function render(){const r=current();renderRequestList();$("requestId").textContent=r.id;$("title").textContent=r.title;$("description").textContent=r.description;$("createdBy").textContent=r.createdBy;$("createdAt").textContent=r.createdAt;$("category").textContent=r.category;$("deadline").textContent=fmtDate(r.deadline);let s=score(r);$("score").textContent=s+"%";$("ring").style.setProperty("--score",s+"%");$("ring").style.setProperty("--ring-color",ringColor(s));$("ring").classList.toggle("rainbow",s===100);$("readyState").textContent=s===100?"Bereit":"Nicht bereit";$("readyText").textContent=readinessText(r);$("nextStep").textContent=nextStep(r);$("inputCount").textContent=r.inputs.length;$("decisionCount").textContent=r.decisions.length;renderInputs(r);renderDecisions(r);renderTimeline(r);renderAside(r);save()}
function renderRequestList(){$("requestList").innerHTML=state.requests.map(r=>`<button class="request-item ${r.id===currentId?"active":""}" onclick="selectRequest('${r.id}')"><div class="request-title"><span class="txt">${esc(r.title)}</span><span class="badge ${score(r)===100?"green":"blue"}">${score(r)}%</span></div><div class="request-meta txt">${esc(r.category)} · ${fmtDate(r.deadline)}</div></button>`).join("")}
function renderInputs(r){$("inputsTable").innerHTML=`<div class="row header"><div>Input</div><div>Status</div><div>Verantwortlich</div><div>Bereich</div><div></div></div>${r.inputs.map((i,idx)=>`<div class="row click ${i.done?"is-done":""}" onclick="openInputDetail(${idx})"><div class="name">${esc(i.name)}<span class="small">${esc(i.desc)}</span></div><div><div class="checkbox-label"><span class="fancy-check ${i.done?"done":"open"}">${i.done?"✓":""}</span><span>${i.done?"Erledigt":"Offen"}</span></div></div><div class="person"><div class="avatar">${initials(i.owner)}</div><div><strong>${esc(i.owner)}</strong></div></div><div class="small">${esc(i.dept)}</div><div class="row-actions" onclick="event.stopPropagation()"><button class="kebab" onclick="toggleActionMenu('input',${idx})">⋮</button><div class="action-menu" id="input-menu-${idx}"><button onclick="openInputDetail(${idx})">Bearbeiten</button><button class="danger" onclick="askDeleteInput(${idx})">Löschen</button></div></div></div>`).join("")}`}
function renderDecisions(r){$("decisionList").innerHTML=r.decisions.map((d,idx)=>`<article class="decision ${d.decided?"is-done":""}" onclick="openDecisionDetail(${idx})"><div><span class="decision-check ${d.decided?"done":"open"}">${d.decided?"✓":""}</span></div><div><h3>${esc(d.question)}</h3><p>${esc(d.reason)}</p></div><div class="person"><div class="avatar">${initials(d.owner)}</div><div><strong>${esc(d.owner)}</strong></div></div><div><span class="badge ${d.decided?"green":"red"}">${d.decided?"Entschieden":"Offen"}</span></div><div class="row-actions" onclick="event.stopPropagation()"><button class="kebab" onclick="toggleActionMenu('decision',${idx})">⋮</button><div class="action-menu" id="decision-menu-${idx}"><button onclick="openDecisionDetail(${idx})">Bearbeiten</button><button class="danger" onclick="askDeleteDecision(${idx})">Löschen</button></div></div></article>`).join("")||`<p class="hint">Noch keine Entscheidungspunkte vorhanden.</p>`}
function renderTimeline(r){$("timeline").innerHTML=r.log.slice().reverse().map((e,idx)=>`<div class="event"><div><span class="dot"></span>${idx===0?"Aktuell":"Früher"}</div><div>${esc(e)}</div><div class="small">Readyness</div></div>`).join("")}
function renderAside(r){$("sideActivity").innerHTML=r.log.slice(-3).reverse().map(e=>`<div class="activity-item"><div class="avatar">R</div><div>${esc(e)}<div class="small">Gerade eben</div></div></div>`).join("");$("aiHint").textContent=readinessText(r);$("sideSteps").innerHTML=`<div>☐ ${esc(nextStep(r))}</div><div>☐ offene Inputs prüfen</div><div>☐ Entscheidungspunkte dokumentieren</div>`}
function selectRequest(id){currentId=id;render()}


function closeAllMenus(){
  document.querySelectorAll(".action-menu.open").forEach(menu=>menu.classList.remove("open"));
}
function toggleActionMenu(type,idx){
  closeAllMenus();
  const menu=$(type+"-menu-"+idx);
  if(menu) menu.classList.add("open");
}
document.addEventListener("click",(e)=>{
  if(!e.target.closest(".row-actions")) closeAllMenus();
});
function askDeleteInput(idx){
  closeAllMenus();
  const item=current().inputs[idx];
  deleteTarget={type:"input",idx};
  $("deleteTitle").textContent="Input löschen?";
  $("deleteCopy").innerHTML=`Möchtest du den Input <span class="confirm-name">„${esc(item.name)}“</span> wirklich löschen?<br>Diese Aktion kann nicht rückgängig gemacht werden.`;
  $("deleteModal").classList.add("open");
}
function askDeleteDecision(idx){
  closeAllMenus();
  const item=current().decisions[idx];
  deleteTarget={type:"decision",idx};
  $("deleteTitle").textContent="Entscheidungspunkt löschen?";
  $("deleteCopy").innerHTML=`Möchtest du den Entscheidungspunkt <span class="confirm-name">„${esc(item.question)}“</span> wirklich löschen?<br>Diese Aktion kann nicht rückgängig gemacht werden.`;
  $("deleteModal").classList.add("open");
}
function closeDeleteModal(){
  $("deleteModal").classList.remove("open");
  deleteTarget=null;
}
function confirmDelete(){
  if(!deleteTarget) return;
  const r=current();
  if(deleteTarget.type==="input"){
    const removed=r.inputs.splice(deleteTarget.idx,1)[0];
    r.log.push(`Input „${removed.name}“ wurde gelöscht.`);
  }
  if(deleteTarget.type==="decision"){
    const removed=r.decisions.splice(deleteTarget.idx,1)[0];
    r.log.push(`Entscheidungspunkt „${removed.question}“ wurde gelöscht.`);
  }
  closeDeleteModal();
  render();
  toast("Eintrag gelöscht");
}

function openInputCreate(){activeInputIndex=null;$("inputModalTitle").textContent="Input anlegen";$("inputModalSub").textContent="Der Ersteller definiert den organisatorischen Rahmen.";renderInputForm({name:"",owner:"",dept:"",desc:"",done:false,comments:[]});$("inputModal").classList.add("open")}
function openInputDetail(idx){activeInputIndex=idx;const i=current().inputs[idx];$("inputModalTitle").textContent=i.name;$("inputModalSub").textContent="Der Verantwortliche ergänzt Informationen, Kommentare oder relevante Kontextdateien.";renderInputDetail(i,idx);$("inputModal").classList.add("open")}
function renderInputForm(i){$("inputModalBody").innerHTML=`<div class="edit-grid"><div class="field"><label>Name</label><input id="inputName" value="${esc(i.name)}"></div><div class="field"><label>Verantwortlich</label><input id="inputOwner" value="${esc(i.owner)}"></div><div class="field"><label>Bereich</label><select id="inputDept"><option>Einkauf</option><option>GF</option><option>Vertrieb</option><option>Marketing</option><option>Produktion</option></select></div><div class="field"><label>Status</label><select id="inputDone"><option value="false">Offen</option><option value="true">Erledigt</option></select></div><div class="field full"><label>Beschreibung</label><textarea id="inputDesc">${esc(i.desc)}</textarea></div></div>`;$("inputModalActions").innerHTML=`<button class="secondary" onclick="closeInputModal()">Abbrechen</button><button class="primary" onclick="saveInput()">Input speichern</button>`;setTimeout(()=>{$("inputDone").value=String(i.done); if($("inputDept")) $("inputDept").value=i.dept||"Marketing"},0)}
function renderInputDetail(i,idx){$("inputModalBody").innerHTML=`<div class="drawer-meta-grid"><div class="drawer-meta-item"><span class="fancy-check ${i.done?"done":"open"}">${i.done?"✓":""}</span><div><label>Status</label><strong>${i.done?"Erledigt":"Offen"}</strong><div class="small">Kommentar mit mindestens 15 Zeichen nötig.</div></div></div><div class="drawer-meta-item"><div class="avatar">${initials(i.owner)}</div><div><label>Verantwortlich</label><strong>${esc(i.owner)}</strong><div class="small">${esc(i.dept||"Bereich nicht gesetzt")}</div></div></div><div class="drawer-meta-item"><div class="readyness-impact">▥</div><div><label>Readyness-Beitrag</label><strong>Hoch</strong><div class="small">Wichtiger Input</div></div></div></div><section class="drawer-card"><div class="drawer-card-title"><span class="mini-icon">◎</span><label>KONTEXT</label></div><label class="small" style="font-weight:850;color:#344054">Beschreibung</label><div class="drawer-text-box">${esc(i.desc||"Noch keine Beschreibung hinterlegt.")}</div><label class="small" style="display:block;font-weight:850;color:#344054;margin-top:16px">Wichtige Dokumente / Kontextdateien</label><div class="upload-zone"><div>↥ <button onclick="toast('Demo: Kontextdatei würde hochgeladen und ausgelesen')">Datei auswählen</button> <span>oder hierher ziehen</span><div class="small">Nur Dateien hochladen, aus denen organisatorischer Kontext gewonnen werden soll.</div></div></div></section><section class="drawer-card"><div class="drawer-card-title"><span class="mini-icon">☰</span><label>KOMMUNIKATION</label></div><label class="small" style="font-weight:850;color:#344054">Kommentar / Information ergänzen</label><div class="drawer-comment-form"><div><textarea class="drawer-textarea" id="inputComment" placeholder="z. B. Artikel-Nr., Hinweis, Status oder relevante Info"></textarea><div class="char-count">mind. 15 Zeichen</div></div><button class="secondary" onclick="addInputComment(${idx})">Kommentieren</button></div><label class="small" style="display:block;font-weight:850;color:#344054;margin-top:16px">Verlauf & Kommentare</label><div class="comment-box">${commentsHtml(i.comments)}</div></section><section class="drawer-card"><div class="drawer-card-title"><span class="mini-icon">✓</span><label>ABSCHLUSS</label></div><div class="drawer-done-row"><div><strong>${i.done?"Dieser Input ist erledigt.":"Input abschließen"}</strong><div class="small">Zum Erledigen ist ein Kommentar mit mindestens 15 Zeichen nötig.</div></div><button class="secondary" onclick="toggleInputDone(${idx})"><span class="fancy-check ${i.done?"done":"open"}">${i.done?"✓":""}</span><span>${i.done?"Wieder öffnen":"Als erledigt markieren"}</span></button></div></section>`;$("inputModalActions").innerHTML=`<button class="secondary" onclick="renderInputForm(current().inputs[${idx}])">Struktur bearbeiten</button><button class="primary" onclick="closeInputModal()">Schließen</button>`}
function closeInputModal(){$("inputModal").classList.remove("open")}
function saveInput(){const data={name:$("inputName").value,owner:$("inputOwner").value,dept:$("inputDept").value,desc:$("inputDesc").value,done:$("inputDone").value==="true",comments:activeInputIndex===null?[]:(current().inputs[activeInputIndex].comments||[])};if(!data.name.trim()||!data.owner.trim()){toast("Bitte Name und Verantwortlichen eintragen.");return}const r=current();if(activeInputIndex===null){r.inputs.push(data);r.log.push(`Input „${data.name}“ wurde angelegt.`)}else{r.inputs[activeInputIndex]=data;r.log.push(`Input „${data.name}“ wurde bearbeitet.`)}closeInputModal();render()}
function toggleInputDone(idx){const i=current().inputs[idx];if(!i.done && !hasValidInputComment(i)){toast("Bitte zuerst einen Kommentar mit mindestens 15 Zeichen ergänzen.");return}i.done=!i.done;current().log.push(`Input „${i.name}“ wurde als ${i.done?"erledigt":"offen"} markiert.`);render();openInputDetail(idx)}
function addInputComment(idx){const val=$("inputComment").value.trim();if(val.length<15){toast("Kommentar muss mindestens 15 Zeichen haben.");return}const i=current().inputs[idx];i.comments=i.comments||[];i.comments.push(`${i.owner}: ${val}`);current().log.push(`Kommentar zu Input „${i.name}“ hinzugefügt.`);render();openInputDetail(idx)}

function openDecisionCreate(){activeDecisionIndex=null;$("decisionModalTitle").textContent="Entscheidungspunkt anlegen";$("decisionModalSub").textContent="Eine Entscheidung braucht Frage, Begründung und Entscheider.";renderDecisionForm({question:"",reason:"",owner:"",decided:false,decision:"",comments:[]});$("decisionModal").classList.add("open")}
function openDecisionDetail(idx){activeDecisionIndex=idx;const d=current().decisions[idx];$("decisionModalTitle").textContent=d.question;$("decisionModalSub").textContent="Entscheider dokumentieren, was entschieden wurde und warum.";renderDecisionDetail(d,idx);$("decisionModal").classList.add("open")}
function renderDecisionForm(d){$("decisionModalBody").innerHTML=`<div class="field"><label>Was muss entschieden werden?</label><textarea id="decisionQuestion">${esc(d.question)}</textarea><span class="warn" id="questionWarn">Bitte formuliere eine vollständige Entscheidungsfrage.</span></div><div class="field"><label>Warum ist diese Entscheidung wichtig?</label><textarea id="decisionReason">${esc(d.reason)}</textarea><span class="warn" id="reasonWarn">Die Begründung wirkt noch zu kurz.</span></div><div class="edit-grid"><div class="field"><label>Entscheider</label><input id="decisionOwner" value="${esc(d.owner)}"></div><div class="field"><label>Status</label><select id="decisionDone"><option value="false">Offen</option><option value="true">Entschieden</option></select></div></div><div class="field"><label>Finale Entscheidung</label><textarea id="decisionText">${esc(d.decision||"")}</textarea></div>`;$("decisionModalActions").innerHTML=`<button class="secondary" onclick="closeDecisionModal()">Abbrechen</button><button class="primary" onclick="saveDecision()">Speichern</button>`;setTimeout(()=>{$("decisionDone").value=String(d.decided)},0)}
function renderDecisionDetail(d,idx){$("decisionModalBody").innerHTML=`<div class="drawer-meta-grid"><div class="drawer-meta-item"><span class="decision-check ${d.decided?"done":"open"}">${d.decided?"✓":""}</span><div><label>Status</label><strong>${d.decided?"Entschieden":"Offen"}</strong><div class="small">Finale Entscheidung dokumentieren.</div></div></div><div class="drawer-meta-item"><div class="avatar">${initials(d.owner)}</div><div><label>Entscheider</label><strong>${esc(d.owner)}</strong><div class="small">Entscheidungsverantwortung</div></div></div><div class="drawer-meta-item"><div class="readyness-impact">▥</div><div><label>Readyness-Beitrag</label><strong>Sehr hoch</strong><div class="small">Kritischer Entscheidungspunkt</div></div></div></div><section class="drawer-card"><div class="drawer-card-title"><span class="mini-icon">⚖</span><label>ENTSCHEIDUNG</label></div><label class="small" style="font-weight:850;color:#344054">Entscheidungsfrage</label><div class="drawer-text-box decision-question-box">${esc(d.question)}</div><label class="small" style="display:block;font-weight:850;color:#344054;margin-top:16px">Begründung / Kontext</label><div class="drawer-text-box">${esc(d.reason||"Noch keine Begründung hinterlegt.")}</div><label class="small" style="display:block;font-weight:850;color:#344054;margin-top:16px">Finale Entscheidung</label><textarea class="drawer-textarea" id="decisionResult" placeholder="Beschreibe die Entscheidung in vollständigen Sätzen.">${esc(d.decision||"")}</textarea></section><section class="drawer-card"><div class="drawer-card-title"><span class="mini-icon">☰</span><label>KOMMUNIKATION</label></div><label class="small" style="font-weight:850;color:#344054">Kommentar / Begründung zur Entscheidung</label><div class="drawer-comment-form"><div><textarea class="drawer-textarea" id="decisionComment" placeholder="Warum wurde so entschieden? Was sind die nächsten Schritte?"></textarea><div class="char-count">Kontext für spätere Nachvollziehbarkeit</div></div><button class="secondary" onclick="addDecisionComment(${idx})">Kommentieren</button></div><label class="small" style="display:block;font-weight:850;color:#344054;margin-top:16px">Verlauf & Kommentare</label><div class="comment-box">${commentsHtml(d.comments)}</div></section><section class="drawer-card"><div class="drawer-card-title"><span class="mini-icon">✓</span><label>ABSCHLUSS</label></div><div class="drawer-done-row"><div><strong>${d.decided?"Diese Entscheidung ist dokumentiert.":"Entscheidung abschließen"}</strong><div class="small">Eine finale Entscheidung schafft organisatorische Verbindlichkeit.</div></div><button class="secondary" onclick="toggleDecision(${idx})"><span class="decision-check ${d.decided?"done":"open"}">${d.decided?"✓":""}</span><span>${d.decided?"Wieder öffnen":"Als entschieden markieren"}</span></button></div></section>`;$("decisionModalActions").innerHTML=`<button class="secondary" onclick="renderDecisionForm(current().decisions[${idx}])">Struktur bearbeiten</button><button class="primary" onclick="saveDecisionResult(${idx})">Entscheidung speichern</button>`}
function closeDecisionModal(){$("decisionModal").classList.remove("open")}
function saveDecision(){const q=$("decisionQuestion").value.trim(),reason=$("decisionReason").value.trim();const qOk=q.split(/\s+/).length>=6&&q.endsWith("?"),rOk=reason.split(/\s+/).length>=8;$("questionWarn").classList.toggle("show",!qOk);$("reasonWarn").classList.toggle("show",!rOk);if(!qOk||!rOk)return;const data={question:q,reason,owner:$("decisionOwner").value||"Noch nicht zugewiesen",decided:$("decisionDone").value==="true",decision:$("decisionText").value,comments:activeDecisionIndex===null?[]:(current().decisions[activeDecisionIndex].comments||[])};const r=current();if(activeDecisionIndex===null){r.decisions.push(data);r.log.push(`Entscheidungspunkt „${q}“ wurde angelegt.`)}else{r.decisions[activeDecisionIndex]=data;r.log.push(`Entscheidungspunkt „${q}“ wurde bearbeitet.`)}closeDecisionModal();render()}
function saveDecisionResult(idx){const val=$("decisionResult").value.trim();if(val.split(/\s+/).length<6){toast("Bitte Entscheidung in einem vollständigen Satz formulieren.");return}const d=current().decisions[idx];d.decision=val;d.decided=true;current().log.push(`Entscheidung „${d.question}“ wurde dokumentiert.`);closeDecisionModal();render()}
function toggleDecision(idx){const d=current().decisions[idx];d.decided=!d.decided;if(d.decided&&!d.decision)d.decision="Die Entscheidung wurde getroffen und muss noch genauer dokumentiert werden.";current().log.push(`Entscheidungspunkt „${d.question}“ wurde als ${d.decided?"entschieden":"offen"} markiert.`);render();openDecisionDetail(idx)}
function addDecisionComment(idx){const val=$("decisionComment").value.trim();if(!val)return;const d=current().decisions[idx];d.comments=d.comments||[];d.comments.push(`${d.owner}: ${val}`);current().log.push(`Kommentar zu Entscheidungspunkt hinzugefügt.`);render();openDecisionDetail(idx)}

function openRequestModal(){editingRequest=false;$("requestModalTitle").textContent="Neue Anfrage";$("reqTitle").value="";$("reqCategory").value="Verpackung";$("reqCreatedBy").value="Sascha Büchel";$("reqDeadline").value="";$("reqDesc").value="";$("requestModal").classList.add("open")}
function editCurrent(){const r=current();editingRequest=true;$("requestModalTitle").textContent="Anfrage bearbeiten";$("reqTitle").value=r.title;$("reqCategory").value=r.category;$("reqCreatedBy").value=r.createdBy;$("reqDeadline").value=r.deadline;$("reqDesc").value=r.description;$("requestModal").classList.add("open")}
function closeRequestModal(){$("requestModal").classList.remove("open")}
function saveRequest(){if(!$("reqTitle").value.trim()){toast("Bitte Titel eintragen.");return}if(editingRequest){Object.assign(current(),{title:$("reqTitle").value,category:$("reqCategory").value,createdBy:$("reqCreatedBy").value,deadline:$("reqDeadline").value,description:$("reqDesc").value});current().log.push("Anfragedetails wurden bearbeitet.")}else{const id="REQ-"+new Date().getFullYear()+"-"+String(Math.floor(Math.random()*900)+100);state.requests.push({id,title:$("reqTitle").value,description:$("reqDesc").value,createdBy:$("reqCreatedBy").value,createdAt:new Date().toLocaleDateString("de-DE",{day:"2-digit",month:"long",year:"numeric"}),category:$("reqCategory").value,deadline:$("reqDeadline").value,inputs:[],decisions:[],log:["Request wurde erstellt."]});currentId=id}closeRequestModal();render()}
function completeNextStep(){const r=current();const inputIndex=r.inputs.findIndex(x=>!x.done);if(inputIndex>=0){const i=r.inputs[inputIndex];if(!hasValidInputComment(i)){toast("Input braucht zuerst einen Kommentar mit mindestens 15 Zeichen.");openInputDetail(inputIndex);return}i.done=true;r.log.push(`Input „${i.name}“ wurde erledigt.`);render();return}const d=r.decisions.find(x=>!x.decided);if(d){d.decided=true;if(!d.decision)d.decision="Die Entscheidung wurde getroffen und muss noch genauer dokumentiert werden.";r.log.push(`Entscheidungspunkt „${d.question}“ wurde als entschieden markiert.`);render();return}toast("Request ist bereits bereit.")}
function addLog(text){current().log.push(text);render()}
function toggleSidebar(){const a=$("aside"),b=$("drawerBackdrop");a.classList.add("open");b.classList.add("open")}
function closeSidebar(){const a=$("aside"),b=$("drawerBackdrop");a.classList.remove("open");b.classList.remove("open")}
function toggleDocumentation(){
  const body=$("documentationBody");
  const label=$("documentationToggleLabel");
  body.classList.toggle("open");
  label.textContent=body.classList.contains("open")?"Zuklappen ↑":"Aufklappen ↓";
}
function resetDemo(){localStorage.removeItem(STORAGE_KEY);load();render();toast("Demo zurückgesetzt")}
load();render();