const navigation=document.getElementById('main-navigation');
const menuButton=document.querySelector('.menu-toggle');
function closeMenu(){navigation.classList.remove('open');menuButton.setAttribute('aria-expanded','false');menuButton.setAttribute('aria-label','Open navigation')}
menuButton.addEventListener('click',()=>{const open=menuButton.getAttribute('aria-expanded')!=='true';navigation.classList.toggle('open',open);menuButton.setAttribute('aria-expanded',String(open));menuButton.setAttribute('aria-label',open?'Close navigation':'Open navigation')});
navigation.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&menuButton.getAttribute('aria-expanded')==='true'){closeMenu();menuButton.focus()}});
const sampleTasks=[...document.querySelectorAll('[data-demo-task]')];
function updateExample(){const count=sampleTasks.filter(input=>input.checked).length;document.getElementById('demo-progress').value=count;document.getElementById('demo-progress-text').textContent=count+' of '+sampleTasks.length+' complete';sampleTasks.forEach(input=>{const pill=input.closest('label').querySelector('.status');if(!pill.dataset.originalText){pill.dataset.originalText=pill.textContent;pill.dataset.originalClass=pill.className}pill.className=input.checked?'status done':pill.dataset.originalClass;pill.textContent=input.checked?'Complete':pill.dataset.originalText})}
sampleTasks.forEach(input=>input.addEventListener('change',updateExample));
