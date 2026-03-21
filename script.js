// Scroll-triggered animations
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.15 }
);

document.querySelectorAll(".how__step, .product-card, .pricing-card, .docs__link, .activity-card").forEach((el, i) => {
  el.style.opacity = "0";
  el.style.transform = "translateY(20px)";
  el.style.transition = `opacity 0.5s ${i * 0.08}s ease-out, transform 0.5s ${i * 0.08}s ease-out`;
  observer.observe(el);
});

document.head.insertAdjacentHTML(
  "beforeend",
  `<style>.visible { opacity: 1 !important; transform: translateY(0) !important; }</style>`
);

// Smooth nav background on scroll
const nav = document.querySelector(".nav");
let ticking = false;
window.addEventListener("scroll", () => {
  if (!ticking) {
    requestAnimationFrame(() => {
      nav.style.borderBottomColor = window.scrollY > 20
        ? "rgba(0,0,0,0.06)"
        : "rgba(0,0,0,0.04)";
      ticking = false;
    });
    ticking = true;
  }
});

// Live on-chain stats — USDC payments to MGO wallet on Base via Blockscout
(async function fetchLiveStats() {
  const WALLET = "0x665bab4c46a6ae3f755e71793e5685bc6c47dd7a";
  const USDC_DECIMALS = 6;

  const elCalls = document.getElementById("stats-calls");
  const elRevenue = document.getElementById("stats-revenue");
  const elLast = document.getElementById("stats-last");

  try {
    let allItems = [];
    let url = `https://base.blockscout.com/api/v2/addresses/${WALLET}/token-transfers?type=ERC-20&filter=to`;

    const res = await fetch(url);
    const data = await res.json();
    allItems = data.items || [];

    const usdcTransfers = allItems.filter(
      (tx) => tx.token?.symbol === "USDC"
    );

    const totalCalls = usdcTransfers.length;
    let totalUsdc = 0;

    usdcTransfers.forEach((tx) => {
      const decimals = parseInt(tx.token?.decimals) || USDC_DECIMALS;
      totalUsdc += parseInt(tx.total?.value || "0") / Math.pow(10, decimals);
    });

    let lastTime = null;
    if (usdcTransfers.length > 0) {
      const ts = usdcTransfers[0].timestamp;
      if (ts) lastTime = new Date(ts);
    }

    elCalls.textContent = totalCalls.toLocaleString();
    elRevenue.textContent = "$" + totalUsdc.toFixed(totalUsdc < 1 ? 4 : 2);

    if (lastTime) {
      const diff = Date.now() - lastTime.getTime();
      if (diff < 60_000) elLast.textContent = "just now";
      else if (diff < 3600_000) elLast.textContent = Math.floor(diff / 60_000) + "m ago";
      else if (diff < 86400_000) elLast.textContent = Math.floor(diff / 3600_000) + "h ago";
      else elLast.textContent = Math.floor(diff / 86400_000) + "d ago";
    } else {
      elLast.textContent = "—";
    }
  } catch (e) {
    console.error("Live stats error:", e);
  }
})();

// Live scanner stats — Insider Scanner API
(async function fetchInsiderStats() {
  const elTrades = document.getElementById("insider-stats-trades");
  const elMarkets = document.getElementById("insider-stats-markets");
  const elScan = document.getElementById("insider-stats-scan");

  try {
    const res = await fetch("https://api.insider.chain-ops.xyz/api/stats");
    const data = await res.json();

    elTrades.textContent = (data.totalTradesScanned || 0).toLocaleString();
    elMarkets.textContent = (data.totalMarketsTracked || 0).toLocaleString();

    if (data.lastScanTime) {
      const diff = Date.now() - new Date(data.lastScanTime).getTime();
      if (diff < 60_000) elScan.textContent = "just now";
      else if (diff < 3600_000) elScan.textContent = Math.floor(diff / 60_000) + "m ago";
      else elScan.textContent = Math.floor(diff / 3600_000) + "h ago";
    }
  } catch (e) {
    console.error("Insider stats error:", e);
  }
})();

// Agent Activity — Moltbook mention tracking
(async function fetchMoltbookActivity() {
  const elCount = document.getElementById("moltbook-mention-count");
  const elFeed = document.getElementById("moltbook-feed");
  const elStatus = document.getElementById("moltbook-status");

  const KEYWORDS = ["chain-ops", "mgo gas", "hyperpulse", "insider scanner"];

  try {
    // Search Moltbook public API for mentions (no auth needed for basic search)
    const results = [];

    for (const kw of KEYWORDS) {
      const res = await fetch(
        `https://www.moltbook.com/api/v1/search?q=${encodeURIComponent(kw)}&limit=5`,
        { headers: { "Content-Type": "application/json" } }
      );
      if (!res.ok) continue;
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        results.push(...data.results.map(r => ({ ...r, keyword: kw })));
      }
    }

    // Dedupe by id
    const seen = new Set();
    const unique = results.filter(r => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });

    // Sort by created_at desc
    unique.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    elCount.textContent = unique.length > 0 ? unique.length : "0";

    if (unique.length === 0) {
      elStatus.textContent = "No mentions yet";
      elFeed.innerHTML = `<div class="activity-empty">Agents haven't discovered chain-ops yet. Once they do, mentions will appear here.</div>`;
      return;
    }

    // Show last checked time
    elStatus.textContent = "Last checked: just now";

    // Render top 3 mentions
    const top = unique.slice(0, 3);
    elFeed.innerHTML = top.map(item => {
      const ago = getTimeAgo(new Date(item.created_at));
      const title = item.title || item.content?.slice(0, 60) + "..." || "(no title)";
      const author = item.author?.name || "unknown agent";
      const url = item.type === "post"
        ? `https://www.moltbook.com/m/${item.submolt?.name || "general"}/post/${item.post_id || item.id}`
        : `https://www.moltbook.com/m/${item.submolt?.name || "general"}/post/${item.post_id}`;
      return `
        <a href="${url}" target="_blank" rel="noopener" class="activity-item">
          <div class="activity-item__meta">
            <span class="activity-item__author">🤖 ${author}</span>
            <span class="activity-item__time">${ago}</span>
          </div>
          <div class="activity-item__title">${title}</div>
          <div class="activity-item__tag">mentioned: ${item.keyword}</div>
        </a>
      `;
    }).join("");

  } catch (e) {
    console.error("Moltbook activity error:", e);
    elStatus.textContent = "Could not reach Moltbook";
    elFeed.innerHTML = `<div class="activity-empty">Moltbook API unreachable. Will retry on next load.</div>`;
  }

  function getTimeAgo(date) {
    const diff = Date.now() - date.getTime();
    if (diff < 60_000) return "just now";
    if (diff < 3600_000) return Math.floor(diff / 60_000) + "m ago";
    if (diff < 86400_000) return Math.floor(diff / 3600_000) + "h ago";
    return Math.floor(diff / 86400_000) + "d ago";
  }
})();
