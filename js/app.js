const STORAGE_KEY = "readyness-prototype-v21";
let state,currentId,editingRequest=false,activeInputIndex=null,activeDecisionIndex=null,deleteTarget=null;

const mockUsers=[
  {name:"Sascha Boss",role:"Marketing"},
  {name:"Anna Keller",role:"Vertrieb"},
  {name:"Lukas Hartmann",role:"Produktdesign"},
  {name:"Miriam Lang",role:"Produktmanagement"},
  {name:"Thomas Neumann",role:"Geschäftsführung"},
  {name:"Nora Weiss",role:"Einkauf"},
  {name:"Felix Brandt",role:"Produktion"}
];
function userOptions(selected){return mockUsers.map(u=>`<option value="${esc(u.name)}" ${u.name===selected?"selected":""}>${esc(u.name)} · ${esc(u.role)}</option>`).join("")}
function userRole(name){return (mockUsers.find(u=>u.name===name)||{}).role||"Nicht zugeordnet"}
function isSentenceWithThreeWords(text){const t=String(text||"").trim();return /[.!?]$/.test(t)&&t.split(/\s+/).filter(Boolean).length>=3}

const demo={requests:[{id:"REQ-2025-045",title:"Verpackung Rückleuchte",description:"Erstellung der Verpackung für die neue Rückleuchte – inklusive Druckdaten, Freigaben und Produkthandling.",createdBy:"Sascha Boss",createdAt:"20. Mai 2025",category:"Verpackung",deadline:"2025-05-28",inputs:[
{name:"Produktbilder",done:false,owner:"Lukas Hartmann",dept:"Produktdesign",desc:"Front-, Rückseite und 3/4-Ansicht",comments:["Lukas Hartmann: Ich kläre, ob die 3/4-Ansicht bereits verfügbar ist."]},
{name:"Produktdaten / Spezifikationen",done:true,owner:"Anna Keller",dept:"Vertrieb",desc:"Maße, Gewicht und Material",comments:["Anna Keller: Artikeldaten wurden aus der aktuellen Liste übernommen."]},
{name:"Verpackungsbasis",done:false,owner:"Sascha Boss",dept:"Marketing",desc:"Referenz oder bestehende Vorlage",comments:[]},
{name:"Freigabe Vertrieb",done:false,owner:"Thomas Neumann",dept:"Sales Lead",desc:"Vertrieb bestätigt Anforderungen",comments:[]},
{name:"Finale Produktentscheidung",done:false,owner:"Miriam Lang",dept:"Produktmanagement",desc:"Einzelprodukt oder nur im Set?",comments:[]}
],decisions:[
{question:"Wird die Rückleuchte als Einzelprodukt oder nur im Set verkauft?",reason:"Diese Entscheidung beeinflusst Verpackung, POS-Placement und Stückzahlen.",owner:"Miriam Lang",decided:false,decision:"",comments:[]},
{question:"Welche Verpackungsbasis soll verwendet werden?",reason:"Auswahl beeinflusst Material, Druckfläche und Stabilität.",owner:"Sascha Boss",decided:false,decision:"",comments:[]}
],log:["Anna Keller hat Produktdaten / Spezifikationen als vorhanden markiert.","Sascha Boss hat einen Entscheidungspunkt erstellt."]}]};

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
function requestStatusClass(s){
  if(s>=100) return "status-ready";
  if(s>=75) return "status-high";
  if(s>=35) return "status-mid";
  return "status-low";
}
function requestBadgeClass(s){
  if(s>=100) return "green";
  if(s>=75) return "green";
  if(s>=35) return "amber";
  return "red";
}
function renderRequestList(){$("requestList").innerHTML=state.requests.map(r=>{const s=score(r);return `<button class="request-item ${requestStatusClass(s)} ${r.id===currentId?"active":""}" onclick="selectRequest('${r.id}')"><div class="request-title"><span class="txt">${esc(r.title)}</span><span class="badge ${requestBadgeClass(s)}">${s}%</span></div><div class="request-meta txt">${esc(r.category)} · ${fmtDate(r.deadline)}</div></button>`}).join("")}
function renderInputs(r){$("inputsTable").innerHTML=`<div class="row header"><div>Input</div><div>Status</div><div>Verantwortlich</div><div>Bereich</div><div></div></div>${r.inputs.map((i,idx)=>`<div class="row click ${i.done?"is-done":""}" onclick="openInputDetail(${idx})"><div class="name">${esc(i.name)}<span class="small">${esc(i.desc)}</span></div><div><div class="checkbox-label"><span class="fancy-check ${i.done?"done":"open"}">${i.done?"✓":""}</span><span>${i.done?"Erledigt":"Offen"}</span></div></div><div class="person"><div class="avatar">${initials(i.owner)}</div><div><strong>${esc(i.owner)}</strong></div></div><div class="small">${esc(i.dept)}</div><div class="row-actions" onclick="event.stopPropagation()"><button class="kebab" onclick="toggleActionMenu('input',${idx})">⋮</button><div class="action-menu" id="input-menu-${idx}"><button onclick="openInputDetail(${idx})">Bearbeiten</button><button class="danger" onclick="askDeleteInput(${idx})">Löschen</button></div></div></div>`).join("")}`}
function renderDecisions(r){$("decisionList").innerHTML=r.decisions.map((d,idx)=>`<article class="decision ${d.decided?"is-done":""}" onclick="openDecisionDetail(${idx})"><div><span class="decision-check ${d.decided?"done":"open"}">${d.decided?"✓":""}</span></div><div><h3>${esc(d.question)}</h3><p>${esc(d.reason)}</p></div><div class="person"><div class="avatar">${initials(d.owner)}</div><div><strong>${esc(d.owner)}</strong></div></div><div><span class="badge ${d.decided?"green":"red"}">${d.decided?"Entschieden":"Offen"}</span></div><div class="row-actions" onclick="event.stopPropagation()"><button class="kebab" onclick="toggleActionMenu('decision',${idx})">⋮</button><div class="action-menu" id="decision-menu-${idx}"><button onclick="openDecisionDetail(${idx})">Bearbeiten</button><button class="danger" onclick="askDeleteDecision(${idx})">Löschen</button></div></div></article>`).join("")||`<p class="hint">Noch keine Entscheidungspunkte vorhanden.</p>`}
function renderTimeline(r){$("timeline").innerHTML=r.log.slice().reverse().map((e,idx)=>`<div class="event"><div><span class="dot"></span>${idx===0?"Aktuell":"Früher"}</div><div>${esc(e)}</div><div class="small">Readyness</div></div>`).join("")}
function renderAside(r){$("sideActivity").innerHTML=r.log.slice(-3).reverse().map(e=>`<div class="activity-item"><div class="avatar">R</div><div>${esc(e)}<div class="small">Gerade eben</div></div></div>`).join("");$("aiHint").textContent=readinessText(r);$("sideSteps").innerHTML=`<div>☐ ${esc(nextStep(r))}</div><div>☐ offene Inputs prüfen</div><div>☐ Entscheidungspunkte dokumentieren</div>`}
function selectRequest(id){currentId=id;render()}

