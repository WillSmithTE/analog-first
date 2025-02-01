document.getElementById("toggleWidget").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const hostname = new URL(tab.url).hostname;

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

// Update button text when popup opens
document.addEventListener("DOMContentLoaded", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const hostname = new URL(tab.url).hostname;
  const widgetData = await chrome.storage.local.get(hostname);

  const button = document.getElementById("toggleWidget");
  button.textContent = widgetData[hostname] ? "Remove" : "Add";
});
