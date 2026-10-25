const BASE=process.env.OMI_TEST_URL || 'http://127.0.0.1:3000';
/* Browser checks; this does not claim physical Android/iPhone installation testing. */
const {chromium}=require('@playwright/test');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch();
 const androidUA='Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
 const context=await browser.newContext({viewport:{width:390,height:844},userAgent:androidUA});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(BASE + "/");
 await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
 const manifest=await page.evaluate(async()=>{const link=document.querySelector('link[rel="manifest"]');return (await fetch(link.href)).json();});
 assert.equal(manifest.display,'standalone');assert.equal(manifest.start_url,'/');assert.equal(manifest.icons.length,3);
 for(const icon of manifest.icons){const res=await page.request.get(BASE + ""+icon.src);assert.equal(res.status(),200);assert.match(res.headers()['content-type'],/image\/png/);}
 const cdp=await context.newCDPSession(page);const eligibility=await cdp.send('Page.getInstallabilityErrors');
 await page.locator('[data-pwa-install]').click();await page.waitForSelector('#pwa-instructions[open]');assert.match(await page.locator('#pwa-instructions').textContent(),/Chrome/);await page.locator('#pwa-instructions button').click();
 await page.evaluate(()=>{const event=new Event('beforeinstallprompt',{cancelable:true});event.prompt=async()=>{window.promptCalled=true;};event.userChoice=Promise.resolve({outcome:'accepted'});window.dispatchEvent(event);});
 await page.locator('[data-pwa-install]').click();assert.equal(await page.evaluate(()=>window.promptCalled),true);assert.equal(await page.locator('.install-banner').count(),0);
 const cached=await page.evaluate(async()=>{const result=[];for(const key of await caches.keys()){const c=await caches.open(key);for(const r of await c.keys())result.push(new URL(r.url).pathname);}return result;});
 assert.ok(cached.includes('/offline.html'));assert.ok(cached.every(url=>url==='/offline.html'||url.startsWith('/icons/')));
 await context.setOffline(true);await page.goto(BASE + "/?room=ABCDE");assert.match(await page.locator('h1').textContent(),/needs a connection/);assert.equal(await page.locator('.hand').count(),0);
 await context.setOffline(false);await page.goto(BASE + "/");await page.waitForSelector('.brand');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 const ios=await browser.newContext({viewport:{width:390,height:844},userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1'});
 const ip=await ios.newPage();ip.on('pageerror',e=>errors.push(e.message));await ip.goto(BASE + "/");await ip.locator('[data-pwa-install]').click();assert.match(await ip.locator('#pwa-instructions').textContent(),/Safari/);assert.match(await ip.locator('#pwa-instructions').textContent(),/Add to Home Screen/);
 await ip.locator('#pwa-instructions button').click();await ip.locator('.install-dismiss').click();await ip.reload();assert.equal(await ip.locator('.install-banner').count(),0);
 const installed=await browser.newContext({userAgent:androidUA});await installed.addInitScript(()=>Object.defineProperty(navigator,'standalone',{value:true}));const sp=await installed.newPage();await sp.goto(BASE + "/");assert.equal(await sp.locator('.install-banner').count(),0);
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({manifest:'valid standalone configuration',installabilityErrors:eligibility.installabilityErrors,checks:'icons, worker control, native prompt wiring, Android/iPhone instructions, offline navigation fallback, no private caching, dismiss persistence, standalone banner hidden',browserErrors:errors},null,2));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
