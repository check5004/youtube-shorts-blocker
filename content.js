(function() {
  'use strict';
  
  let currentUrl = window.location.href;
  
  const observer = new MutationObserver(() => {
    if (window.location.href !== currentUrl) {
      currentUrl = window.location.href;
      handleUrlChange();
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  handleUrlChange();
  
  function handleUrlChange() {
    if (isYouTubeShorts(currentUrl)) {
      notifyBackgroundScript('shortsPageDetected');
    } else {
      notifyBackgroundScript('shortsPageLeft');
    }
  }
  
  function isYouTubeShorts(url) {
    return url && url.includes('youtube.com/shorts/');
  }
  
  function notifyBackgroundScript(event) {
    chrome.runtime.sendMessage({
      type: 'contentScriptEvent',
      event: event,
      url: currentUrl,
      tabId: chrome.runtime.id
    });
  }
  
  document.addEventListener('visibilitychange', () => {
    if (isYouTubeShorts(currentUrl)) {
      const event = document.hidden ? 'pageHidden' : 'pageVisible';
      notifyBackgroundScript(event);
    }
  });
  
  window.addEventListener('focus', () => {
    if (isYouTubeShorts(currentUrl)) {
      notifyBackgroundScript('pageVisible');
    }
  });
  
  window.addEventListener('blur', () => {
    if (isYouTubeShorts(currentUrl)) {
      notifyBackgroundScript('pageHidden');
    }
  });
})();
