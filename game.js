'use strict';
const { randomInt } = require('node:crypto');
const SUITS=['S','H','C','D'];
const RANKS=['7','8','9','10','J','Q','K','A'];
const team=s=>s%2;
const opponents=(g)=>[0,1,2,3].filter(s=>team(s)!==team(g.chooser));
function shuffledDeck(){const d=SUITS.flatMap(s=>RANKS.map((r,v)=>({id:s+r,s,r,v})));for(let i=d.length-1;i>0;i--){const j=randomInt(i+1);[d[i],d[j]]=[d[j],d[i]];}return d;}
function startRound(g){g.deck=shuffledDeck();g.hands=[[],[],[],[]];for(let i=0;i<4;i++)g.hands[i]=g.deck.splice(0,4);g.trump=null;g.mode='normal';g.caller=null;g.passed=[];g.deferred=false;g.trick=[];g.tricks=[0,0];g.trickNumber=1;g.history=[];g.phase='trump';g.message=`${g.players[g.chooser].name} is choosing trump.`;g.round=(g.round||0)+1;}
function newGame(players,host){const g={players,host,chooser:0,scores:[10,10],pendingDraw:false,round:0,log:[]};startRound(g);return g;}
function dealRest(g){for(let i=0;i<4;i++)g.hands[i].push(...g.deck.splice(0,4));g.phase='fullWindow';g.passed=[];g.message='Full court? Opposing players may call or pass before play.';}
function beginPlay(g,mode='normal',caller=null,suit=null){g.mode=mode;g.caller=caller;if(suit)g.trump=suit;g.phase='playing';g.turn=caller===null?g.chooser:caller;g.trick=[];g.message=mode==='normal'?'Follow suit if you can.':`${g.players[caller].name} called ${mode==='harf'?'Harf':'Full'} court. Their partner sits out.`;}
function eligible(g,s){return opponents(g).includes(s)&&!g.passed.includes(s);}
function legalCards(g,s){if(g.phase!=='playing'||g.turn!==s)return [];const hand=g.hands[s];if(!g.trick.length)return hand.map(c=>c.id);const suit=g.trick[0].card.s;const follow=hand.filter(c=>c.s===suit);return (follow.length?follow:hand).map(c=>c.id);}
function trickWinner(trick,trump){const lead=trick[0].card.s;return trick.reduce((best,p)=>{const power=c=>(c.s===trump?200:c.s===lead?100:0)+c.v;return power(p.card)>power(best.card)?p:best;}).seat;}
function settle(g,winner,amount,reason){const loser=1-winner;const moved=Math.min(amount,g.scores[loser]);g.scores[loser]-=moved;g.pendingDraw=false;g.result={winner,loser,amount:moved,requested:amount,reason,scores:[...g.scores]};g.phase=g.scores[loser]===0?'finished':'roundEnd';g.message=`${loser===0?'Coral':'Jade'} loses ${moved} scoring card${moved===1?'':'s'}. ${reason}`;g.log.unshift({round:g.round,...g.result});g.log=g.log.slice(0,30);}
function finishNormal(g){if(g.tricks[0]===4){g.pendingDraw=true;g.result={winner:null,amount:0,reason:'4–4 draw. The next resolved round clears the draw.'};g.phase='roundEnd';g.message=g.result.reason;g.log.unshift({round:g.round,...g.result});return;}const winner=g.tricks[0]>4?0:1;settle(g,winner,g.pendingDraw||winner!==team(g.chooser)?2:1,'Normal round completed.');}
function nextTurn(g,s){let next=(s+1)%4;if(g.mode==='harf'||g.mode==='full'){const inactive=(g.caller+2)%4;if(next===inactive)next=(next+1)%4;}return next;}
function advanceTrick(g){g.trick=[];g.trickNumber++;g.turn=g.lastWinner;g.phase='playing';}
function completeTrick(g){const w=trickWinner(g.trick,g.trump);g.lastWinner=w;g.tricks[team(w)]++;g.history.push({number:g.trickNumber,winner:w,cards:g.trick.map(p=>({...p}))});
if(g.mode==='harf'||g.mode==='full'){const success=team(w)===team(g.caller);if(!success){settle(g,1-team(g.caller),2,'Court failed: the caller lost a trick.');return;}if(g.trickNumber===(g.mode==='harf'?4:8)){settle(g,team(g.caller),2,'Court won: every trick taken.');return;}}
if(g.mode==='kapothi'){if(team(w)!==g.kapothiTeam){settle(g,1-g.kapothiTeam,2,'Kapothi failed.');return;}if(g.trickNumber===8){settle(g,g.kapothiTeam,3,'Kapothi won: all eight tricks.');return;}}
if(g.mode==='normal'&&g.trickNumber===8){finishNormal(g);return;}
if(g.mode==='normal'&&g.trickNumber===5&&Math.max(...g.tricks)===5){g.phase='kapothiWindow';g.kapothiTeam=team(w);g.message='Five straight tricks! Winning team: declare Kapothi or continue normally.';return;}
g.phase='trickEnd';g.message=`${g.players[w].name} won trick ${g.trickNumber}.`;}
function action(g,s,a){if(!Number.isInteger(s)||s<0||s>3)throw Error('Choose a seat first.');
const suit=()=>{if(!SUITS.includes(a.suit))throw Error('Choose a suit.');return a.suit;};
switch(a.type){
case 'trump':if(g.phase!=='trump'||s!==g.chooser)throw Error('Not your trump choice.');g.trump=suit();g.phase='harfWindow';g.passed=[];g.message='Harf court? Opposing players may call or pass.';break;
case 'defer':if(g.phase!=='trump'||s!==g.chooser||![0,1,2,3].includes(a.index))throw Error('Invalid deferred choice.');g.deferred=true;g.deferredIndex=a.index;dealRest(g);g.trump=g.hands[s][4+a.index].s;g.message=`Trump came from card ${a.index+1} of the second deal. Harf court is unavailable. Full court may be called.`;break;
case 'pass':if(!['harfWindow','fullWindow'].includes(g.phase)||!eligible(g,s))throw Error('You cannot pass now.');g.passed.push(s);if(g.passed.length===2){if(g.phase==='harfWindow')dealRest(g);else beginPlay(g);}break;
case 'court':if(!['harfWindow','fullWindow'].includes(g.phase)||!eligible(g,s))throw Error('You cannot call court now.');beginPlay(g,g.phase==='harfWindow'?'harf':'full',s,suit());break;
case 'play':if(!legalCards(g,s).includes(a.card))throw Error('Follow the led suit if possible, and wait for your turn.');const card=g.hands[s].find(c=>c.id===a.card);g.hands[s]=g.hands[s].filter(c=>c.id!==a.card);g.trick.push({seat:s,card});if(g.trick.length===((g.mode==='harf'||g.mode==='full')?3:4))completeTrick(g);else g.turn=nextTurn(g,s);break;
case 'kapothi':if(g.phase!=='kapothiWindow'||team(s)!==g.kapothiTeam)throw Error('Only the team with five straight tricks may decide.');if(a.declare){g.mode='kapothi';g.message='Kapothi declared: take every remaining trick.';}else g.message='Continuing without Kapothi.';advanceTrick(g);break;
case 'continue':if(g.phase!=='trickEnd')throw Error('The trick is not complete.');advanceTrick(g);break;
case 'next':if(g.phase!=='roundEnd')throw Error('Round is not complete.');if(g.mode!=='harf'&&g.mode!=='full')g.chooser=(g.chooser+1)%4;startRound(g);break;
default:throw Error('Unknown action.');}
}
function view(g,seat){const {deck,hands,...safe}=g;return {...safe,hands:undefined,hand:seat===null?[]:hands[seat],handCounts:hands.map(h=>h.length),legal:seat===null?[]:legalCards(g,seat),eligibleCourt:seat!==null&&['harfWindow','fullWindow'].includes(g.phase)&&eligible(g,seat)};}
module.exports={SUITS,RANKS,team,newGame,startRound,action,view,legalCards,trickWinner,settle};
