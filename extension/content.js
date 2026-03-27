// content.js
console.log("🧩 MadMax content script loaded");

// Wake up service worker early
chrome.runtime.sendMessage({ type: "PING" }, () => {
  if (chrome.runtime.lastError) {
    // SW was asleep – this is OK in MV3
  }
});

window.addEventListener("message", (event) => {
  console.log("🧩 Content script got window message:", event.data);

  if (event.source !== window) return;
  if (event.data?.type !== "VERITAS_UID") return;

  chrome.runtime.sendMessage(
    {
      type: "STORE_UID",
      uid: event.data.uid
    },
    () => {
      if (chrome.runtime.lastError) {
        console.debug("SW not ready yet, message will retry later");
      }
    }
  );
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "sync" && changes.overlayAllowed) {
    applyOverlayState(changes.overlayAllowed.newValue === true);
  }
});

let overlay = null;

/* ===================== OVERLAY UI ===================== */

function createOverlay() {
  if (overlay) return;

  overlay = document.createElement("div");
  overlay.id = "veritas-overlay";

  overlay.innerHTML = `
    <img src="${chrome.runtime.getURL("icons/icon48.png")}" />
  `;

  Object.assign(overlay.style, {
    position: "fixed",
    width: "60px",
    height: "60px",
    bottom: "24px",
    right: "24px",
    borderRadius: "50%",
    background: "#0E1411",
    border: "3px solid #3A5F4D",
    color: "#E6ECE8",
    boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
    zIndex: "2147483647",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "grab",
    userSelect: "none",
    transition: "all 0.2s ease"
  });

  overlay.querySelector("img").style.width = "36px";
  overlay.querySelector("img").style.height = "36px";

  document.documentElement.appendChild(overlay);
  makeDraggable(overlay);
}

function removeOverlay() {
  if (!overlay) return;
  overlay.remove();
  overlay = null;
}

/* ===================== DRAG SUPPORT ===================== */

function makeDraggable(el) {
  let startX = 0, startY = 0, dx = 0, dy = 0;

  el.onmousedown = e => {
    e.preventDefault();
    startX = e.clientX;
    startY = e.clientY;

    document.onmousemove = e => {
      dx += e.clientX - startX;
      dy += e.clientY - startY;
      startX = e.clientX;
      startY = e.clientY;
      el.style.transform = `translate(${dx}px, ${dy}px)`;
    };

    document.onmouseup = () => {
      document.onmousemove = null;
    };
  };
}

/* ===================== STATE HANDLING ===================== */

function applyOverlayState(allowed) {
  if (allowed) createOverlay();
  else removeOverlay();
}

chrome.storage.sync.get("overlayAllowed", ({ overlayAllowed }) => {
  applyOverlayState(overlayAllowed === true);
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "OVERLAY_PERMISSION") {
    applyOverlayState(msg.allowed === true);
  }
});

/* ===================== FACT CHECK RESULT ===================== */

chrome.runtime.onMessage.addListener((msg) => {

  if (msg.type !== "FACT_CHECK_RESULT") return;

  console.log("📊 Fact check result received:", msg.payload);

  showFactCheckResults(msg.payload);

});

function showFactCheckResults(data) {

  if (!overlay) createOverlay();

  const old = document.getElementById("veritas-result-panel");
  if (old) old.remove();

  const panel = document.createElement("div");
  panel.id = "veritas-result-panel";

  Object.assign(panel.style, {
    position: "fixed",
    bottom: "100px",
    right: "24px",
    width: "340px",
    maxHeight: "400px",
    overflowY: "auto",
    background: "#0E1411",
    border: "2px solid #3A5F4D",
    borderRadius: "12px",
    padding: "12px",
    color: "#E6ECE8",
    zIndex: "2147483647",
    fontSize: "13px",
    boxShadow: "0 8px 20px rgba(0,0,0,0.6)",
    fontFamily: "system-ui",
    lineHeight: "1.4"
  });

  const title = document.createElement("div");
  title.innerText = "MadMax Fact Check";
  title.style.fontWeight = "bold";
  title.style.marginBottom = "10px";
  title.style.fontSize = "14px";

  const closeBtn = document.createElement("span");
  closeBtn.innerText = "✕";
  closeBtn.style.float = "right";
  closeBtn.style.cursor = "pointer";
  closeBtn.style.opacity = "0.7";
  closeBtn.onclick = () => panel.remove();

  title.appendChild(closeBtn);

  panel.appendChild(title);

  if (!data.results || data.results.length === 0) {
    const empty = document.createElement("div");
    empty.innerText = "No claims detected.";
    panel.appendChild(empty);
  }

  data.results.forEach(r => {

    const block = document.createElement("div");
    block.style.marginBottom = "12px";
    block.style.borderTop = "1px solid #3A5F4D";
    block.style.paddingTop = "8px";

    const claim = document.createElement("div");
    claim.innerText = `Claim: ${r.claim}`;
    claim.style.fontWeight = "bold";

    const verdict = document.createElement("div");
    verdict.innerText = `Verdict: ${r.verdict}`;

    if (r.verdict === "REFUTED") verdict.style.color = "#ff6b6b";
    if (r.verdict === "SUPPORTED") verdict.style.color = "#4cd964";
    if (r.verdict === "INSUFFICIENT") verdict.style.color = "#ffd166";

    const scores = document.createElement("div");

    if (r.scores) {
      scores.innerText =
        `Scores → contradiction: ${r.scores.contradiction.toFixed(2)} | ` +
        `neutral: ${r.scores.neutral.toFixed(2)} | ` +
        `entailment: ${r.scores.entailment.toFixed(2)}`;
    } else {
      scores.innerText = "Scores: unavailable";
      scores.style.opacity = "0.7";
    }

    const citations = document.createElement("div");

    if (r.citations && r.citations.length > 0) {
      citations.innerHTML =
        "<b>Sources:</b><br>" +
        r.citations
          .map(c => {
            const domain = new URL(c).hostname.replace("www.", "");
            return `<a href="${c}" target="_blank" style="color:#9AD1B5">${domain}</a>`;
          })
          .join("<br>");
    }

    block.appendChild(claim);
    block.appendChild(verdict);
    block.appendChild(scores);

    /* ---------- Confidence Bar ---------- */

    if (r.scores) {

      const confidence = document.createElement("div");
      confidence.style.marginTop = "6px";

      const bar = document.createElement("div");
      bar.style.height = "6px";
      bar.style.background = "#1c2b25";
      bar.style.borderRadius = "4px";
      bar.style.overflow = "hidden";

      const fill = document.createElement("div");
      fill.style.height = "100%";

      const conf = Math.max(
        r.scores.contradiction,
        r.scores.entailment
      );

      fill.style.width = `${Math.round(conf * 100)}%`;

      fill.style.background =
        r.verdict === "REFUTED"
          ? "#ff6b6b"
          : r.verdict === "SUPPORTED"
          ? "#4cd964"
          : "#ffd166";

      bar.appendChild(fill);
      confidence.appendChild(bar);

      block.appendChild(confidence);
    }

    block.appendChild(citations);

    panel.appendChild(block);

  });

  document.body.appendChild(panel);
}