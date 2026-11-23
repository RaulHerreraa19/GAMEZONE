import { io } from 'socket.io-client';
const U='https://backhand-postcard-ungreased.ngrok-free.dev';
const h={'content-type':'application/json','ngrok-skip-browser-warning':'1'};
const lg=await fetch(U+'/api/auth/login',{method:'POST',headers:h,body:JSON.stringify({username:'admin',password:'admin123'})});
console.log('login',lg.status); const {token}=await lg.json();
for (const transports of [['polling','websocket'],['websocket']]) {
  const s=io(U,{auth:{token},transports,extraHeaders:{'ngrok-skip-browser-warning':'1'}});
  s.on('connect',()=>console.log(transports.join('>'),'connected via',s.io.engine.transport.name));
  s.on('connect_error',e=>console.log(transports.join('>'),'error',e.message));
  s.on('ShiftChanged',()=>console.log(transports.join('>'),'GOT ShiftChanged'));
  await new Promise(r=>setTimeout(r,3000));
  const H={...h,authorization:'Bearer '+token};
  const st=await (await fetch(U+'/api/stations',{headers:H})).json();
  const free=st.stations.find(x=>!x.session);
  if(free){const r=await (await fetch(`${U}/api/stations/${free.id}/sessions`,{method:'POST',headers:H,body:JSON.stringify({players:1,minutes:3,method:'Cash'})})).json();
   await new Promise(r=>setTimeout(r,2000));
   await fetch(`${U}/api/sessions/${r.session.id}/cancel`,{method:'POST',headers:H,body:JSON.stringify({reason:'Prueba ngrok'})});}
  s.close();
}
process.exit(0);
