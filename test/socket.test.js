const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const {io}=require('socket.io-client');
const path=require('node:path');
const url='http://127.0.0.1:3099';
const call=(s,event,data={})=>new Promise((resolve,reject)=>s.timeout(3000).emit(event,data,(err,res)=>err?reject(err):resolve(res)));
const pause=()=>new Promise(r=>setTimeout(r,15));
test('real server: 4 players, spectator privacy, full round, refresh recovery, QR',async t=>{
const proc=spawn(process.execPath,['server.js'],{cwd:path.join(__dirname,'..'),env:{...process.env,PORT:'3099'},stdio:['ignore','pipe','pipe']});t.after(()=>proc.kill());await new Promise((resolve,reject)=>{proc.stdout.on('data',d=>{if(String(d).includes('listening'))resolve();});proc.on('error',reject);proc.on('exit',c=>reject(Error('Server exited '+c)));});
const clients=[];const states=[];
async function connect(i){const s=io(url,{transports:['websocket'],forceNew:true});clients.push(s);t.after(()=>s.disconnect());s.on('state',v=>states[i]=v);await new Promise(r=>s.on('connect',r));return s;}
const a=await connect(0);const host=await call(a,'enter',{create:true,name:'Host'});assert.ok(host.ok);const code=host.code;
for(let i=1;i<4;i++){const s=await connect(i);assert.ok((await call(s,'enter',{code,name:'Player '+i})).ok);}
for(let i=0;i<4;i++)assert.ok((await call(clients[i],'seat',{seat:i})).ok);
const display=await connect(4);assert.ok((await call(display,'enter',{code,display:true})).ok);
assert.equal((await call(clients[1],'start')).ok,false);assert.ok((await call(a,'start')).ok);await pause();
assert.equal(states[0].game.hand.length,4);assert.deepEqual(states[4].game.hand,[]);assert.equal(states[1].game.hands,undefined);assert.equal(states[1].game.deck,undefined);
assert.ok((await call(a,'action',{type:'defer',index:1})).ok);for(const i of [1,3])assert.ok((await call(clients[i],'action',{type:'pass'})).ok);
await pause();assert.equal(states[0].game.phase,'playing');
let count=0;
while(states[0].game.phase!=='roundEnd'){
const g=states[0].game;
if(g.phase==='playing'){const i=g.turn;assert.ok((await call(clients[i],'action',{type:'play',card:states[i].game.legal[0]})).ok);}
else if(g.phase==='trickEnd')assert.ok((await call(a,'action',{type:'continue'})).ok);
else if(g.phase==='kapothiWindow')assert.ok((await call(clients[g.kapothiTeam],'action',{type:'kapothi',declare:false})).ok);
else throw Error(g.phase);
await pause();assert.ok(++count<100);
}
assert.equal(states[0].game.tricks.reduce((a,b)=>a+b),8);assert.equal(states[4].game.hand.length,0);
assert.ok((await call(a,'action',{type:'next'})).ok);await pause();const oldHand=states[0].game.hand.map(c=>c.id);
a.disconnect();await pause();assert.equal((await call(clients[1],'action',{type:'defer',index:0})).ok,false);
const refreshed=await connect(5);assert.ok((await call(refreshed,'enter',{code,token:host.token})).ok);await pause();assert.equal(states[5].seat,0);assert.deepEqual(states[5].game.hand.map(c=>c.id),oldHand);
const qr=await fetch(url+'/qr?url='+encodeURIComponent('https://example.com/?room='+code));assert.equal(qr.status,200);assert.match(await qr.text(),/<svg/);
});
