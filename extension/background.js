console.log("🔐 MadMax SW booted");

const PROJECT_ID = "apgcphpqeqhpeynvhlzm";

let offscreenCreated = false;

async function ensureOffscreen() {
  if (!chrome.offscreen) {
    console.error("❌ chrome.offscreen API not available");
    return;
  }

  const exists = await chrome.offscreen.hasDocument();
  if (exists) return;

  await chrome.offscreen.createDocument({
    url: "offscreen.html",
    reasons: ["USER_MEDIA"],
    justification: "Single screenshot capture"
  });

  // Give it time to boot so inspector appears
  await new Promise(resolve => setTimeout(resolve, 500));
}

async function pollForResult(resultKey) {

  const url = `https://veritas-captures.s3.eu-north-1.amazonaws.com/${resultKey}`;

  console.log("🔎 Polling for result:", url);

  for (let i = 0; i < 60; i++) {

    try {

      const res = await fetch(url, { cache: "no-store" });

      if (res.ok) {

        const data = await res.json();

        console.log("✅ Fact check result received:", data);

        // Send result to active tab
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]?.id) {
            chrome.tabs.sendMessage(tabs[0].id, {
              type: "FACT_CHECK_RESULT",
              payload: data
            });
          }
        });

        chrome.runtime.sendMessage({
        type: "FACT_CHECK_RESULT",
        payload: data
        });

        

        return;
      }

    } catch (e) {
      console.log("Waiting for result...");
    }

    await new Promise(r => setTimeout(r, 2000));
  }

  console.log("❌ Result not found after polling");
}



async function fetchOverlayPermission(uid) {
  try {
    const res = await fetch(
      `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/settings/${uid}`
    );

    if (!res.ok) return false;

    const data = await res.json();

    return data.fields?.overlay?.booleanValue === true;
  } catch (e) {
    console.error("❌ Firestore REST error", e);
    return false;
  }
}

async function handleUID(uid) {
  if (!uid) return;

  const allowed = await fetchOverlayPermission(uid);

  await chrome.storage.sync.set({ overlayAllowed: allowed });

  chrome.tabs.query({}, tabs => {
    tabs.forEach(tab => {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, {
          type: "OVERLAY_PERMISSION",
          allowed
        });
      }
    });
  });
}

/* ================= LISTENERS ================= */

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get("veritas_uid", ({ veritas_uid }) => {
    if (veritas_uid) handleUID(veritas_uid);
  });
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "PING") {
    console.log("👋 SW awake");
  }
});


chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "sync" && changes.veritas_uid) {
    handleUID(changes.veritas_uid.newValue);
  }
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "STORE_UID" && msg.uid) {
    // Save UID and immediately fetch overlay permission
    chrome.storage.sync.set({ veritas_uid: msg.uid }, () => {
      handleUID(msg.uid); // fetch overlayAllowed and send message to tabs
    });
  }

  if (msg.type === "REFRESH_PERMISSION") {
    chrome.storage.sync.get("veritas_uid", ({ veritas_uid }) => {
      if (veritas_uid) handleUID(veritas_uid);
    });
  }
});

chrome.runtime.onMessage.addListener(async (msg) => {
  if (msg.type === "START_CAPTURE") {
    // 1️⃣ Take screenshot of visible tab
    const dataUrl = await chrome.tabs.captureVisibleTab(null, {
      format: "png"
    });

    // 2️⃣ Ensure offscreen exists
    await ensureOffscreen();

    // 3️⃣ Send image to offscreen
    chrome.offscreen.sendMessage({
      type: "UPLOAD_SCREENSHOT",
      dataUrl
    });
  }
});

chrome.runtime.onMessage.addListener(async (msg) => {
  if (msg.type === "TAKE_SCREENSHOT") {
    console.log("📸 TAKE_SCREENSHOT received");

    // 1️⃣ Capture screenshot
    const dataUrl = await chrome.tabs.captureVisibleTab(
      null,
      { format: "png" } // MUST be png or jpeg
    );

    // 2️⃣ Convert base64 → Blob
    const imageRes = await fetch(dataUrl);
    const blob = await imageRes.blob();

    // 3️⃣ Request signed upload URL from AWS
    console.log("☁️ Requesting signed upload URL");

    const signedRes = await fetch(
      "https://xmnumfrdj3.execute-api.eu-north-1.amazonaws.com/prod/signed-url"
    );

    if (!signedRes.ok) {
      console.error("❌ Signed URL request failed:", signedRes.status);
      const text = await signedRes.text();
      console.error("❌ Response body:", text);
      return;
    }

    const signedData = await signedRes.json();
    console.log("🔍 Raw signed response:", signedData);

    const { uploadUrl, key } = signedData;

    // 4️⃣ Upload screenshot directly to S3
    console.log("☁️ Uploading screenshot to S3:", key);

    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "image/png"
      },
      body: blob
    });
    
    console.log("📦 Upload status:", uploadRes.status);
    
    const uploadText = await uploadRes.text();
    console.log("📦 Upload response:", uploadText);
    
    if (!uploadRes.ok) {
      console.error("❌ Upload failed");
      return;
    }
    
    console.log("✅ Screenshot uploaded to S3");

    // Convert screenshot key → result key
    const resultKey = key
      .replace("screenshots/", "results/")
      .replace(".png", ".json");

    // Start polling for the result
    pollForResult(resultKey);
    
  }
});