function lockPageScroll(){document.body.classList.add("drawer-lock")}
function unlockPageScroll(){
  if(!$("inputModal")?.classList.contains("open") && !$("decisionModal")?.classList.contains("open") && !$("aside")?.classList.contains("open")){
    document.body.classList.remove("drawer-lock");
  }
}

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


function closeInputModal(){
  const modal=$("inputModal");
  if(modal) modal.classList.remove("open");
  activeInputIndex=null;
  unlockPageScroll();
}

function renderInputDetail(i,idx){
  const canComplete=hasValidInputComment(i);
  $("inputModalTitle").textContent=i.name||"Input";
  $("inputModalSub").textContent="Der Verantwortliche ergänzt Informationen, Kommentare oder relevante Kontextdateien.";
  $("inputModalBody").innerHTML=`
    <div class="drawer-meta-grid">
      <div class="drawer-meta-item">
        <span class="fancy-check ${i.done?"done":"open"}">${i.done?"✓":""}</span>
        <div><label>Status</label><strong>${i.done?"Erledigt":"Offen"}</strong><div class="small">${i.done?"Information liegt vor.":"Information wird noch benötigt."}</div></div>
      </div>
      <div class="drawer-meta-item">
        <div class="avatar">${initials(i.owner)}</div>
        <div><label>Verantwortlich</label><strong>${esc(i.owner||"Nicht zugewiesen")}</strong><div class="small">${esc(i.dept||userRole(i.owner)||"Bereich offen")}</div></div>
      </div>
      <div class="drawer-meta-item">
        <div class="readyness-impact">▥</div>
        <div><label>Readyness-Beitrag</label><strong>${i.done?"Geklärt":"Offen"}</strong><div class="small">Kontext für die Anfrage</div></div>
      </div>
    </div>

    <section class="drawer-card">
      <div class="drawer-card-title"><span class="mini-icon">◎</span><label>KONTEXT</label></div>
      <label class="small" style="font-weight:500;color:#344054">Benötigte Information</label>
      <div class="drawer-text-box">${esc(i.desc||"Noch keine Beschreibung hinterlegt.")}</div>
      <div class="upload-zone">
        <div><strong>Kontextdateien</strong><div class="small">Screenshots, PDFs oder Produktdaten können später hier ergänzt werden.</div><button type="button" onclick="toast('Upload ist im Prototyp noch nicht aktiv.')">Datei auswählen</button></div>
      </div>
    </section>

    <section class="drawer-card">
      <div class="drawer-card-title"><span class="mini-icon">☰</span><label>KOMMUNIKATION</label></div>
      <label class="small" style="font-weight:500;color:#344054">Kommentar / Kontext ergänzen</label>
      <div class="drawer-comment-form">
        <div><textarea class="drawer-textarea" id="inputComment" placeholder="Welche Information lieferst du? Was muss später nachvollziehbar sein?"></textarea><div class="char-count">Mindestens 15 Zeichen, wenn der Input erledigt werden soll.</div></div>
        <button type="button" class="secondary" onclick="addInputComment(${idx})">Kommentieren</button>
      </div>
      <label class="small" style="display:block;font-weight:500;color:#344054;margin-top:16px">Verlauf & Kommentare</label>
      <div class="comment-box">${commentsHtml(i.comments)}</div>
    </section>

    <section class="drawer-card">
      <div class="drawer-card-title"><span class="mini-icon">✓</span><label>ABSCHLUSS</label></div>
      <div class="drawer-done-row">
        <div><strong>${i.done?"Dieser Input ist geklärt.":"Input abschließen"}</strong><div class="small">Zum Abschließen ist mindestens ein Kommentar mit 15 Zeichen nötig.</div></div>
        <button type="button" class="secondary" onclick="toggleInputDone(${idx})" ${(!i.done&&!canComplete)?"title='Bitte zuerst einen Kommentar ergänzen'":""}><span class="fancy-check ${i.done?"done":"open"}">${i.done?"✓":""}</span><span>${i.done?"Wieder öffnen":"Als erledigt markieren"}</span></button>
      </div>
    </section>`;
  $("inputModalActions").innerHTML=`<button type="button" class="secondary" onclick="renderInputForm(current().inputs[${idx}])">Struktur bearbeiten</button><button type="button" class="primary" onclick="closeInputModal()">Schließen</button>`;
}

