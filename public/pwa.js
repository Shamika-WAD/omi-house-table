/* Home-screen install support. Does not change gameplay or seat credentials. */
(() => {
  'use strict';
  let deferredPrompt = null;
  const slot = document.getElementById('install-slot');
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(navigator.userAgent);
  const displayMode = window.matchMedia('(display-mode: standalone)');
  const standalone = () => displayMode.matches || navigator.standalone === true;
  function isDismissed() { try { return Date.now() - Number(localStorage.getItem('omi-install-dismissed') || 0) < 7 * 86400000; } catch { return false; } }
  function draw() {
    if (!slot) return;
    slot.replaceChildren();
    if (standalone() || isDismissed() || !(isIOS || isAndroid || deferredPrompt)) return;
    const banner = document.createElement('section');
    banner.className = 'install-banner';
    banner.setAttribute('aria-label', 'Install Omi on your home screen');
    banner.innerHTML = '<img src="/icons/icon-192.png" alt="" width="36" height="36"><div><strong>Keep a seat on your home screen.</strong><span>Install Omi · no APK needed</span></div><button class="btn small" type="button" data-pwa-install>Install</button><button class="install-dismiss" type="button" aria-label="Dismiss installation suggestion">×</button>';
    banner.querySelector('[data-pwa-install]').addEventListener('click', install);
    banner.querySelector('.install-dismiss').addEventListener('click', () => { try { localStorage.setItem('omi-install-dismissed', String(Date.now())); } catch {} slot.replaceChildren(); });
    slot.appendChild(banner);
  }
  function instructions() {
    let dialog = document.getElementById('pwa-instructions');
    if (dialog) dialog.remove();
    dialog = document.createElement('dialog');
    dialog.id = 'pwa-instructions';
    dialog.className = 'pwa-dialog';
    dialog.setAttribute('aria-labelledby', 'pwa-title');
    const steps = isIOS
      ? '<li>Open this website in <strong>Safari</strong>. If you are inside another app, open its menu and choose Safari first.</li><li>Tap <strong>Share</strong> (the square with an arrow).</li><li>Choose <strong>Add to Home Screen</strong>. You may need to scroll through the actions.</li><li>If shown, enable <strong>Open as Web App</strong>, then tap <strong>Add</strong>.</li>'
      : '<li>Open this website in <strong>Chrome</strong> on Android (or a browser that supports installation).</li><li>Open the browser’s <strong>⋮ menu</strong>.</li><li>Choose <strong>Install app</strong> or <strong>Add to Home screen</strong>, then follow the browser prompts.</li>';
    dialog.innerHTML = '<div class="eyebrow">YOUR TABLE, ONE TAP AWAY</div><h2 id="pwa-title">Install Omi.</h2><ol>' + steps + '</ol><p>The installed app still needs a connection for multiplayer. Install before creating a room, then join from the Omi home-screen icon.</p><button class="btn" type="button">Got it →</button>';
    dialog.querySelector('button').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => { if (event.target === dialog) { const box=dialog.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close(); } });
    document.body.appendChild(dialog);
    dialog.showModal();
  }
  async function install() {
    if (deferredPrompt) {
      const prompt = deferredPrompt;
      deferredPrompt = null;
      try {
        await prompt.prompt();
        const result = await prompt.userChoice;
        if (result.outcome === 'accepted') { slot.replaceChildren(); return; }
      } catch { instructions(); }
      draw();
    } else { instructions(); }
  }
  window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); deferredPrompt = event; draw(); });
  window.addEventListener('appinstalled', () => { deferredPrompt = null; slot?.replaceChildren(); });
  displayMode.addEventListener?.('change', draw);
  if ('serviceWorker' in navigator && window.isSecureContext) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js', {scope: '/', updateViaCache: 'none'}).catch(error => console.warn('Omi install support could not start:', error));
    });
  }
  draw();
})();
