const VASchools = (() => {
  const directory = 'https://www.va.gov/education/gi-bill-comparison-tool/schools-and-employers/';
  const rates = 'https://www.va.gov/education/benefit-rates/post-9-11-gi-bill-rates/';
  const reported = v => v === true ? 'Yes' : v === false ? 'No' : 'Not reported';
  const cash = value => value == null ? 'Not reported' : new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(value);
  function picker(slot, selected=false) {
    return '<button type="button" class="va-pick" onclick="Calculators.findSchool('+slot+')">'+(selected?'Change VA school':'Search VA schools')+'</button>';
  }
  function calculator(program, index, field) {
    const school = program.va;
    const path = 'College.programs.' + index + '.';
    if (!school) return '<p class="c-caption">Select a VA school above to open its official benefit calculator.</p>';
    const profile = directory + 'institution/' + encodeURIComponent(school.code);
    const available = !['FLIGHT','CORRESPONDENCE','FOREIGN'].includes(school.type);
    if (!available) return '<p>The VA provides benefit guidance on this facility’s profile.</p><a href="' + profile + '" target="_blank" rel="noopener">View VA benefit guidance ↗</a>';
    return `<div class="va-calculator">
      <a class="va-launch" href="${profile}#calculate-your-benefits" target="_blank" rel="noopener">Calculate benefits on VA.gov ↗</a>
      <p class="c-caption">Opens this school’s GI Bill calculator in a new tab.</p>
      <details><summary>Record your VA results</summary>
        <p class="c-caption">Copy the figures VA shows. Choose Save scenario to keep them in this browser.</p>
        ${field('Tuition and fees paid by VA',path+'vaTuitionResult',{money:true,row:true})}
        ${field('Tuition period',path+'vaTuitionPeriod',{text:true,placeholder:'e.g., academic year'})}
        ${field('Monthly housing allowance',path+'vaHousingResult',{money:true,row:true})}
        ${field('Books and supplies',path+'vaBooksResult',{money:true,row:true})}
        ${field('Notes on terms or eligibility',path+'vaResultNotes',{text:true})}
      </details></div>`;
  }
  function card(program, index, controls) {
    const school = program.va;
    const profile = directory+'institution/'+encodeURIComponent(school.code);
    const row = (label,value) => '<div><dt>'+label+'</dt><dd>'+esc(value)+'</dd></div>';
    const facts = row('School or training type',school.type || 'Not reported')
      +row('Accredited',reported(school.accreditation)+(school.accreditationType?' · '+school.accreditationType:''))
      +row('Yellow Ribbon',reported(school.ribbon))
      +row('In-state tuition & fees',cash(school.tuitionIn))+row('Out-of-state tuition & fees',cash(school.tuitionOut));
    const ribbon = (school.ribbons || []).map(r=>'<li>'+esc([r.level,r.division].filter(Boolean).join(' · ') || 'Program')
      +' — contribution: '+esc(r.amount ?? 'Not reported')+'; places: '+esc(r.places ?? 'Not reported')+'</li>').join('');
    const path = 'College.programs.'+index+'.';
    return '<section class="c-program c-program-'+index+'"><header><strong>'+esc(school.name)+'</strong><small>'+esc(school.location)+'</small></header><div class="c-program-body">'
      +picker(index,true)+controls.field('Your program of interest',path+'programName',{text:true,placeholder:'Degree or certificate'})+'<dl class="va-facts">'+facts+'</dl><details><summary>More VA school details</summary><dl class="va-facts">'
      +row('Facility code',school.code)+row('Training categories',(school.programs||[]).join(', ') || 'Not reported')
      +row('Accreditation status detail',school.accreditationStatus || 'Not reported')+row('Credit for military training',reported(school.credit))
      +(school.closing?row('VA notice','School closing reported'):'')+(school.caution||school.warning?row('VA caution',school.warning||'See official profile'):'')+'</dl>'
      +(ribbon?'<ul>'+ribbon+'</ul>':school.ribbon?'<p>Confirm program terms and available places with the school.</p>':'')
      +'<a href="'+profile+'" target="_blank" rel="noopener">View VA profile and program details ↗</a></details>'
      +calculator(program,index,controls.field)
      +'<small class="c-caption">VA school data '+esc(school.version?.slice(0,10) || '· date not reported')
      +'. <a href="'+rates+'" target="_blank" rel="noopener">Benefit rates ↗</a></small></div></section>';
  }

  function choose(onSelect) {
    const dialog = document.createElement('dialog');
    dialog.className = 'c-compare-dialog va-dialog';
    dialog.innerHTML = '<div class="c-panel-heading"><h3>Find a VA school or training site</h3><button type="button" data-close>Close</button></div>'
      +'<form><label>School or employer name<input name="name" minlength="2" maxlength="100" required placeholder="e.g., Baruch College"></label><button class="primary">Search VA</button></form>'
      +'<p role="status" aria-live="polite"></p><div data-results></div><div data-pages></div><a target="_blank" rel="noopener" href="'+directory+'">Open the VA Comparison Tool ↗</a>';
    document.body.append(dialog);
    dialog.addEventListener('close',()=>dialog.remove(),{once:true});
    dialog.querySelector('[data-close]').onclick = ()=>dialog.close();
    const form = dialog.querySelector('form'), status = dialog.querySelector('[role=status]');
    const results = dialog.querySelector('[data-results]'), pages = dialog.querySelector('[data-pages]');
    let sequence = 0;
    async function get(params) {
      const response = await fetch('/api/va-schools?'+new URLSearchParams(params));
      if (!response.ok) throw Error('VA lookup is unavailable. Try again or open the VA tool below.');
      return response.json();
    }
    function button(parent,label,action) {
      const b=document.createElement('button'); b.type='button'; b.textContent=label; b.onclick=action; parent.append(b);
    }
    async function search(name,page) {
      const token=++sequence;
      results.replaceChildren(); pages.replaceChildren(); status.textContent='Searching VA…';
      try {
        const data=await get({name,page});
        if (!dialog.open || token!==sequence) return;
        status.textContent=data.items.length?'Select the matching campus or training site. Page '+page+'.':'No matching VA records. Try a shorter school name.';
        for (const school of data.items) button(results,[school.name,school.type,school.location,school.code].join(' · '),async()=>{
          const choice=++sequence; status.textContent='Loading the VA profile…';
          try {
            const record=await get({code:school.code});
            if (choice===sequence && dialog.open) {onSelect(record);dialog.close();}
          } catch(error) {if(choice===sequence)status.textContent=error.message;}
        });
        if(page>1)button(pages,'Previous',()=>search(name,page-1));
        if(data.more)button(pages,'Next',()=>search(name,page+1));
      } catch(error) {if(token===sequence)status.textContent=error.message;}
    }
    form.onsubmit=event=>{event.preventDefault();search(form.elements.name.value.trim(),1)};
    dialog.showModal();form.elements.name.focus();
  }
  return {picker,card,choose,calculator};
})();