function openInputCreate(){activeInputIndex=null;$("inputModalTitle").textContent="Input anlegen";$("inputModalSub").textContent="Der Ersteller definiert den organisatorischen Rahmen.";renderInputForm({name:"",owner:"",dept:"",desc:"",done:false,comments:[]});$("inputModal").classList.add("open");lockPageScroll()}
function openInputDetail(idx){activeInputIndex=idx;const i=current().inputs[idx];$("inputModalTitle").textContent=i.name;$("inputModalSub").textContent="Der Verantwortliche ergänzt Informationen, Kommentare oder relevante Kontextdateien.";renderInputDetail(i,idx);$("inputModal").classList.add("open");lockPageScroll()}
function renderInputForm(i){
  const isCreate=activeInputIndex===null;
  $("inputModalTitle").textContent=isCreate?"Input anlegen":"Input bearbeiten";
  $("inputModalSub").textContent=isCreate?"Der Ersteller definiert den organisatorischen Rahmen.":"Der organisatorische Rahmen dieses Inputs.";
  $("inputModalBody").innerHTML=`
    <form id="inputCreateForm" class="drawer-form" novalidate>
      <section class="drawer-card form-card primary-form-card">
        <div class="drawer-card-title"><span class="mini-icon">▤</span><label>GRUNDLAGEN</label></div>
        <div class="refined-form-grid">
          <div class="field"><label for="inputName">Name</label><input id="inputName" name="inputName" autocomplete="off" placeholder="z. B. Verpackungsbasis" value="${esc(i.name)}"><p class="field-error" id="inputNameError" aria-live="polite"></p></div>
          <div class="field"><label for="inputOwner">Verantwortlich</label><select id="inputOwner" name="inputOwner">${userOptions(i.owner||"Sascha Boss")}</select></div>
          <div class="field"><label for="inputDept">Bereich</label><select id="inputDept" name="inputDept"><option>Einkauf</option><option>GF</option><option>Vertrieb</option><option>Marketing</option><option>Produktion</option></select></div>
          <div class="field"><label for="inputDone">Status</label><select id="inputDone" name="inputDone"><option value="false">Offen</option><option value="true">Erledigt</option></select></div>
        </div>
      </section>
      <section class="drawer-card form-card">
        <div class="drawer-card-title"><span class="mini-icon">◎</span><label>KONTEXT</label></div>
        <div class="field"><label for="inputDesc">Beschreibung</label><textarea class="compact-textarea" id="inputDesc" name="inputDesc" placeholder="Welche Information wird benötigt? Warum ist sie für die Klärung relevant?">${esc(i.desc)}</textarea></div>
        <p class="form-help">Ein Input ist keine Aufgabe. Er beschreibt eine fehlende Information, die eine andere Person liefern oder bestätigen muss.</p>
      </section>
    </form>`;
  $("inputModalActions").innerHTML=`<button type="button" class="secondary" id="cancelInputBtn">Abbrechen</button><button type="button" class="primary" id="saveInputBtn" onclick="saveInput(event)">Input speichern</button>`;

  if($("inputDone")) $("inputDone").value=String(i.done);
  if($("inputDept")) $("inputDept").value=i.dept||"Marketing";
  if($("cancelInputBtn")) $("cancelInputBtn").onclick=closeInputModal;
  if($("inputCreateForm")) $("inputCreateForm").onsubmit=saveInput;
  if($("inputName")){
    $("inputName").oninput=()=>{
      $("inputName").classList.remove("invalid");
      if($("inputNameError")) $("inputNameError").textContent="";
    };
  }
}
function saveInput(event){
  if(event){event.preventDefault();event.stopPropagation();}
  const nameEl=$("inputName"), ownerEl=$("inputOwner"), deptEl=$("inputDept"), descEl=$("inputDesc"), doneEl=$("inputDone");
  if(!nameEl||!ownerEl||!deptEl||!descEl||!doneEl){toast("Das Input-Formular ist nicht vollständig geladen.");return false}
  const existingComments=activeInputIndex===null?[]:((current().inputs[activeInputIndex]||{}).comments||[]);
  const data={
    name:nameEl.value.trim(),
    owner:ownerEl.value.trim()||"Sascha Boss",
    dept:deptEl.value.trim()||"Marketing",
    desc:descEl.value.trim(),
    done:doneEl.value==="true",
    comments:existingComments
  };
  if(!data.name){
    nameEl.classList.add("invalid");
    if($("inputNameError")) $("inputNameError").textContent="Bitte einen Namen für den Input eintragen.";
    toast("Bitte einen Namen für den Input eintragen.");
    nameEl.focus();
    return false
  }
  if(data.done&&!hasValidInputComment(data)){toast("Zum Erledigen ist mindestens ein Kommentar mit 15 Zeichen nötig.");doneEl.focus();return false}
  const r=current();
  if(activeInputIndex===null){
    r.inputs.push(data);
    r.log.push(`Input „${data.name}“ wurde angelegt.`);
  }else{
    r.inputs[activeInputIndex]=data;
    r.log.push(`Input „${data.name}“ wurde bearbeitet.`);
  }
  closeInputModal();
  render();
  toast("Input gespeichert");
  return false
}
function toggleInputDone(idx){const i=current().inputs[idx];if(!i.done && !hasValidInputComment(i)){toast("Bitte zuerst einen Kommentar mit mindestens 15 Zeichen ergänzen.");return}i.done=!i.done;current().log.push(`Input „${i.name}“ wurde als ${i.done?"erledigt":"offen"} markiert.`);render();openInputDetail(idx)}
function addInputComment(idx){const val=$("inputComment").value.trim();if(val.length<15){toast("Kommentar muss mindestens 15 Zeichen haben.");return}const i=current().inputs[idx];i.comments=i.comments||[];i.comments.push(`${i.owner}: ${val}`);current().log.push(`Kommentar zu Input „${i.name}“ hinzugefügt.`);render();openInputDetail(idx)}

