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

// ------------------------------------------------------------
// MGO live stats — best-effort fetch. If the endpoint is absent,
// leaves the dashes in place.
// ------------------------------------------------------------
async function loadMgoStats() {
  const el = {
    calls: document.getElementById('stats-calls'),
    revenue: document.getElementById('stats-revenue'),
    last: document.getElementById('stats-last'),
  };
  if (!el.calls) return;

  try {
    const res = await fetch('https://api.mgo.chain-ops.xyz/stats', {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return;
    const data = await res.json();
    if (data.calls != null) el.calls.textContent = formatCount(data.calls);
    if (data.revenueUsdc != null) el.revenue.textContent = `$${Number(data.revenueUsdc).toFixed(3)}`;
    if (data.lastPaymentIso) el.last.textContent = formatRelative(data.lastPaymentIso);
  } catch {
    // silent — keep dashes
  }
}

function formatCount(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function formatRelative(iso) {
  const then = new Date(iso).getTime();
  if (!then) return '—';
  const diffSec = Math.floor((Date.now() - then) / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

loadMgoStats();
