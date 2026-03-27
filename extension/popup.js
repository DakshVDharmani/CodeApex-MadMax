const startBtn = document.getElementById("start");
const status = document.getElementById("status");
const results = document.getElementById("results");

startBtn.onclick = () => {

  console.log("▶️ START clicked");

  status.innerText = "Scanning screen...";
  results.innerHTML = "";

  startBtn.disabled = true;

  chrome.runtime.sendMessage({
    type: "TAKE_SCREENSHOT"
  });
};


/* receive result */

chrome.runtime.onMessage.addListener((msg) => {

  if (msg.type !== "FACT_CHECK_RESULT") return;

  console.log("📊 Popup received result:", msg.payload);

  startBtn.disabled = false;

  status.innerText = "Scan complete";

  renderResults(msg.payload);

});


function renderResults(data){

  results.innerHTML = "";

  if (!data.results || data.results.length === 0){
    results.innerText = "No claims detected";
    return;
  }

  data.results.forEach(r => {

    const block = document.createElement("div");
    block.className = "block";

    const claim = document.createElement("div");
    claim.className = "claim";
    claim.innerText = r.claim;

    const verdict = document.createElement("div");
    verdict.className = "verdict";
    verdict.innerText = "Verdict: " + r.verdict;

    if (r.verdict === "REFUTED") verdict.style.color="#ff6b6b";
    if (r.verdict === "SUPPORTED") verdict.style.color="#4cd964";
    if (r.verdict === "INSUFFICIENT") verdict.style.color="#ffd166";

    const scores = document.createElement("div");

    if (r.scores){
      scores.innerText =
        "Scores → contradiction " + r.scores.contradiction.toFixed(2) +
        " | neutral " + r.scores.neutral.toFixed(2) +
        " | entailment " + r.scores.entailment.toFixed(2);
    }

    const citations = document.createElement("div");

    if (r.citations && r.citations.length){

      citations.innerHTML = "<b>Sources</b><br>";

      r.citations.forEach(c => {

        const domain = new URL(c).hostname.replace("www.","");

        const link = document.createElement("a");
        link.href = c;
        link.target = "_blank";
        link.innerText = domain;

        citations.appendChild(link);
        citations.appendChild(document.createElement("br"));

      });

    }

    block.appendChild(claim);
    block.appendChild(verdict);
    block.appendChild(scores);
    block.appendChild(citations);

    results.appendChild(block);

  });

}