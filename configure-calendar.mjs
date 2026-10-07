import {readFileSync,writeFileSync} from 'node:fs';
const clientId=process.argv[2];
if(!/^[\w.-]+\.apps\.googleusercontent\.com$/.test(clientId||''))throw new Error('Pass the public Chrome extension OAuth client ID; never a client secret.');
const path=new URL('./manifest.json',import.meta.url), manifest=JSON.parse(readFileSync(path));
manifest.oauth2={client_id:clientId,scopes:['https://www.googleapis.com/auth/calendar.app.created']};
writeFileSync(path,JSON.stringify(manifest,null,2)+'\n');
console.log('Calendar OAuth configured. Reload the extension; the client must match its extension ID.');
