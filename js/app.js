const STORAGE_KEY = "readyness-prototype-v30";
let state,currentId,editingRequest=false,activeInputIndex=null,activeDecisionIndex=null,deleteTarget=null,pendingInputAction=null;
const {isSentenceWithThreeWords,normalizeRequest,score,nextStepItem}=ReadynessCore;

const mockUsers=[
  {name:"Sascha Boss",role:"Marketing",department:"Marketing"},
  {name:"Anna Keller",role:"Vertrieb",department:"Vertrieb"},
  {name:"Lukas Hartmann",role:"Produktdesign",department:"Produktmanagement"},
  {name:"Miriam Lang",role:"Projektmanagement",department:"Produktmanagement"},
  {name:"Thomas Neumann",role:"Geschäftsführung",department:"Geschäftsführung"},
  {name:"Nora Weiss",role:"Einkauf",department:"Einkauf"},
  {name:"Felix Brandt",role:"Produktion",department:"Produktion"}
];
const departments=["Marketing","Produktmanagement","Vertrieb","Einkauf","Produktion","Geschäftsführung"];
function userOptions(selected){return mockUsers.map(u=>`<option value="${esc(u.name)}" ${u.name===selected?"selected":""}>${esc(u.name)} · ${esc(u.role)}</option>`).join("")}
function userRole(name){return (mockUsers.find(u=>u.name===name)||{}).role||"Nicht zugeordnet"}
function departmentOptions(selected){return departments.map(d=>`<option value="${esc(d)}" ${d===selected?"selected":""}>${esc(d)}</option>`).join("")}
const demo={requests:[{id:"VOR-2025-045",title:"Verpackung E-Bike-Leuchte",description:"Eine verkaufsfähige Verpackung für die neue E-Bike-Leuchte erstellen – inklusive Druckdaten, Freigaben und Produkthandling.",createdBy:"Miriam Lang",createdAt:"20. Mai 2025",responsible:"Sascha Boss",targetDepartment:"Marketing",participants:["Miriam Lang","Sascha Boss","Lukas Hartmann","Anna Keller","Thomas Neumann"],category:"Verpackung",deadline:"2025-05-28",inputs:[
{name:"Produktbilder",done:false,next:true,owner:"Lukas Hartmann",dept:"Produktmanagement",desc:"Front-, Rückseite und 3/4-Ansicht",comments:["Lukas Hartmann: Ich kläre, ob die 3/4-Ansicht bereits verfügbar ist."]},
{name:"Produktdaten / Spezifikationen",done:true,owner:"Anna Keller",dept:"Vertrieb",desc:"Maße, Gewicht und Material",comments:["Anna Keller: Artikeldaten wurden aus der aktuellen Liste übernommen."]},
{name:"Verpackungsbasis",done:false,owner:"Sascha Boss",dept:"Marketing",desc:"Referenz oder bestehende Vorlage",comments:[]},
{name:"Freigabe Vertrieb",done:false,owner:"Thomas Neumann",dept:"Geschäftsführung",desc:"Vertrieb bestätigt Anforderungen",comments:[]},
{name:"Finale Produktentscheidung",done:false,owner:"Miriam Lang",dept:"Produktmanagement",desc:"Einzelprodukt oder nur im Set?",comments:[]}
],decisions:[
{question:"Wird die Rückleuchte als Einzelprodukt oder nur im Set verkauft?",reason:"Diese Entscheidung beeinflusst Verpackung, POS-Placement und Stückzahlen.",owner:"Miriam Lang",decided:false,decision:"",comments:[]},
{question:"Welche Verpackungsbasis soll verwendet werden?",reason:"Auswahl beeinflusst Material, Druckfläche und Stabilität.",owner:"Sascha Boss",decided:false,decision:"",comments:[]}
],log:[
  {user:"Anna Keller",action:"hat den Input freigegeben",object:"Produktdaten / Spezifikationen",time:"20. Mai 2025",context:"Artikeldaten wurden aus der aktuellen Liste übernommen."},
  {user:"Sascha Boss",action:"hat einen Entscheidungspunkt erstellt",object:"Welche Verpackungsbasis soll verwendet werden?",time:"20. Mai 2025",context:""}
]}]};

