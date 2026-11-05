/* Preparation checklist extracted from the supplied IC Standard Pre-Work PDF. */
const PreIC = (() => {
  const items = [
    {id:'dd2648', title:'Launch DD Form 2648 eForm', url:'https://milconnect.dmdc.osd.mil', text:'Sign in to milConnect with myAuth (CAC preferred). Use a personal civilian email you can access after separation and save your account details. Open Correspondence/Documentation → DoD Transition Assistance Program (DoDTAP) → Initialize Pre-Separation Counseling. Complete all sections and save. Do not sign until both Initial Counseling AND Pre-Separation Counseling are completed.'},
    {id:'va', title:'Register on VA.gov', url:'https://www.va.gov', text:'Select Sign in and follow the login instructions. Take a screenshot of your profile page and provide it to UTC/TRP as instructed.'},
    {id:'vmet', title:'Download VMET (DD Form 2586)', url:'https://milconnect.dmdc.osd.mil', text:'In milConnect, open Correspondence/Documentation → DoDTAP → VMET. Select VMET Document (DD-2586), then Submit. Print and bring it to Initial Counseling, Pre-Separation Counseling and TRS.'},
    {id:'jst', title:'Download Joint Services Transcript (JST)', url:'https://jst.doded.mil', text:'Register with a username and password or sign in with CAC. Open My Transcripts → My completed JST Transcript. Print the combo report and bring it to Initial Counseling and TRS.'},
    {id:'itp', title:'Complete NAVMC 17031 Self-Assessment / ITP', text:'Complete the Self-Assessment / Individual Transition Plan as instructed by your UTC/TRP personnel.'},
    {id:'mol', title:'Update your MOL email address', url:'https://sso.tfs.usmc.mil', text:'Sign in to MOL. Open Personal Info → Personal Updates → Contact Information and add a valid personal email address.'},
    {id:'guide', title:'Review the Pre-Separation Counseling Resource Guide', url:'https://www.tapevents.mil/resources', text:'Open Resources, download the Pre-Separation Counseling Resource Guide and review it as instructed by TRP personnel.'},
    {id:'roob', title:'Complete Reserve Obligations & Opportunities Brief (ROOB)', url:'https://www.marinenet.usmc.mil/', text:'Complete through MarineNet or as TRP personnel instruct. Search ROOB, open the Instructor-Led Course, enroll and watch all videos. Save a screenshot or photo of completion showing your name and date.'},
    {id:'mfl', title:'Join the Marine for Life Network', optional:true, url:'https://usmc-mccs.org/services/career/marine-for-life-network/', text:'Recommended in the supplied pre-work instructions.'}
  ];
  function hydrate(target) {
    target.done ??= {};
    const old = target.preIC && typeof target.preIC === 'object' ? target.preIC : {};
    const steps = old.steps && typeof old.steps === 'object' ? old.steps : {};
    const completed = typeof target.done.preic === 'boolean' ? target.done.preic : !!target.done.ic;
    target.preIC = {expanded:old.expanded === true,selected:items.some(i=>i.id===old.selected)?old.selected:'dd2648',steps:Object.fromEntries(items.map(i=>[i.id,typeof steps[i.id] === 'boolean' ? steps[i.id] : !i.optional && completed]))};
    target.done.preic = items.filter(i=>!i.optional).every(i=>target.preIC.steps[i.id]);
    return target;
  }
  function update() {hydrate(state);save();render()}
  function setStep(id,checked) {if(!items.some(i=>i.id===id))return;state.preIC.steps[id]=!!checked;update()}
  function setComplete(checked) {for(const i of items)if(!i.optional)state.preIC.steps[i.id]=!!checked;update()}
  function toggle() {state.preIC.expanded=!state.preIC.expanded;save();render()}
  function select(id) {
    if(!items.some(i=>i.id===id))return;
    state.preIC.selected=id;save();render();
    document.getElementById('preic-select-'+id)?.focus({preventScroll:true});
  }
  const resourceNames = {dd2648:'Open milConnect',va:'Open VA.gov',vmet:'Open milConnect',jst:'Open JST',mol:'Open MOL',guide:'Open resource guide',roob:'Open MarineNet',mfl:'Open Marine for Life'};
  function html() {
    hydrate(state);
    const p=state.preIC, count=items.filter(i=>!i.optional&&p.steps[i.id]).length, selected=items.find(i=>i.id===p.selected);
    if(p.expanded&&['dd2648','vmet','jst','itp','guide','roob'].includes(selected.id)&&typeof queueMicrotask==='function')queueMicrotask(()=>DocLibrary.mountTaskUploads(selected.id));
    return `<section class="preic-tile" aria-label="Pre-Initial Counseling">
      <div class="row preic-header">
        <input type="checkbox" aria-label="Mark Pre-Initial Counseling complete" ${state.done.preic?'checked':''} onchange="PreIC.setComplete(this.checked)">
        <button class="preic-disclosure" aria-expanded="${p.expanded}" aria-controls="preic-steps" onclick="PreIC.toggle()"><strong>Pre-Initial Counseling</strong><small>Before your Initial Counseling appointment</small></button>
        <span class="pill ${state.done.preic?'':'warn'}">${state.done.preic?'Completed':'In progress'}</span><span class="preic-count">${count}/8 required</span>
        <button class="preic-collapse" aria-label="${p.expanded?'Collapse':'Expand'} Pre-Initial Counseling" onclick="PreIC.toggle()">${p.expanded?'⌃':'⌄'}</button>
      </div>
      <div id="preic-steps" class="preic-body" ${p.expanded?'':'hidden'}>
        <div class="preic-list" role="group" aria-label="Preparation checklist">${items.map((i,index)=>`<div class="preic-step ${i.id===selected.id?'is-selected':''}">
          <input type="checkbox" id="preic-${i.id}" aria-label="${esc(i.title)}" ${p.steps[i.id]?'checked':''} onchange="PreIC.setStep('${i.id}',this.checked)">
          <span class="preic-number" aria-hidden="true">${index+1}</span>
          <button id="preic-select-${i.id}" class="preic-select" aria-pressed="${i.id===selected.id}" aria-controls="preic-detail" aria-label="Instructions: ${esc(i.title)}" onclick="PreIC.select('${i.id}')">${esc(i.title)}</button>
          <span class="preic-tag ${i.optional?'is-optional':''}">${i.optional?'Recommended':'Required'}</span>
        </div>`).join('')}</div>
        <section id="preic-detail" class="preic-detail" aria-labelledby="preic-detail-title">
          <div class="preic-detail-head"><div><span class="preic-eyebrow">${selected.optional?'Recommended':'Required'} · Step ${items.indexOf(selected)+1}</span><h3 id="preic-detail-title">${esc(selected.title)}</h3></div><a href="/documents/pre-initial-counseling-prework.pdf" target="_blank" rel="noopener">View source PDF ↗</a></div>
          <p class="preic-instructions">${esc(selected.text)}</p>
          <div class="preic-signing"><strong>Important · DD Form 2648</strong><p>Save your eForm. Sign only after both Initial Counseling and Pre-Separation Counseling are completed.</p></div>
          ${selected.id==='dd2648'?'<div class="preic-personal"><strong>Use a personal email</strong><p>Choose a civilian email you can access after separation.</p></div>':''}
          ${selected.optional?'<p class="preic-optional-note">Recommended only. This item does not affect your 8 required steps.</p>':''}
          ${selected.url?`<a class="preic-resource" href="${selected.url}" target="_blank" rel="noopener noreferrer">${resourceNames[selected.id]} ↗</a>`:'<p class="preic-optional-note">Follow the directions provided by your UTC/TRP personnel.</p>'}
          ${['dd2648','vmet','jst','itp','guide','roob'].includes(selected.id)&&typeof DocLibrary!=='undefined'?DocLibrary.taskUploadHTML(selected.id):''}
        </section>
      </div>
    </section>`;
  }
  return {hydrate,html,setStep,setComplete,toggle,select};
})();
