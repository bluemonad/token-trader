/// <reference types="chrome"/>

const APP = "/popup.html";
const OPTIONS = "/options.html"

async function createPopup(relativePath: string) {
  chrome.tabs.create({
    url: chrome.runtime.getURL(relativePath),
    active: false
  }, (tab) => {
    chrome.windows.create({
      tabId: tab.id,
      type: "popup",
      focused: true,
      width: 350,
      height: 570
    })
  }
  )
}

async function openApp() {
  chrome.tabs.query({
    url: chrome.runtime.getURL("/*")
  }, (tabs) => {
    let tabsNoOptions = tabs.filter((t) => t.url.includes(OPTIONS) === false)
    if (tabsNoOptions.length === 0) {
      createPopup(APP);
    }
    if (tabsNoOptions.length > 1) {
      for (let i = 1; i < tabsNoOptions.length; i += 1) {
        chrome.tabs.remove(tabsNoOptions[i].id);
      }
    }

    let windowUpdateInfo = { focused: true};
    if (tabsNoOptions.length >= 1) {
      chrome.tabs.update(tabsNoOptions[0].id, {});
      chrome.windows.update(tabsNoOptions[0].windowId, windowUpdateInfo)
    }
  }
  )
}

chrome.action.onClicked.addListener(() => {
  openApp();
});



