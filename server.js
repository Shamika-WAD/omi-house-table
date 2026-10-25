'use strict';
const express=require('express');
const http=require('http');
const {Server}=require('socket.io');
const QRCode=require('qrcode');
const {randomBytes,randomInt}=require('node:crypto');
const path=require('node:path');
const {newGame,action,view}=require('./game');
const app=express(),server=http.createServer(app),io=new Server(server,{maxHttpBufferSize:16000});
const rooms=new Map();
app.disable('x-powered-by');
app.use(express.static(path.join(__dirname,'public')));
app.get('/health',(_,res)=>res.json({ok:true,rooms:rooms.size}));
app.get('/qr',async(req,res)=>{const url=String(req.query.url||'');if(url.length>1000||!/^https?:\/\//.test(url))return res.status(400).send('Invalid URL');try{res.type('svg').send(await QRCode.toString(url,{type:'svg',margin:1,color:{dark:'#17382f',light:'#ffffff'}}));}catch{res.status(400).end();}});
function code(){const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let c;do{c=Array.from({length:5},()=>chars[randomInt(chars.length)]).join('');}while(rooms.has(c));return c;}
function roomView(r,p){const isDisplay=p.display;const seat=isDisplay?null:r.seats.indexOf(p.id);return {code:r.code,host:r.host===p.id,you:p.id,seat:seat<0?null:seat,display:isDisplay,started:!!r.game,players:r.members.filter(x=>!x.display).map(x=>({id:x.id,name:x.name,connected:x.connected,seat:r.seats.indexOf(x.id)})),seats:r.seats.map(id=>{const m=r.members.find(m=>m.id===id);return m?{id:m.id,name:m.name,connected:m.connected}:null;}),game:r.game?view(r.game,seat<0?null:seat):null};}
function emitRoom(r){for(const p of r.members){if(p.socket)io.to(p.socket).emit('state',roomView(r,p));}}
function attach(socket,r,p){if(p.socket&&p.socket!==socket.id){const old=io.sockets.sockets.get(p.socket);if(old){old.data={};old.emit('superseded');old.disconnect(true);}}socket.data={room:r.code,player:p.id};p.socket=socket.id;p.connected=true;r.updated=Date.now();emitRoom(r);return {code:r.code,token:p.token,id:p.id};}
io.on('connection',socket=>{
let count=0,window=Date.now();
socket.use((packet,next)=>{if(Date.now()-window>10000){count=0;window=Date.now();}if(++count>100)return next(new Error('Too many requests.'));next();});
socket.on('enter',(data={},ack=()=>{})=>{try{if(socket.data.room)throw Error('Already joined. Refresh to change rooms.');const name=String(data.name||'').trim().slice(0,22);let r;
if(data.create){if(rooms.size>=500)throw Error('Server is full.');r={code:code(),host:null,seats:[null,null,null,null],members:[],game:null,updated:Date.now()};rooms.set(r.code,r);}else{r=rooms.get(String(data.code||'').toUpperCase());if(!r)throw Error('Room not found. Check the code.');}
let p=data.token?r.members.find(m=>m.token===data.token):null;
if(!p){if(!data.display&&!name)throw Error('Enter your name.');if(r.members.length>=12)throw Error('Room is full.');if(!data.display&&r.members.filter(m=>!m.display).length>=4)throw Error('Four players already joined. Use table display instead.');p={id:randomBytes(8).toString('hex'),token:randomBytes(24).toString('hex'),name:data.display?'Table display':name,display:!!data.display,connected:true};r.members.push(p);if(!r.host&&!p.display)r.host=p.id;}
ack({ok:true,...attach(socket,r,p)});
}catch(e){ack({ok:false,error:e.message});}});
function withRoom(fn){return (data={},ack=()=>{})=>{try{const r=rooms.get(socket.data.room);if(!r)throw Error('Join a room first.');const p=r.members.find(p=>p.id===socket.data.player);if(!p)throw Error('Session not found.');fn(r,p,data);r.updated=Date.now();emitRoom(r);ack({ok:true});}catch(e){ack({ok:false,error:e.message});}};}
socket.on('seat',withRoom((r,p,d)=>{if(p.display||r.game)throw Error('Seats are locked.');if(![0,1,2,3].includes(d.seat))throw Error('Invalid seat.');if(r.seats[d.seat]&&r.seats[d.seat]!==p.id)throw Error('That seat is taken.');r.seats=r.seats.map(id=>id===p.id?null:id);r.seats[d.seat]=p.id;}));
socket.on('start',withRoom((r,p)=>{if(p.id!==r.host)throw Error('Only the host can start.');if(r.game)throw Error('Already started.');if(r.seats.some(id=>!id))throw Error('All four players must choose a seat.');if(r.seats.some(id=>!r.members.find(m=>m.id===id)?.connected))throw Error('Wait for all four players to reconnect.');r.game=newGame(r.seats.map(id=>{const m=r.members.find(p=>p.id===id);return {id:m.id,name:m.name};}),r.host);}));
socket.on('action',withRoom((r,p,d)=>{if(!r.game||p.display)throw Error('Players only.');if(r.seats.some(id=>!r.members.find(m=>m.id===id)?.connected))throw Error('Game paused. A player needs to reconnect.');const seat=r.seats.indexOf(p.id);action(r.game,seat,d);}));
socket.on('rematch',withRoom((r,p)=>{if(p.id!==r.host||r.game?.phase!=='finished')throw Error('The host can rematch after the match ends.');r.game=newGame(r.game.players,r.host);}));
socket.on('disconnect',()=>{const r=rooms.get(socket.data.room);if(!r)return;const p=r.members.find(p=>p.id===socket.data.player);if(p&&p.socket===socket.id){p.connected=false;p.socket=null;r.updated=Date.now();emitRoom(r);}});
});
setInterval(()=>{for(const [c,r]of rooms)if(Date.now()-r.updated>6*60*60*1000&&!r.members.some(p=>p.connected))rooms.delete(c);},60000).unref();
const PORT=process.env.PORT||3000;server.listen(PORT,'0.0.0.0',()=>console.log(`Omi listening on 0.0.0.0:${PORT}`));
