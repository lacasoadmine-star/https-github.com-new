// A hidden Games search must not silently filter the Home catalogue.
document.addEventListener('click',event=>{
 const home=event.target.closest('.bottom-nav button:first-child');
 if(!home)return;
 requestAnimationFrame(()=>{
  const search=document.querySelector('.collection-search input');
  if(search&&search.value){search.value='';search.dispatchEvent(new Event('input',{bubbles:true}));}
  document.querySelector('.collection-tabs [data-filter="all"]')?.click();
  document.querySelector('.zp-categories button:first-child')?.click();
 });
});
