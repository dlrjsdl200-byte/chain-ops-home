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
  const WALLET = "0xEC3cAf9281a1b5371F76ee3A3eAb895fdECCe31e";
  // Base mainnet USDC contract address
  const USDC_CONTRACT = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

  const elCalls = document.getElementById("stats-calls");
  const elRevenue = document.getElementById("stats-revenue");
  const elLast = document.getElementById("stats-last");

  try {
    const url = `https://base.blockscout.com/api/v2/addresses/${WALLET}/token-transfers?type=ERC-20&filter=to`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Blockscout ${res.status}`);
    const data = await res.json();
    const allItems = data.items || [];

    // USDC만 필터: symbol AND contract address 둘 다 확인
    const usdcTransfers = allItems.filter((tx) => {
      const sym = tx.token?.symbol === "USDC";
      const addr = tx.token?.address?.toLowerCase() === USDC_CONTRACT.toLowerCase();
      return sym || addr;
    });

    const totalCalls = usdcTransfers.length;
    let totalUsdc = 0;

    usdcTransfers.forEach((tx) => {
      // FIX: total.decimals 우선 사용 (Blockscout v2 API 올바른 필드)
      const decimals = parseInt(tx.total?.decimals ?? tx.token?.decimals ?? "6");
      const rawValue = tx.total?.value || "0";
      totalUsdc += parseInt(rawValue) / Math.pow(10, decimals);
    });

    let lastTime = null;
    if (usdcTransfers.length > 0) {
      const ts = usdcTransfers[0].timestamp;
      if (ts) lastTime = new Date(ts);
    }

    if (elCalls) elCalls.textContent = totalCalls > 0 ? totalCalls.toLocaleString() : "0";
    if (elRevenue) elRevenue.textContent = "$" + totalUsdc.toFixed(totalUsdc < 0.01 ? 6 : totalUsdc < 1 ? 4 : 2);

    if (lastTime && elLast) {
      const diff = Date.now() - lastTime.getTime();
      if (diff < 60_000) elLast.textContent = "just now";
      else if (diff < 3600_000) elLast.textContent = Math.floor(diff / 60_000) + "m ago";
      else if (diff < 86400_000) elLast.textContent = Math.floor(diff / 3600_000) + "h ago";
      else elLast.textContent = Math.floor(diff / 86400_000) + "d ago";
    } else if (elLast) {
      elLast.textContent = "—";
    }
  } catch (e) {
    console.error("Live stats error:", e);
    if (elCalls) elCalls.textContent = "—";
    if (elRevenue) elRevenue.textContent = "—";
    if (elLast) elLast.textContent = "—";
  }
})();

// Live scanner stats — Insider Scanner API
(async function fetchInsiderStats() {
  const elTrades = document.getElementById("insider-stats-trades");
  const elMarkets = document.getElementById("insider-stats-markets");
  const elScan = document.getElementById("insider-stats-scan");

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch("https://api.insider.chain-ops.xyz/api/stats", {
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`Insider API ${res.status}`);
    const data = await res.json();

    if (elTrades) elTrades.textContent = (data.totalTradesScanned || 0).toLocaleString();
    if (elMarkets) elMarkets.textContent = (data.totalMarketsTracked || 0).toLocaleString();

    if (data.lastScanTime && elScan) {
      const diff = Date.now() - new Date(data.lastScanTime).getTime();
      if (diff < 60_000) elScan.textContent = "just now";
      else if (diff < 3600_000) elScan.textContent = Math.floor(diff / 60_000) + "m ago";
      else elScan.textContent = Math.floor(diff / 3600_000) + "h ago";
    }
  } catch (e) {
    if (elTrades) elTrades.textContent = "soon";
    if (elMarkets) elMarkets.textContent = "soon";
    if (elScan) elScan.textContent = "soon";
  }
})();

// Agent Activity — Moltbook agent post tracking
(async function fetchMoltbookActivity() {
  const elCount = document.getElementById("moltbook-mention-count");
  const elFeed = document.getElementById("moltbook-feed");
  const elStatus = document.getElementById("moltbook-status");

  try {
    const res = await fetch(
      "https://www.moltbook.com/api/v1/posts?author=chain-ops-agent&limit=5&sort=new",
      { headers: { "Content-Type": "application/json" } }
    );

    if (!res.ok) throw new Error(`Moltbook API ${res.status}`);
    const data = await res.json();
    const posts = data.posts || [];

    if (elCount) elCount.textContent = posts.length > 0 ? posts.length : "0";

    if (posts.length === 0) {
      if (elStatus) elStatus.textContent = "Agent active, no recent posts";
      if (elFeed) elFeed.innerHTML = `<div class="activity-empty">chain-ops-agent posts daily gas reports. Check the Moltbook profile for latest activity.</div>`;
      return;
    }

    if (elStatus) elStatus.textContent = "Last updated: " + getTimeAgo(new Date(posts[0].created_at || Date.now()));

    const top = posts.slice(0, 3);
    if (elFeed) elFeed.innerHTML = top.map(item => {
      const ago = getTimeAgo(new Date(item.created_at || Date.now()));
      const title = item.title || item.content?.slice(0, 60) + "..." || "(no title)";
      return `
        <a href="https://www.moltbook.com/u/chain-ops-agent" target="_blank" rel="noopener" class="activity-item">
          <div class="activity-item__meta">
            <span class="activity-item__author">🤖 chain-ops-agent</span>
            <span class="activity-item__time">${ago}</span>
          </div>
          <div class="activity-item__title">${title}</div>
          <div class="activity-item__tag">auto-generated · gas intelligence</div>
        </a>
      `;
    }).join("");

  } catch (e) {
    console.error("Moltbook activity error:", e);
    if (elStatus) elStatus.textContent = "View on Moltbook";
    if (elFeed) elFeed.innerHTML = `<div class="activity-empty">
      <a href="https://www.moltbook.com/u/chain-ops-agent" target="_blank" rel="noopener" style="color:inherit;text-decoration:underline;">
        chain-ops-agent on Moltbook →
      </a>
    </div>`;
    if (elCount) elCount.textContent = "—";
  }

  function getTimeAgo(date) {
    const diff = Date.now() - date.getTime();
    if (diff < 60_000) return "just now";
    if (diff < 3600_000) return Math.floor(diff / 60_000) + "m ago";
    if (diff < 86400_000) return Math.floor(diff / 3600_000) + "h ago";
    return Math.floor(diff / 86400_000) + "d ago";
  }
})();
