document.getElementById("toggleWidget").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const hostname = new URL(tab.url).hostname;
  const origin = new URL(tab.url).origin;

  // I'd rather just get permissions then go to placement mode straight away, but can't cause popup closes instantly
  // Open issue: https://issues.chromium.org/issues/41452827
  const hasPermission = await chrome.permissions.contains({
    origins: [origin + "/*"],
  });

  if (!hasPermission) {
    const granted = await chrome.permissions.request({
      origins: [origin + "/*"],
    });

    if (!granted) {
      console.debug("Permission denied");
      return;
    }
  }

  const widgetData = await chrome.storage.local.get(hostname);

  if (widgetData[hostname]) {
    console.debug("removing");
    await chrome.storage.local.remove(hostname);
    chrome.tabs.sendMessage(tab.id, { action: "removeWidget" });
  } else {
    console.debug("enabling placement mode");
    chrome.tabs.sendMessage(tab.id, { action: "enablePlacement" });
  }

  window.close();
});

document.addEventListener("DOMContentLoaded", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const hostname = new URL(tab.url).hostname;
  const origin = new URL(tab.url).origin;

  const hasPermission = await chrome.permissions.contains({
    origins: [origin + "/*"],
  });

  const widgetData = await chrome.storage.local.get(hostname);
  const button = document.getElementById("toggleWidget");

  if (!hasPermission) {
    button.textContent = "Add permissions for " + hostname;
  } else {
    button.textContent = widgetData[hostname] ? "Remove" : "Add";
  }
});
