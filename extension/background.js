// listen for message from content script

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("background received message from content: ", message);

  if (message.message === "fingerprint_detected") {
    console.log("background received message from content:", message.message);

    // get tab ID from the sender
    const tabId = sender.tab.id;

    // update badge text
    chrome.action.setBadgeText({
      text: "🚨",
      tabId: tabId,
    });

    // Set tooltip text
    chrome.action.setTitle({
      title: "🚨 Likely Fingerprinting detected...Check the console.",
      tabId: tabId,
    });
  }
});

// Optional: Clear badge when tab is updated/refreshed
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "loading") {
    chrome.action.setBadgeText({ text: "", tabId: tabId });
  }
});
