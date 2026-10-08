// Motion never delays an action, hides content, intercepts navigation or writes state.
const preference=matchMedia('(prefers-reduced-motion: reduce)');
const active=new Set();
function animate(element,frames,duration=260){
 if(!element||preference.matches||typeof element.animate!=='function')return;
 const animation=element.animate(frames,{duration,easing:'cubic-bezier(.22,1,.36,1)'});
 active.add(animation);animation.finished.catch(()=>{}).finally(()=>active.delete(animation));
}
preference.addEventListener('change',()=>{if(preference.matches){for(const animation of active)animation.cancel();active.clear();}});
// Content is visible by default. Only a finite entrance runs after intersection.
if(!preference.matches&&'IntersectionObserver'in window){
 const observer=new IntersectionObserver(entries=>{for(const entry of entries){if(!entry.isIntersecting)continue;observer.unobserve(entry.target);animate(entry.target,[{opacity:.72,transform:'translateY(10px)'},{opacity:1,transform:'none'}]);}},{threshold:.12});
 for(const section of document.querySelectorAll('.story-next,.case-proof,.workspace-card,.checkpoint-progress'))observer.observe(section);
 preference.addEventListener('change',()=>{if(preference.matches)observer.disconnect();});
 window.addEventListener('pagehide',()=>observer.disconnect(),{once:true});
}
document.addEventListener('mew:ui-update',event=>{
 if(event.detail?.kind==='checkpoint'){
  animate(document.querySelector('#timeline li[data-latest=true]'),[{opacity:.5,transform:'translateX(7px)'},{opacity:1,transform:'none'}]);
  animate(document.querySelector('.metrics'),[{opacity:.7},{opacity:1}],180);
 }else if(event.detail?.kind==='panel'){
  animate(document.getElementById(event.detail.id),[{opacity:.7,transform:'translateY(5px)'},{opacity:1,transform:'none'}],180);
 }else if(event.detail?.kind==='illustration'){
  animate(document.querySelector('#fixture-title'),[{opacity:.55,transform:'translateY(5px)'},{opacity:1,transform:'none'}]);
 }
});
