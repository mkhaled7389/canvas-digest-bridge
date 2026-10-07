// Small visual acknowledgements; no audio or tracking.
document.addEventListener('click', event => {
  const button=event.target.closest('button');
  if(!button || button.disabled)return;
  button.classList.remove('clicked');void button.offsetWidth;button.classList.add('clicked');
  button.addEventListener('animationend',()=>button.classList.remove('clicked'),{once:true});
});
export async function withProgress(button,label,action){
  if(button.disabled)return;
  const original=button.textContent;button.disabled=true;button.setAttribute('aria-busy','true');button.textContent=label;
  try{return await action();}finally{button.disabled=false;button.removeAttribute('aria-busy');button.textContent=original;}
}