function $(id){return document.getElementById(id)}
function save(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}
function load(){
  state=JSON.parse(localStorage.getItem(STORAGE_KEY)||"null")||structuredClone(demo);
  state.requests=(state.requests||[]).map(request=>normalizeRequest(request,currentUser()));
  currentId=state.requests[0].id;
}
function current(){return state.requests.find(r=>r.id===currentId)}
function fmtDate(v){if(!v)return"—";return new Date(v+"T12:00:00").toLocaleDateString("de-DE",{day:"2-digit",month:"long",year:"numeric"})}
function initials(n){return(n||"?").split(" ").map(p=>p[0]).join("").slice(0,2).toUpperCase()}
function esc(s){return String(s||"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function toast(t){$("toast").textContent=t;$("toast").classList.add("show");setTimeout(()=>$("toast").classList.remove("show"),2200)}
function currentUser(){return "Sascha Boss"}
function enterApp(){
  document.body.classList.add("app-mode");
  history.replaceState(null,"","#app");
  window.scrollTo({top:0,behavior:"smooth"});
}
function showLanding(){
  closeInputModal();
  closeDecisionModal();
  closeSidebar();
  closeRequestModal();
  closeAdminModal();
  closeDeleteModal();
  document.body.classList.remove("app-mode");
  history.replaceState(null,"",location.pathname);
  window.scrollTo({top:0,behavior:"smooth"});
}
function timeNow(){return new Date().toLocaleString("de-DE",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"})}
function historyEntry(user,action,object,context=""){return {user,action,object,time:timeNow(),context}}
function addHistory(action,object,context="",user=currentUser()){current().log.push(historyEntry(user,action,object,context))}
function formatHistoryEntry(entry){
  if(typeof entry==="string")return {user:"Readyness",text:entry,time:"",context:""};
  const obj=entry.object?` „${entry.object}“`:"";
  return {user:entry.user||"Readyness",text:`${entry.user||"Readyness"} ${entry.action||"hat eine Aktion durchgeführt"}${obj}.`,time:entry.time||"",context:entry.context||""};
}

function ringColor(s){
  if(s>=100) return "#34a86f";
  if(s<25) return "#c02f66";
  if(s<50) return "#f58220";
  if(s<75) return "#b34964";
  return "#7f529c";
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

function missingCounts(r){
  const openInputs=(r.inputs||[]).filter(i=>!i.done).length;
  const openDecisions=(r.decisions||[]).filter(d=>!d.decided).length;
  const total=(r.inputs||[]).length+(r.decisions||[]).length;
  const completed=total-openInputs-openDecisions;
  return {openInputs,openDecisions,total,completed};
}
function readinessText(r){
  const m=missingCounts(r);
  if(!m.total)return"Dieses Vorhaben braucht zuerst Inputs oder Entscheidungspunkte, damit Readyness berechnet werden kann.";
  if(m.openInputs===0&&m.openDecisions===0)return"Alle bekannten Inputs und Entscheidungen sind geklärt. Das Vorhaben ist bereit.";
  return `${m.completed} von ${m.total} Klärungspunkten sind abgeschlossen. Offen sind noch ${m.openInputs} Input(s) und ${m.openDecisions} Entscheidungspunkt(e).`;
}
function nextStepLabel(step){
  if(!step)return"Alles Wesentliche ist geklärt";
  return step.type==="input"?`${step.item.name} mit ${step.item.owner} klären`:`${step.item.question} dokumentieren`;
}
function nextStepReason(step){
  if(!step)return"Readyness ist erreicht. Neue Punkte sollten nur ergänzt werden, wenn sich der organisatorische Rahmen ändert.";
  if(step.marked)return"Dieser Punkt wurde bewusst als nächste Klärung markiert und hat deshalb Vorrang.";
  return step.type==="input"?"Der erste offene Input blockiert die nächste belastbare Einschätzung.":"Die erste offene Entscheidung verhindert, dass das Vorhaben als bereit gilt.";
}
function statusLabel(r){
  const s=score(r);
  return s===100?"Bereit":s>=75?"Fast bereit":s>0?"In Klärung":"Nicht bereit";
}

function render(){
  const r=current();
  const s=score(r);
  const m=missingCounts(r);
  const step=nextStepItem(r);
  renderOverview();
  renderRequestList();
  $("requestId").textContent=r.id;
  $("title").textContent=r.title;
  $("description").textContent=r.description;
  $("createdBy").textContent=r.createdBy;
  $("createdAt").textContent=r.createdAt;
  $("responsible").textContent=r.responsible;
  $("targetDepartment").textContent=r.targetDepartment;
  $("deadline").textContent=fmtDate(r.deadline);
  $("score").textContent=s+"%";
  $("ring").style.setProperty("--score",s+"%");
  $("ring").style.setProperty("--ring-color",ringColor(s));
  $("ring").classList.toggle("rainbow",s===100);
  $("readyState").textContent=statusLabel(r);
  $("readyText").textContent=readinessText(r);
  $("readinessFacts").innerHTML=`<span>${m.openInputs} offene Inputs</span><span>${m.openDecisions} offene Entscheidungen</span><span>${m.completed}/${m.total||0} geklärt</span>`;
  $("nextStep").textContent=nextStepLabel(step);
  $("nextStepReason").textContent=nextStepReason(step);
  $("inputCount").textContent=r.inputs.length;
  $("decisionCount").textContent=r.decisions.length;
  renderInputs(r);
  renderDecisions(r);
  renderTimeline(r);
  renderAside(r);
  save()
}
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
function renderOverview(){
  const requests=state.requests||[];
  const active=current();
  const ready=requests.filter(r=>score(r)===100).length;
  const openInputs=requests.reduce((sum,r)=>sum+missingCounts(r).openInputs,0);
  const openDecisions=requests.reduce((sum,r)=>sum+missingCounts(r).openDecisions,0);
  const focus=nextStepItem(active);
  $("overviewGrid").innerHTML=`
    <article class="overview-card">
      <span>Aktive Vorhaben</span>
      <strong>${requests.length}</strong>
      <p>${ready} davon sind bereit. ${requests.length-ready} brauchen noch Klärung.</p>
    </article>
    <article class="overview-card">
      <span>Offene Klärungspunkte</span>
      <strong>${openInputs+openDecisions}</strong>
      <p>${openInputs} Inputs und ${openDecisions} Entscheidungen sind über alle Vorhaben offen.</p>
    </article>
    <article class="overview-card focus">
      <span>Nächster sinnvoller Schritt</span>
      <strong>${esc(nextStepLabel(focus))}</strong>
      <p>${esc(nextStepReason(focus))}</p>
      <button class="secondary" onclick="completeNextStep()">Jetzt klären</button>
    </article>`;
}
function renderRequestList(){$("requestList").innerHTML=state.requests.map(r=>{const s=score(r);return `<button class="request-item ${requestStatusClass(s)} ${r.id===currentId?"active":""}" onclick="selectRequest('${r.id}')"><div class="request-title"><span class="txt">${esc(r.title)}</span><span class="badge ${requestBadgeClass(s)}">${s}%</span></div><div class="request-meta txt">${esc(r.targetDepartment)} · ${fmtDate(r.deadline)}</div></button>`}).join("")}
function emptyState(kind){
  const isInput=kind==="input";
  return `<div class="empty-state"><strong>${isInput?"Noch keine Inputs definiert.":"Noch keine Entscheidungen definiert."}</strong><p>${isInput?"Starte mit den Informationen, die vor Umsetzung wirklich fehlen.":"Halte offene Richtungsfragen fest, bevor sie später implizit entschieden werden."}</p><button class="secondary" onclick="${isInput?"openInputCreate()":"openDecisionCreate()"}">${isInput?"＋ Input hinzufügen":"＋ Entscheidungspunkt hinzufügen"}</button></div>`;
}
function renderInputs(r){
  $("inputsTable").innerHTML=`<div class="row header clarity-row"><div>Klärungspunkt</div><div>Status</div><div>Verantwortlich</div><div>Bereich</div><div></div></div>${r.inputs.length?r.inputs.map((i,idx)=>`<div class="row click clarity-row ${i.done?"is-done":""} ${i.next&&!i.done?"is-next":""}" onclick="openInputDetail(${idx})"><div class="name">${i.next&&!i.done?`<span class="next-marker">Als Nächstes</span>`:""}${esc(i.name)}<span class="small">${esc(i.desc)}</span></div><div><div class="checkbox-label"><span class="fancy-check ${i.done?"done":"open"}">${i.done?"✓":""}</span><span>${i.done?"Geklärt":"Offen"}</span></div></div><div class="person"><div class="avatar">${initials(i.owner)}</div><div><strong>${esc(i.owner)}</strong><div class="small">${esc(userRole(i.owner))}</div></div></div><div class="small">${esc(i.dept)}</div><div class="row-actions" onclick="event.stopPropagation()"><button class="kebab" onclick="toggleActionMenu('input',${idx})">⋮</button><div class="action-menu" id="input-menu-${idx}"><button onclick="openInputDetail(${idx})">Bearbeiten</button>${i.done?"":`<button onclick="setNextItem('input',${idx})">${i.next?"Markierung entfernen":"Als Nächstes markieren"}</button>`}<button class="danger" onclick="askDeleteInput(${idx})">Löschen</button></div></div></div>`).join(""):emptyState("input")}`;
}
function renderDecisions(r){
  $("decisionList").innerHTML=`<div class="row header clarity-row decision-row"><div>Klärungspunkt</div><div>Status</div><div>Verantwortlich</div><div>Ergebnis</div><div></div></div>${r.decisions.length?r.decisions.map((d,idx)=>`<div class="row click clarity-row decision-row ${d.decided?"is-done":""} ${d.next&&!d.decided?"is-next":""}" onclick="openDecisionDetail(${idx})"><div class="name">${d.next&&!d.decided?`<span class="next-marker">Als Nächstes</span>`:""}${esc(d.question)}<span class="small">${esc(d.reason)}</span></div><div><div class="checkbox-label"><span class="decision-check ${d.decided?"done":"open"}">${d.decided?"✓":""}</span><span>${d.decided?"Geklärt":"Offen"}</span></div></div><div class="person"><div class="avatar">${initials(d.owner)}</div><div><strong>${esc(d.owner)}</strong><div class="small">${esc(userRole(d.owner))}</div></div></div><div><span class="badge ${d.decided?"green":"red"}">${d.decided?"Dokumentiert":"Offen"}</span></div><div class="row-actions" onclick="event.stopPropagation()"><button class="kebab" onclick="toggleActionMenu('decision',${idx})">⋮</button><div class="action-menu" id="decision-menu-${idx}"><button onclick="openDecisionDetail(${idx})">Bearbeiten</button>${d.decided?"":`<button onclick="setNextItem('decision',${idx})">${d.next?"Markierung entfernen":"Als Nächstes markieren"}</button>`}<button class="danger" onclick="askDeleteDecision(${idx})">Löschen</button></div></div></div>`).join(""):emptyState("decision")}`;
}
function renderTimeline(r){
  $("timeline").innerHTML=r.log.slice().reverse().map((entry,idx)=>{
    const h=formatHistoryEntry(entry);
    return `<div class="event"><div><span class="dot"></span>${idx===0?"Aktuell":"Früher"}</div><div><strong>${esc(h.user)}</strong><br>${esc(h.text)}${h.context?`<div class="small">${esc(h.context)}</div>`:""}</div><div class="small">${esc(h.time||"Readyness")}</div></div>`
  }).join("")
}
function renderAside(r){
  $("sideOrganization").innerHTML=`
    <div><span>Erstellt von</span><strong>${esc(r.createdBy)}</strong><small>${esc(userRole(r.createdBy))}</small></div>
    <div><span>Hauptverantwortlich</span><strong>${esc(r.responsible)}</strong><small>${esc(userRole(r.responsible))}</small></div>
    <div><span>Zielabteilung</span><strong>${esc(r.targetDepartment)}</strong><small>${esc(r.category||"Vorhaben")}</small></div>
    <div><span>Gesamtdeadline</span><strong>${esc(fmtDate(r.deadline))}</strong><small>Keine Einzeldeadlines</small></div>`;
  $("sideParticipants").innerHTML=(r.participants||[]).map(name=>`<div class="participant"><div class="avatar">${initials(name)}</div><div><strong>${esc(name)}</strong><div class="small">${esc(userRole(name))}</div></div>${name===r.responsible?`<span class="role-badge">Verantwortlich</span>`:""}</div>`).join("");
  $("sideActivity").innerHTML=r.log.slice(-3).reverse().map(entry=>{
    const h=formatHistoryEntry(entry);
    return `<div class="activity-item"><div class="avatar">${initials(h.user)}</div><div>${esc(h.text)}${h.context?`<div class="small">${esc(h.context)}</div>`:""}<div class="small">${esc(h.time||"Gerade eben")}</div></div></div>`
  }).join("");
  $("aiHint").textContent=readinessText(r);
}
function selectRequest(id){currentId=id;render()}
function setNextItem(type,idx){
  const r=current();
  const list=type==="input"?r.inputs:r.decisions;
  const selected=list[idx];
  const remove=!!selected.next;
  r.inputs.forEach(i=>i.next=false);
  r.decisions.forEach(d=>d.next=false);
  if(!remove)selected.next=true;
  addHistory(remove?"hat die nächste Klärung entfernt":"hat die nächste Klärung festgelegt",type==="input"?selected.name:selected.question);
  closeAllMenus();
  render();
  toast(remove?"Markierung entfernt":"Als nächste Klärung markiert");
}

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
    addHistory("hat den Input gelöscht", removed.name);
  }
  if(deleteTarget.type==="decision"){
    const removed=r.decisions.splice(deleteTarget.idx,1)[0];
    addHistory("hat den Entscheidungspunkt gelöscht", removed.question);
  }
  closeDeleteModal();
  render();
  toast("Eintrag gelöscht");
}


function closeInputModal(){
  closeInputConfirm();
  const modal=$("inputModal");
  if(modal) modal.classList.remove("open");
  activeInputIndex=null;
  unlockPageScroll();
}

function renderInputDetail(i,idx){
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
        <div><label>Readyness-Beitrag</label><strong>${i.done?"Geklärt":"Offen"}</strong><div class="small">Kontext für das Vorhaben</div></div>
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
        <div><textarea class="drawer-textarea" id="inputComment" placeholder="Welche Information lieferst du? Was muss später nachvollziehbar sein?"></textarea><div class="char-count">Optional: Ergänze Kontext, wenn später etwas nachvollziehbar bleiben soll.</div></div>
        <button type="button" class="secondary" onclick="addInputComment(${idx})">Kommentieren</button>
      </div>
      <label class="small" style="display:block;font-weight:500;color:#344054;margin-top:16px">Verlauf & Kommentare</label>
      <div class="comment-box">${commentsHtml(i.comments)}</div>
    </section>

    <section class="drawer-card">
      <div class="drawer-card-title"><span class="mini-icon">✓</span><label>ABSCHLUSS</label></div>
      <div class="drawer-done-row">
        <div><strong>${i.done?"Dieser Input ist geklärt.":"Input abschließen"}</strong><div class="small">Beim Abschließen fragt Readyness kurz nach, ob wirklich nichts fehlt.</div></div>
        <button type="button" class="secondary" onclick="toggleInputDone(${idx}, this)"><span class="fancy-check ${i.done?"done":"open"}">${i.done?"✓":""}</span><span>${i.done?"Wieder öffnen":"Als erledigt markieren"}</span></button>
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
    comments:existingComments,
    next:activeInputIndex===null?false:!!current().inputs[activeInputIndex].next
  };
  if(!data.name){
    nameEl.classList.add("invalid");
    if($("inputNameError")) $("inputNameError").textContent="Bitte einen Namen für den Input eintragen.";
    toast("Bitte einen Namen für den Input eintragen.");
    nameEl.focus();
    return false
  }
  const r=current();
  const wasDone=activeInputIndex!==null?!!(r.inputs[activeInputIndex]&&r.inputs[activeInputIndex].done):false;
  const commit=()=>{
    if(activeInputIndex===null){
      r.inputs.push(data);
      addHistory("hat den Input angelegt", data.name, data.desc);
    }else{
      r.inputs[activeInputIndex]=data;
      addHistory("hat den Input bearbeitet", data.name, data.desc);
    }
    closeInputModal();
    render();
    toast("Input gespeichert");
  };
  if(data.done&&!wasDone){
    askConfirmInputDone(commit, event?.currentTarget || $("saveInputBtn"));
    return false;
  }
  commit();
  return false
}
function toggleInputDone(idx, anchorEl){
  const i=current().inputs[idx];
  if(i.done){
    i.done=false;
    addHistory("hat den Input wieder geöffnet", i.name);
    render();openInputDetail(idx);
    return;
  }
  askConfirmInputDone(()=>{
    i.done=true;
    addHistory("hat den Input freigegeben", i.name);
    render();openInputDetail(idx);
  }, anchorEl);
}
function addInputComment(idx){const val=$("inputComment").value.trim();if(val.length<15){toast("Kommentar muss mindestens 15 Zeichen haben.");return}const i=current().inputs[idx];i.comments=i.comments||[];i.comments.push(`${currentUser()}: ${val}`);addHistory("hat einen Kommentar zum Input ergänzt", i.name, val);render();openInputDetail(idx)}

function canCreateDecision(r=current()){return currentUser()===r.createdBy||currentUser()===r.responsible}
function openDecisionCreate(){if(!canCreateDecision()){toast("Nur Ersteller oder Hauptverantwortliche können Entscheidungspunkte anlegen.");return}activeDecisionIndex=null;$("decisionModalTitle").textContent="Entscheidungspunkt anlegen";$("decisionModalSub").textContent="Eine Entscheidung braucht Frage, Begründung und eine vorgesehene verantwortliche Person.";renderDecisionForm({question:"",reason:"",owner:"",decided:false,decision:"",comments:[]});$("decisionModal").classList.add("open");lockPageScroll()}
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
function renderDecisionDetail(d,idx){$("decisionModalBody").innerHTML=`<div class="drawer-meta-grid"><div class="drawer-meta-item"><span class="decision-check ${d.decided?"done":"open"}">${d.decided?"✓":""}</span><div><label>Status</label><strong>${d.decided?"Entschieden":"Offen"}</strong><div class="small">${d.documentedBy?`Dokumentiert von ${esc(d.documentedBy)}`:"Finale Entscheidung dokumentieren."}</div></div></div><div class="drawer-meta-item"><div class="avatar">${initials(d.owner)}</div><div><label>Vorgesehen</label><strong>${esc(d.owner)}</strong><div class="small">${esc(userRole(d.owner)||"Entscheidungsverantwortung")}</div></div></div><div class="drawer-meta-item"><div class="readyness-impact">▥</div><div><label>Readyness-Beitrag</label><strong>${d.decided?"Geklärt":"Offen"}</strong><div class="small">${esc(d.documentedAt||"Entscheidungspunkt")}</div></div></div></div><section class="drawer-card"><div class="drawer-card-title"><span class="mini-icon">⚖</span><label>ENTSCHEIDUNG</label></div><label class="small" style="font-weight:500;color:#344054">Entscheidungsfrage</label><div class="drawer-text-box decision-question-box">${esc(d.question)}</div><label class="small" style="display:block;font-weight:500;color:#344054;margin-top:16px">Begründung / Kontext</label><div class="drawer-text-box">${esc(d.reason||"Noch keine Begründung hinterlegt.")}</div><label class="small" style="display:block;font-weight:500;color:#344054;margin-top:16px">Finale Entscheidung</label><textarea class="drawer-textarea" id="decisionResult" placeholder="Beschreibe die Entscheidung in vollständigen Sätzen.">${esc(d.decision||"")}</textarea>${d.documentedBy&&d.documentedBy!==d.owner?`<div class="documentation-note">Dokumentiert von <strong>${esc(d.documentedBy)}</strong> · Vorgesehen: ${esc(d.owner)}</div>`:""}</section><section class="drawer-card"><div class="drawer-card-title"><span class="mini-icon">☰</span><label>KOMMUNIKATION</label></div><label class="small" style="font-weight:500;color:#344054">Kommentar / Begründung zur Entscheidung</label><div class="drawer-comment-form"><div><textarea class="drawer-textarea" id="decisionComment" placeholder="Warum wurde so entschieden? Was muss später nachvollziehbar sein?"></textarea><div class="char-count">Kontext für spätere Nachvollziehbarkeit</div></div><button class="secondary" onclick="addDecisionComment(${idx})">Kommentieren</button></div><label class="small" style="display:block;font-weight:500;color:#344054;margin-top:16px">Verlauf & Kommentare</label><div class="comment-box">${commentsHtml(d.comments)}</div></section><section class="drawer-card"><div class="drawer-card-title"><span class="mini-icon">✓</span><label>ABSCHLUSS</label></div><div class="drawer-done-row"><div><strong>${d.decided?"Diese Entscheidung ist dokumentiert.":"Entscheidung dokumentieren"}</strong><div class="small">Readyness prüft die Dokumentation, nicht die formale Entscheidungsbefugnis.</div></div><button class="secondary" onclick="toggleDecision(${idx})"><span class="decision-check ${d.decided?"done":"open"}">${d.decided?"✓":""}</span><span>${d.decided?"Wieder öffnen":"Als entschieden markieren"}</span></button></div></section>`;$("decisionModalActions").innerHTML=`<button class="secondary" onclick="renderDecisionForm(current().decisions[${idx}])">Struktur bearbeiten</button><button class="primary" onclick="saveDecisionResult(${idx})">Entscheidung speichern</button>`}
function closeDecisionModal(){
  $("decisionModal").classList.remove("open");
  unlockPageScroll();
}
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
    comments:activeDecisionIndex===null?[]:(current().decisions[activeDecisionIndex].comments||[]),
    next:activeDecisionIndex===null?false:!!current().decisions[activeDecisionIndex].next,
    documentedBy:decided?currentUser():(activeDecisionIndex===null?"":current().decisions[activeDecisionIndex].documentedBy||""),
    documentedAt:decided?timeNow():(activeDecisionIndex===null?"":current().decisions[activeDecisionIndex].documentedAt||"")
  };
  const r=current();
  if(activeDecisionIndex===null){r.decisions.push(data);addHistory("hat einen Entscheidungspunkt angelegt", q, reason)}else{r.decisions[activeDecisionIndex]=data;addHistory("hat den Entscheidungspunkt bearbeitet", q, reason)}
  closeDecisionModal();render()
}
function saveDecisionResult(idx){
  const resultEl=$("decisionResult");
  const val=resultEl.value.trim();
  const d=current().decisions[idx];

  // Offen gespeicherte Entscheidungen dürfen ohne finale Begründung gespeichert werden.
  // Kontext wird erst zwingend, wenn die Entscheidung wirklich als entschieden markiert ist.
  if(d.decided && !isSentenceWithThreeWords(val)){
    resultEl.classList.add("invalid");
    resultEl.focus();
    toast("Bitte mindestens einen vollständigen Satz mit drei Wörtern formulieren.");
    return;
  }

  resultEl.classList.remove("invalid");
  d.decision=val;
  if(d.decided){d.documentedBy=currentUser();d.documentedAt=timeNow()}
  addHistory(d.decided ? "hat die Entscheidung dokumentiert" : "hat den offenen Entscheidungspunkt gespeichert", d.question, val);
  closeDecisionModal();render()
}
function toggleDecision(idx){
  const d=current().decisions[idx];
  if(d.decided){
    d.decided=false;
    addHistory("hat den Entscheidungspunkt wieder geöffnet", d.question);
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
  d.documentedBy=currentUser();
  d.documentedAt=timeNow();
  addHistory("hat den Entscheidungspunkt entschieden", d.question, val);
  render();openDecisionDetail(idx)
}
function addDecisionComment(idx){const val=$("decisionComment").value.trim();if(!isSentenceWithThreeWords(val)){toast("Bitte mindestens einen vollständigen Satz mit drei Wörtern formulieren.");return;}const d=current().decisions[idx];d.comments=d.comments||[];d.comments.push(`${currentUser()}: ${val}`);addHistory("hat einen Kommentar zum Entscheidungspunkt ergänzt", d.question, val);render();openDecisionDetail(idx)}

const inputConfirmQuestions=[
  "Hand aufs Herz: Ist das wirklich vollständig?",
  "Ist das geklärt — oder nur innerlich weggeklickt?",
  "Würde dein Zukunfts-Ich das auch so abhaken?",
  "Ist das Klarheit oder nur Optimismus?",
  "Würdest du das morgen früh noch verteidigen?",
  "Hat diese Info genug Substanz für den nächsten Schritt?",
  "Wenn dich nächste Woche jemand fragt: weißt du dann noch, warum?"
];
function positionInputConfirm(anchorEl){
  const popover=$("inputConfirmPopover");
  if(!popover)return;
  const rect=anchorEl?.getBoundingClientRect ? anchorEl.getBoundingClientRect() : null;
  const popoverWidth=340;
  const gap=12;
  let top=window.innerHeight/2-80;
  let left=window.innerWidth/2-popoverWidth/2;
  let placement="center";
  if(rect){
    top=rect.top + rect.height/2 - 80;
    left=rect.left - popoverWidth - gap;
    placement="left";
    if(left<16){
      left=Math.min(window.innerWidth-popoverWidth-16, rect.right+gap);
      placement="right";
    }
    top=Math.max(16, Math.min(top, window.innerHeight - 190));
  }
  popover.style.top=`${top}px`;
  popover.style.left=`${left}px`;
  popover.dataset.placement=placement;
}
function askConfirmInputDone(callback, anchorEl){
  pendingInputAction=callback;
  const q=inputConfirmQuestions[Math.floor(Math.random()*inputConfirmQuestions.length)];
  if($("inputConfirmQuestion"))$("inputConfirmQuestion").textContent=q;
  positionInputConfirm(anchorEl);
  if($("inputConfirmPopover"))$("inputConfirmPopover").classList.add("open");
}
function closeInputConfirm(){
  if($("inputConfirmPopover"))$("inputConfirmPopover").classList.remove("open");
  pendingInputAction=null;
}
function confirmInputDone(){
  const action=pendingInputAction;
  closeInputConfirm();
  if(typeof action==="function")action();
}

function renderParticipantPicker(selected=[]){
  $("reqParticipants").innerHTML=mockUsers.map(u=>`<label class="participant-option"><input type="checkbox" value="${esc(u.name)}" ${selected.includes(u.name)?"checked":""}><span class="avatar">${initials(u.name)}</span><span><strong>${esc(u.name)}</strong><small>${esc(u.role)}</small></span></label>`).join("");
}
function prepareRequestForm(r={}){
  $("reqCreatedBy").innerHTML=userOptions(r.createdBy||currentUser());
  $("reqResponsible").innerHTML=userOptions(r.responsible||currentUser());
  $("reqTargetDepartment").innerHTML=departmentOptions(r.targetDepartment||"Marketing");
  renderParticipantPicker(r.participants||[r.createdBy||currentUser(),r.responsible||currentUser()]);
}
function openRequestModal(){editingRequest=false;$("requestModalTitle").textContent="Neues Vorhaben";prepareRequestForm();$("reqTitle").value="";$("reqCategory").value="";$("reqDeadline").value="";$("reqDesc").value="";$("requestModal").classList.add("open")}
function editCurrent(){const r=current();editingRequest=true;$("requestModalTitle").textContent="Vorhaben bearbeiten";prepareRequestForm(r);$("reqTitle").value=r.title;$("reqCategory").value=r.category;$("reqDeadline").value=r.deadline;$("reqDesc").value=r.description;$("requestModal").classList.add("open")}
function closeRequestModal(){$("requestModal").classList.remove("open")}
function saveRequest(){
  if(!$("reqTitle").value.trim()){toast("Bitte Titel eintragen.");return}
  const createdBy=$("reqCreatedBy").value;
  const responsible=$("reqResponsible").value;
  const participants=[...document.querySelectorAll("#reqParticipants input:checked")].map(el=>el.value);
  const data={
    title:$("reqTitle").value.trim(),
    category:$("reqCategory").value.trim()||"Allgemein",
    createdBy,
    responsible,
    targetDepartment:$("reqTargetDepartment").value,
    participants:[...new Set([...participants,createdBy,responsible])],
    deadline:$("reqDeadline").value,
    description:$("reqDesc").value.trim()
  };
  if(editingRequest){
    Object.assign(current(),data);
    addHistory("hat das Vorhaben bearbeitet",current().title);
  }else{
    const id="VOR-"+new Date().getFullYear()+"-"+String(Math.floor(Math.random()*900)+100);
    state.requests.push({...data,id,createdAt:new Date().toLocaleDateString("de-DE",{day:"2-digit",month:"long",year:"numeric"}),inputs:[],decisions:[],log:[historyEntry(createdBy,"hat das Vorhaben erstellt",data.title,"Neues Vorhaben angelegt.")]});
    currentId=id;
  }
  closeRequestModal();
  render();
  toast("Vorhaben gespeichert");
}
function completeNextStep(){const step=nextStepItem(current());if(!step){toast("Das Vorhaben ist bereits bereit.");return}if(step.type==="input"){openInputDetail(step.idx);toast("Hier kannst du die Klarheit erhöhen.");return}openDecisionDetail(step.idx);toast("Dokumentiere das Ergebnis, sobald die Entscheidung geklärt ist.")}
function addLog(text){current().log.push(text);render()}
function toggleSidebar(){const a=$("aside"),b=$("drawerBackdrop");a.classList.add("open");b.classList.add("open");lockPageScroll()}
function closeSidebar(){const a=$("aside"),b=$("drawerBackdrop");a.classList.remove("open");b.classList.remove("open");unlockPageScroll()}
function toggleDocumentation(){
  const body=$("documentationBody");
  const label=$("documentationToggleLabel");
  body.classList.toggle("open");
  label.textContent=body.classList.contains("open")?"Zuklappen ↑":"Aufklappen ↓";
}
function showOverview(){
  $("overviewPanel")?.scrollIntoView({behavior:"smooth",block:"start"});
  toast("Übersicht zeigt jetzt die wichtigsten Klärungspunkte.");
}
function showDemoArea(area){toast(`${area} wird in der nächsten Ausbaustufe zur eigenen Übersicht.`)}
function openAdminModal(){
  $("adminDepartments").innerHTML=departments.map(d=>`<div class="admin-list-item"><strong>${esc(d)}</strong><span>${state.requests.filter(r=>r.targetDepartment===d).length} Vorhaben</span></div>`).join("");
  $("adminUsers").innerHTML=mockUsers.map(u=>`<div class="admin-list-item"><div><strong>${esc(u.name)}</strong><small>${esc(u.role)}</small></div><span>${esc(u.department)}</span></div>`).join("");
  $("adminModal").classList.add("open");
}
function closeAdminModal(){$("adminModal").classList.remove("open")}
function resetDemo(){localStorage.removeItem(STORAGE_KEY);load();render();toast("Demo zurückgesetzt")}
document.addEventListener("input",(event)=>{
  if(event.target&&event.target.id==="decisionResult"&&isSentenceWithThreeWords(event.target.value.trim())){
    event.target.classList.remove("invalid");
  }
});

document.addEventListener("click",(event)=>{
  const popover=$("inputConfirmPopover");
  if(!popover?.classList.contains("open"))return;
  if(event.target.closest("#inputConfirmPopover"))return;
  if(event.target.closest("button"))return;
  closeInputConfirm();
});
window.addEventListener("resize",closeInputConfirm);

load();render();
if(location.hash==="#app") document.body.classList.add("app-mode");
