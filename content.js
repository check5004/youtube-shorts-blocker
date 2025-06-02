(function() {
  'use strict';
  
  let currentUrl = window.location.href;
  let debugMode = false;
  
  // Get debug mode setting
  chrome.storage.local.get(['debugMode'], (result) => {
    debugMode = result.debugMode || false;
  });
  
  // Listen for debug mode changes
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.debugMode) {
      debugMode = changes.debugMode.newValue || false;
    }
  });
  
  function debugLog(...args) {
    if (debugMode) {
      console.log('[YT Shorts Blocker Content]', ...args);
    }
  }
  
  const observer = new MutationObserver(() => {
    if (window.location.href !== currentUrl) {
      debugLog('URL changed from', currentUrl, 'to', window.location.href);
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
      debugLog('YouTube Shorts detected:', currentUrl);
      notifyBackgroundScript('shortsPageDetected');
    } else {
      debugLog('Left YouTube Shorts:', currentUrl);
      notifyBackgroundScript('shortsPageLeft');
    }
  }
  
  function isYouTubeShorts(url) {
    return url && url.includes('youtube.com/shorts/');
  }
  
  function notifyBackgroundScript(event) {
    debugLog('Sending event to background:', event);
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
      debugLog('Visibility changed:', event);
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
  
  // Listen for pause video message from background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'pauseVideo') {
      debugLog('Received pause video message');
      pauseYouTubeVideo();
      sendResponse({ success: true });
    }
    return true;
  });
  
  // Function to pause YouTube video
  function pauseYouTubeVideo() {
    try {
      // Method 1: Find and click the video element to pause
      const video = document.querySelector('video');
      if (video && !video.paused) {
        video.pause();
        debugLog('Video paused using video.pause()');
        return;
      }
      
      // Method 2: Try clicking on the video container (YouTube Shorts specific)
      const videoContainer = document.querySelector('#shorts-player, .html5-video-container');
      if (videoContainer) {
        videoContainer.click();
        debugLog('Video paused using container click');
        return;
      }
      
      // Method 3: Simulate spacebar press as fallback
      const event = new KeyboardEvent('keydown', {
        key: ' ',
        code: 'Space',
        keyCode: 32,
        which: 32,
        bubbles: true
      });
      document.dispatchEvent(event);
      debugLog('Video paused using spacebar simulation');
    } catch (error) {
      console.error('Failed to pause video:', error);
    }
  }
})();