function openDecisionCreate(){activeDecisionIndex=null;$("decisionModalTitle").textContent="Entscheidungspunkt anlegen";$("decisionModalSub").textContent="Eine Entscheidung braucht Frage, Begründung und Entscheider.";renderDecisionForm({question:"",reason:"",owner:"",decided:false,decision:"",comments:[]});$("decisionModal").classList.add("open");lockPageScroll()}
function openDecisionDetail(idx){activeDecisionIndex=idx;const d=current().decisions[idx];$("decisionModalTitle").textContent=d.question;$("decisionModalSub").textContent="Entscheider dokumentieren, was entschieden wurde und warum.";renderDecisionDetail(d,idx);$("decisionModal").classList.add("open");lockPageScroll()}
function renderDecisionForm(d){
  $("decisionModalBody").innerHTML=`
    <section class="drawer-card form-card decision-form-card">
      <div class="drawer-card-title"><span class="mini-icon">⚖</span><label>ENTSCHEIDUNG</label></div>
      <div class="field"><label>Was muss entschieden werden?</label><textarea class="compact-textarea" id="decisionQuestion" placeholder="Formuliere die Entscheidungsfrage klar und konkret.">${esc(d.question)}</textarea><span class="warn" id="questionWarn">Bitte formuliere eine vollständige Entscheidungsfrage.</span></div>
      <div class="field"><label>Warum ist diese Entscheidung wichtig?</label><textarea class="compact-textarea" id="decisionReason" placeholder="Welche Auswirkungen hat diese Entscheidung auf Umsetzung, Freigabe oder Verantwortung?">${esc(d.reason)}</textarea><span class="warn" id="reasonWarn">Die Begründung wirkt noch zu kurz.</span></div>
      <div class="refined-form-grid small-grid">
        <div class="field"><label>Entscheider</label><select id="decisionOwner">${userOptions(d.owner||"Thomas Neumann")}</select></div>
        <div class="field"><label>Status</label><select id="decisionDone"><option value="false">Offen</option><option value="true">Entschieden</option></select></div>
      </div>
      <div class="field"><label>Finale Entscheidung</label><textarea class="compact-textarea" id="decisionText" placeholder="Mindestens ein vollständiger Satz mit drei Wörtern.">${esc(d.decision||"")}</textarea><span class="warn" id="decisionTextWarn">Bitte mindestens einen vollständigen Satz mit drei Wörtern formulieren.</span></div>
    </section>`;
  $("decisionModalActions").innerHTML=`<button class="secondary" onclick="closeDecisionModal()">Abbrechen</button><button class="primary" onclick="saveDecision()">Speichern</button>`;
  setTimeout(()=>{
    $("decisionDone").value=String(d.decided);
    bindDecisionFormValidation();
    validateDecisionForm(false);
  },0)
}
function validateDecisionForm(showWarnings=true){
  const questionEl=$("decisionQuestion"), reasonEl=$("decisionReason"), textEl=$("decisionText"), doneEl=$("decisionDone");
  if(!questionEl||!reasonEl||!textEl||!doneEl)return true;
  const q=questionEl.value.trim();
  const reason=reasonEl.value.trim();
  const decisionText=textEl.value.trim();
  const decided=doneEl.value==="true";
  const qOk=q.split(/\s+/).filter(Boolean).length>=6&&q.endsWith("?");
  const rOk=reason.split(/\s+/).filter(Boolean).length>=8;
  const decisionOk=!decided||isSentenceWithThreeWords(decisionText);
  [[questionEl,"questionWarn",qOk],[reasonEl,"reasonWarn",rOk],[textEl,"decisionTextWarn",decisionOk]].forEach(([el,warnId,ok])=>{
    const warn=$(warnId);
    el.classList.toggle("invalid",showWarnings&&!ok);
    if(warn)warn.classList.toggle("show",showWarnings&&!ok);
  });
  return qOk&&rOk&&decisionOk;
}
function bindDecisionFormValidation(){
  ["decisionQuestion","decisionReason","decisionText"].forEach(id=>{
    const el=$(id);
    if(el)el.addEventListener("input",()=>validateDecisionForm(true));
  });
  const doneEl=$("decisionDone");
  if(doneEl)doneEl.addEventListener("change",()=>validateDecisionForm(true));
}
function renderDecisionDetail(d,idx){$("decisionModalBody").innerHTML=`<div class="drawer-meta-grid"><div class="drawer-meta-item"><span class="decision-check ${d.decided?"done":"open"}">${d.decided?"✓":""}</span><div><label>Status</label><strong>${d.decided?"Entschieden":"Offen"}</strong><div class="small">Finale Entscheidung dokumentieren.</div></div></div><div class="drawer-meta-item"><div class="avatar">${initials(d.owner)}</div><div><label>Entscheider</label><strong>${esc(d.owner)}</strong><div class="small">${esc(userRole(d.owner)||"Entscheidungsverantwortung")}</div></div></div><div class="drawer-meta-item"><div class="readyness-impact">▥</div><div><label>Readyness-Beitrag</label><strong>Sehr hoch</strong><div class="small">Kritischer Entscheidungspunkt</div></div></div></div><section class="drawer-card"><div class="drawer-card-title"><span class="mini-icon">⚖</span><label>ENTSCHEIDUNG</label></div><label class="small" style="font-weight:500;color:#344054">Entscheidungsfrage</label><div class="drawer-text-box decision-question-box">${esc(d.question)}</div><label class="small" style="display:block;font-weight:500;color:#344054;margin-top:16px">Begründung / Kontext</label><div class="drawer-text-box">${esc(d.reason||"Noch keine Begründung hinterlegt.")}</div><label class="small" style="display:block;font-weight:500;color:#344054;margin-top:16px">Finale Entscheidung</label><textarea class="drawer-textarea" id="decisionResult" placeholder="Beschreibe die Entscheidung in vollständigen Sätzen.">${esc(d.decision||"")}</textarea></section><section class="drawer-card"><div class="drawer-card-title"><span class="mini-icon">☰</span><label>KOMMUNIKATION</label></div><label class="small" style="font-weight:500;color:#344054">Kommentar / Begründung zur Entscheidung</label><div class="drawer-comment-form"><div><textarea class="drawer-textarea" id="decisionComment" placeholder="Warum wurde so entschieden? Was sind die nächsten Schritte?"></textarea><div class="char-count">Kontext für spätere Nachvollziehbarkeit</div></div><button class="secondary" onclick="addDecisionComment(${idx})">Kommentieren</button></div><label class="small" style="display:block;font-weight:500;color:#344054;margin-top:16px">Verlauf & Kommentare</label><div class="comment-box">${commentsHtml(d.comments)}</div></section><section class="drawer-card"><div class="drawer-card-title"><span class="mini-icon">✓</span><label>ABSCHLUSS</label></div><div class="drawer-done-row"><div><strong>${d.decided?"Diese Entscheidung ist dokumentiert.":"Entscheidung abschließen"}</strong><div class="small">Eine finale Entscheidung schafft organisatorische Verbindlichkeit.</div></div><button class="secondary" onclick="toggleDecision(${idx})"><span class="decision-check ${d.decided?"done":"open"}">${d.decided?"✓":""}</span><span>${d.decided?"Wieder öffnen":"Als entschieden markieren"}</span></button></div></section>`;$("decisionModalActions").innerHTML=`<button class="secondary" onclick="renderDecisionForm(current().decisions[${idx}])">Struktur bearbeiten</button><button class="primary" onclick="saveDecisionResult(${idx})">Entscheidung speichern</button>`}
function closeDecisionModal(){$("decisionModal").classList.remove("open");unlockPageScroll()}
function saveDecision(){
  if(!validateDecisionForm(true))return;
  const q=$("decisionQuestion").value.trim(),reason=$("decisionReason").value.trim(),decisionText=$("decisionText").value.trim();
  const decided=$("decisionDone").value==="true";
  const data={
    question:q,
    reason,
    owner:$("decisionOwner").value||"Noch nicht zugewiesen",
    decided,
    decision:decided?decisionText:"",
    comments:activeDecisionIndex===null?[]:(current().decisions[activeDecisionIndex].comments||[])
  };
  const r=current();
  if(activeDecisionIndex===null){r.decisions.push(data);r.log.push(`Entscheidungspunkt „${q}“ wurde angelegt.`)}else{r.decisions[activeDecisionIndex]=data;r.log.push(`Entscheidungspunkt „${q}“ wurde bearbeitet.`)}
  closeDecisionModal();render()
}
function saveDecisionResult(idx){
  const val=$("decisionResult").value.trim();
  if(!isSentenceWithThreeWords(val)){toast("Bitte mindestens einen vollständigen Satz mit drei Wörtern formulieren.");return}
  const d=current().decisions[idx];
  d.decision=val;
  d.decided=true;
  current().log.push(`Entscheidung „${d.question}“ wurde dokumentiert.`);
  closeDecisionModal();render()
}
function toggleDecision(idx){
  const d=current().decisions[idx];
  if(d.decided){
    d.decided=false;
    d.decision="";
    current().log.push(`Entscheidungspunkt „${d.question}“ wurde wieder geöffnet.`);
    render();openDecisionDetail(idx);
    return;
  }
  const resultEl=$("decisionResult");
  const val=resultEl?resultEl.value.trim():(d.decision||"").trim();
  if(!isSentenceWithThreeWords(val)){
    if(resultEl){resultEl.classList.add("invalid");resultEl.focus()}
    toast("Bitte begründe die Entscheidung mit mindestens einem vollständigen Satz aus drei Wörtern.");
    return;
  }
  d.decision=val;
  d.decided=true;
  current().log.push(`Entscheidungspunkt „${d.question}“ wurde als entschieden markiert.`);
  render();openDecisionDetail(idx)
}
function addDecisionComment(idx){const val=$("decisionComment").value.trim();if(!isSentenceWithThreeWords(val)){toast("Bitte mindestens einen vollständigen Satz mit drei Wörtern formulieren.");return;}const d=current().decisions[idx];d.comments=d.comments||[];d.comments.push(`${d.owner}: ${val}`);current().log.push(`Kommentar zu Entscheidungspunkt hinzugefügt.`);render();openDecisionDetail(idx)}

