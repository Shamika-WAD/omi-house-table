const BASE=process.env.OMI_TEST_URL || 'http://127.0.0.1:3000';
/* Run against npm start. Actual multiplayer round, then clearly isolated UI fixtures. */
const {chromium}=require('@playwright/test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const out=path.join(__dirname,'../artifacts');fs.mkdirSync(out,{recursive:true});
(async()=>{
 const b=await chromium.launch();const pages=[],errors=[];let code;
 async function newPage(width=390,height=844){const c=await b.newContext({viewport:{width,height}});const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));return p;}
 for(let i=0;i<4;i++){
 const p=await newPage();pages.push(p);await p.goto(BASE + "/"+(i?'?room='+code:''));await p.waitForFunction(()=>connected);await p.fill('#name',['Nimal','Amal','Saman','Kamal'][i]);await p.locator('button[type=submit]').click();await p.waitForSelector('.felt');if(!i)code=await p.evaluate(()=>state.code);await p.locator(`[data-seat="${i}"]`).click();
 }
 const display=await newPage(1280,900);await display.goto(`${BASE}/?room=${code}&display=1`);await display.waitForSelector('.felt');
 await pages[0].screenshot({path:path.join(out,'v2-lobby.png'),fullPage:true});
 await pages[0].locator('[data-start]').click();await pages[0].waitForSelector('[data-defer]');assert.match(await pages[0].locator('.defer-warning').textContent(),/disables Harf/);
 await pages[0].locator('[data-defer="1"]').click();
 for(const i of [1,3])await pages[i].locator('[data-action="pass"]').click();
 await pages[0].waitForFunction(()=>state.game.phase==='playing');
 let steps=0;
 while(true){
 const previous=await pages[0].evaluate(()=>JSON.stringify(state.game));
 const g=JSON.parse(previous);
 if(g.phase==='roundEnd')break;
 let who=0,data;
 if(g.phase==='playing'){who=g.turn;await pages[who].waitForFunction(({turn,trickNumber,count})=>state.game.phase==='playing'&&state.game.turn===turn&&state.game.trickNumber===trickNumber&&state.game.trick.length===count&&state.game.legal.length>0,{turn:who,trickNumber:g.trickNumber,count:g.trick.length});const legal=await pages[who].evaluate(()=>state.game.legal);data={type:'play',card:legal[0]};}
 else if(g.phase==='trickEnd')data={type:'continue'};
 else if(g.phase==='kapothiWindow'){who=g.kapothiTeam;data={type:'kapothi',declare:false};}
 else throw Error(g.phase);
 const res=await pages[who].evaluate(data=>new Promise(r=>socket.emit('action',data,r)),data);assert.ok(res.ok,res.error);await pages[0].waitForFunction(previous=>JSON.stringify(state.game)!==previous,previous);assert.ok(++steps<70);
 }
 for(const p of [...pages,display])await p.waitForSelector('.result-modal');
 const title=await pages[0].locator('#result-title').textContent();
 const actualWinner=await pages[0].evaluate(()=>state.game.result.winner);
 for(let i=0;i<4;i++){const expected=actualWinner===null?'An even table.':actualWinner===i%2?'Your team takes the round.':'The other team takes the round.';assert.equal(await pages[i].locator('#result-title').textContent(),expected);}
 const balances=await pages[0].evaluate(()=>state.game.scores);assert.ok(balances.every(n=>n<=10));
 await pages[0].screenshot({path:path.join(out,'v2-round-result.png'),animations:'disabled'});
 assert.equal(await display.locator('[data-result-next]').count(),0);
 await pages[0].locator('[data-result-close]').first().click();assert.equal(await pages[0].locator('.result-modal').count(),0);assert.equal(await pages[1].locator('.result-modal').count(),1);
 await pages[0].evaluate(()=>render());assert.equal(await pages[0].locator('.result-modal').count(),0);
 await pages[0].locator('[data-result-open]').click();await pages[0].waitForSelector('.result-modal');
 await pages[0].keyboard.press('Escape');assert.equal(await pages[0].locator('.result-modal').count(),0);
 await pages[0].locator('[data-result-open]').click();await pages[0].locator('[data-result-next]').click();
 for(const p of [...pages,display])await p.waitForFunction(()=>!document.querySelector('.result-modal'));
 // Isolated render-only fixtures cover rare terminal states, not live rule mutations.
 const base=await pages[0].evaluate(()=>state);
 async function fixture(phase,extra={}){await pages[0].evaluate(({base,phase,extra})=>{state=structuredClone(base);state.game.phase=phase;Object.assign(state.game,extra);dismissedResult='';modal=false;render();},{base,phase,extra});}
 await fixture('finished',{scores:[4,0],tricks:[5,3],result:{winner:0,amount:1,reason:'Normal round completed.'}});
 assert.match(await pages[0].locator('#result-title').textContent(),/The house is yours/);assert.equal(await pages[0].locator('[data-result-rematch]').count(),1);assert.match(await pages[0].locator('.winner-names').textContent(),/ran out of cards/);
 await pages[0].screenshot({path:path.join(out,'v2-match-result.png'),animations:'disabled'});
 await pages[0].setViewportSize({width:320,height:568});assert.ok((await pages[0].locator('.result-modal').boundingBox()).y>=0);assert.equal(await pages[0].evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await pages[0].setViewportSize({width:390,height:844});
 await fixture('roundEnd',{tricks:[4,4],pendingDraw:true,result:{winner:null,amount:0,reason:'4–4 draw.'}});assert.match(await pages[0].locator('.transfer-summary').textContent(),/No cards removed/);
 await fixture('kapothiWindow',{tricks:[5,0],kapothiTeam:0,trick:[]});await pages[0].screenshot({path:path.join(out,'v2-kapothi.png'),fullPage:true});assert.equal(await pages[0].locator('.five-tricks i').count(),5);assert.match(await pages[0].locator('.stakes').textContent(),/\+3/);assert.match(await pages[0].locator('.stakes').textContent(),/−2/);
 await fixture('harfWindow',{eligibleCourt:true});assert.equal(await pages[0].locator('[data-suit-action="court"]').count(),4);assert.match(await pages[0].locator('.stakes').textContent(),/TAKE ALL FOUR/);
 await fixture('fullWindow',{eligibleCourt:true});assert.match(await pages[0].locator('.stakes').textContent(),/TAKE ALL EIGHT/);
 for(const width of [320,360,390,430,768,1440]){await pages[0].setViewportSize({width,height:900});assert.equal(await pages[0].evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Overflow at '+width);}
 assert.deepEqual(errors,[]);console.log(JSON.stringify({actualRound:'4 mobile players + shared display; result on all 5',checks:'dismiss, reopen, Escape, next-round sync, match/draw/court/Kapothi UI fixtures, 320–1440px overflow',browserErrors:errors},null,2));
 await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
