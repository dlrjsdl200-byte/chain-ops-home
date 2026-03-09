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

document.querySelectorAll(".how__step, .product-card, .pricing-card, .docs__link").forEach((el, i) => {
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
    // Fetch all ERC-20 token transfers to our wallet
    let allItems = [];
    let nextPage = null;
    let url = `https://base.blockscout.com/api/v2/addresses/${WALLET}/token-transfers?type=ERC-20&filter=to`;

    // Paginate to get all transfers
    const res = await fetch(url);
    const data = await res.json();
    allItems = data.items || [];

    // Filter USDC only and calculate
    const usdcTransfers = allItems.filter(
      (tx) => tx.token?.symbol === "USDC"
    );

    const totalCalls = usdcTransfers.length;
    let totalUsdc = 0;

    usdcTransfers.forEach((tx) => {
      const decimals = parseInt(tx.token?.decimals) || USDC_DECIMALS;
      totalUsdc += parseInt(tx.total?.value || "0") / Math.pow(10, decimals);
    });

    // Last payment time
    let lastTime = null;
    if (usdcTransfers.length > 0) {
      const ts = usdcTransfers[0].timestamp;
      if (ts) lastTime = new Date(ts);
    }

    // Update DOM
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