function openRequestModal(){editingRequest=false;$("requestModalTitle").textContent="Neue Anfrage";$("reqTitle").value="";$("reqCategory").value="Verpackung";$("reqCreatedBy").value="Sascha Boss";$("reqDeadline").value="";$("reqDesc").value="";$("requestModal").classList.add("open")}
function editCurrent(){const r=current();editingRequest=true;$("requestModalTitle").textContent="Anfrage bearbeiten";$("reqTitle").value=r.title;$("reqCategory").value=r.category;$("reqCreatedBy").value=r.createdBy;$("reqDeadline").value=r.deadline;$("reqDesc").value=r.description;$("requestModal").classList.add("open")}
function closeRequestModal(){$("requestModal").classList.remove("open")}
function saveRequest(){if(!$("reqTitle").value.trim()){toast("Bitte Titel eintragen.");return}if(editingRequest){Object.assign(current(),{title:$("reqTitle").value,category:$("reqCategory").value,createdBy:$("reqCreatedBy").value,deadline:$("reqDeadline").value,description:$("reqDesc").value});current().log.push("Anfragedetails wurden bearbeitet.")}else{const id="REQ-"+new Date().getFullYear()+"-"+String(Math.floor(Math.random()*900)+100);state.requests.push({id,title:$("reqTitle").value,description:$("reqDesc").value,createdBy:$("reqCreatedBy").value,createdAt:new Date().toLocaleDateString("de-DE",{day:"2-digit",month:"long",year:"numeric"}),category:$("reqCategory").value,deadline:$("reqDeadline").value,inputs:[],decisions:[],log:["Request wurde erstellt."]});currentId=id}closeRequestModal();render()}
function completeNextStep(){const r=current();const inputIndex=r.inputs.findIndex(x=>!x.done);if(inputIndex>=0){const i=r.inputs[inputIndex];if(!hasValidInputComment(i)){toast("Input braucht zuerst einen Kommentar mit mindestens 15 Zeichen.");openInputDetail(inputIndex);return}i.done=true;r.log.push(`Input „${i.name}“ wurde erledigt.`);render();return}const decisionIndex=r.decisions.findIndex(x=>!x.decided);if(decisionIndex>=0){toast("Entscheidungen brauchen zuerst eine begründete Dokumentation.");openDecisionDetail(decisionIndex);return}toast("Request ist bereits bereit.")}
function addLog(text){current().log.push(text);render()}
function toggleSidebar(){const a=$("aside"),b=$("drawerBackdrop");a.classList.add("open");b.classList.add("open");lockPageScroll()}
function closeSidebar(){const a=$("aside"),b=$("drawerBackdrop");a.classList.remove("open");b.classList.remove("open");unlockPageScroll()}
function toggleDocumentation(){
  const body=$("documentationBody");
  const label=$("documentationToggleLabel");
  body.classList.toggle("open");
  label.textContent=body.classList.contains("open")?"Zuklappen ↑":"Aufklappen ↓";
}
function resetDemo(){localStorage.removeItem(STORAGE_KEY);load();render();toast("Demo zurückgesetzt")}
document.addEventListener("input",(event)=>{
  if(event.target&&event.target.id==="decisionResult"&&isSentenceWithThreeWords(event.target.value.trim())){
    event.target.classList.remove("invalid");
  }
});

load();render();