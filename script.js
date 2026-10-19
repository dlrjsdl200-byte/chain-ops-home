// ------------------------------------------------------------
// chain-ops.xyz — minimal client JS
// 1. Copy-to-clipboard for install command + quickstart code
// 2. MGO live stats (reads api.mgo.chain-ops.xyz/stats if available)
// ------------------------------------------------------------

function flashCopied(btn) {
  btn.classList.add('copied');
  setTimeout(() => btn.classList.remove('copied'), 1500);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

// Install command copy (data-copy attribute on button)
document.querySelectorAll('[data-copy]').forEach(btn => {
  btn.addEventListener('click', async () => {
    const text = btn.getAttribute('data-copy');
    if (await copyText(text)) flashCopied(btn);
  });
});

// Code block copy (data-copy-id points to a <code> element)
document.querySelectorAll('[data-copy-id]').forEach(btn => {
  btn.addEventListener('click', async () => {
    const target = document.getElementById(btn.getAttribute('data-copy-id'));
    if (!target) return;
    const text = target.innerText;
    if (await copyText(text)) {
      const original = btn.textContent;
      btn.textContent = 'Copied';
      flashCopied(btn);
      setTimeout(() => { btn.textContent = original; }, 1500);
    }
  });
});
