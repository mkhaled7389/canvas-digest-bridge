export const palettes = {
  forest: {ink:'#e7ecd7',muted:'#b9c6b6',pine:'#213942',panel:'#294750','panel-deep':'#1b3038',mint:'#c4e7b7','mint-deep':'#8fbd91'},
  midnight: {ink:'#eef2ff',muted:'#b8c3df',pine:'#121a31',panel:'#243251','panel-deep':'#17223c',mint:'#a9bfff','mint-deep':'#91aafa'},
  light: {ink:'#202c35',muted:'#526471',pine:'#f4f7fb',panel:'#ffffff','panel-deep':'#e3eaf2',mint:'#b5dec1','mint-deep':'#326d4a'},
  desert: {ink:'#fff2db',muted:'#d8c2a8',pine:'#392d29',panel:'#514039','panel-deep':'#30251f',mint:'#edc48e','mint-deep':'#d8ad75'}
};
export function validColor(value){return typeof value==='string' && /^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\))$/i.test(value);}
export async function applyTheme(){
  const {themeMode='forest',canvasTheme}=await chrome.storage.local.get(['themeMode','canvasTheme']);
  const palette=themeMode==='canvas' && canvasTheme ? {...palettes.forest,...Object.fromEntries(Object.entries(canvasTheme).filter(([k,v])=>Object.keys(palettes.forest).includes(k)&&validColor(v)))} : palettes[themeMode]||palettes.forest;
  for(const [key,value] of Object.entries(palette))document.documentElement.style.setProperty(`--${key}`,value);
}
void applyTheme();chrome.storage.onChanged.addListener(()=>void applyTheme());
