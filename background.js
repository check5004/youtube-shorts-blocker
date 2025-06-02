
const DEFAULT_SETTINGS = {
  timerMinutes: 20,
  actionOnTimeout: 'lock', // 'lock' or 'redirect'
  isTimerAlwaysDisabled: false,
  todayOffUntil: null,
  tempDisableForTab: new Set(),
  dailyStats: {
    totalViewTime: 0,
    extensionCount: 0,
    lastResetDate: null
  },
  debugMode: false
};

let currentSettings = { ...DEFAULT_SETTINGS };
let timerState = {
  isRunning: false,
  startTime: null,
  elapsedTime: 0,
  activeShortsTabs: new Set(),
  lastSaveTime: null
};

// Debug logging function
function debugLog(...args) {
  if (currentSettings.debugMode) {
    console.log('[YT Shorts Blocker]', new Date().toISOString(), ...args);
  }
}

chrome.runtime.onInstalled.addListener(async () => {
  await initializeSettings();
  await setupDailyReset();
  await setupAutoSave();
});

chrome.runtime.onStartup.addListener(async () => {
  await loadSettings();
  await checkDailyReset();
  await setupDailyReset();
  await setupAutoSave();
});

async function initializeSettings() {
  const stored = await chrome.storage.local.get(Object.keys(DEFAULT_SETTINGS));
  currentSettings = { ...DEFAULT_SETTINGS, ...stored };
  
  if (stored.tempDisableForTab) {
    currentSettings.tempDisableForTab = new Set(stored.tempDisableForTab);
  }
  
  await saveSettings();
}

async function loadSettings() {
  const stored = await chrome.storage.local.get(Object.keys(DEFAULT_SETTINGS));
  currentSettings = { ...DEFAULT_SETTINGS, ...stored };
  
  if (stored.tempDisableForTab) {
    currentSettings.tempDisableForTab = new Set(stored.tempDisableForTab);
  }
}

async function saveSettings() {
  const toSave = { ...currentSettings };
  toSave.tempDisableForTab = Array.from(currentSettings.tempDisableForTab);
  await chrome.storage.local.set(toSave);
}

function isYouTubeShorts(url) {
  return url && url.includes('youtube.com/shorts/');
}

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    await handleTabUpdate(tabId, tab.url);
  }
});

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId);
  await handleTabActivation(activeInfo.tabId, tab.url);
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  await handleTabRemoved(tabId);
});

async function handleTabUpdate(tabId, url) {
  if (isYouTubeShorts(url)) {
    debugLog('YouTube Shorts detected on tab', tabId, 'URL:', url);
    timerState.activeShortsTabs.add(tabId);
    await startTimerIfNeeded();
  } else {
    debugLog('Non-Shorts page on tab', tabId, 'URL:', url);
    timerState.activeShortsTabs.delete(tabId);
    currentSettings.tempDisableForTab.delete(tabId);
    await saveSettings();
    
    if (timerState.activeShortsTabs.size === 0) {
      debugLog('No active Shorts tabs, pausing timer');
      await pauseTimer();
    }
  }
}

async function handleTabActivation(tabId, url) {
  if (isYouTubeShorts(url)) {
    timerState.activeShortsTabs.add(tabId);
    await startTimerIfNeeded();
  }
}

async function handleTabRemoved(tabId) {
  timerState.activeShortsTabs.delete(tabId);
  currentSettings.tempDisableForTab.delete(tabId);
  await saveSettings();
  
  if (timerState.activeShortsTabs.size === 0) {
    await pauseTimer();
  }
}

async function startTimerIfNeeded() {
  if (shouldStartTimer()) {
    await startTimer();
  }
}

function shouldStartTimer() {
  if (currentSettings.isTimerAlwaysDisabled) return false;
  
  if (currentSettings.todayOffUntil && new Date() < new Date(currentSettings.todayOffUntil)) {
    return false;
  }
  
  const activeTab = Array.from(timerState.activeShortsTabs)[0];
  if (activeTab && currentSettings.tempDisableForTab.has(activeTab)) {
    return false;
  }
  
  return timerState.activeShortsTabs.size > 0 && !timerState.isRunning;
}

async function startTimer() {
  if (timerState.isRunning) return;
  
  timerState.isRunning = true;
  timerState.startTime = Date.now();
  timerState.lastSaveTime = Date.now();
  
  const remainingTime = (currentSettings.timerMinutes * 60 * 1000) - timerState.elapsedTime;
  const delayInMinutes = remainingTime / (60 * 1000);
  
  // Chrome alarms have a minimum delay of 1 minute in production, but allow shorter delays in debug mode
  if (currentSettings.debugMode && delayInMinutes < 1) {
    // For debug mode with very short timers, use a shorter alarm
    await chrome.alarms.create('shortsTimer', { delayInMinutes: Math.max(0.1, delayInMinutes) });
  } else {
    await chrome.alarms.create('shortsTimer', { delayInMinutes: Math.max(1, delayInMinutes) });
  }
  
  debugLog('Timer started, remaining time:', remainingTime / 1000, 'seconds');
}

async function pauseTimer() {
  if (!timerState.isRunning) return;
  
  timerState.isRunning = false;
  if (timerState.startTime) {
    const sessionTime = Date.now() - timerState.startTime;
    timerState.elapsedTime += sessionTime;
    currentSettings.dailyStats.totalViewTime += sessionTime;
    await saveSettings();
    timerState.startTime = null;
  }
  
  await chrome.alarms.clear('shortsTimer');
  debugLog('Timer paused, elapsed time:', timerState.elapsedTime / 1000, 'seconds');
}

async function resetTimer() {
  timerState.isRunning = false;
  timerState.startTime = null;
  timerState.elapsedTime = 0;
  await chrome.alarms.clear('shortsTimer');
  debugLog('Timer reset');
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'shortsTimer') {
    await handleTimerExpired();
  } else if (alarm.name === 'dailyReset') {
    await performDailyReset();
  } else if (alarm.name === 'autoSave') {
    await performAutoSave();
  }
});

async function handleTimerExpired() {
  debugLog('Timer expired, executing action:', currentSettings.actionOnTimeout);
  
  const totalViewTime = timerState.elapsedTime + (timerState.startTime ? Date.now() - timerState.startTime : 0);
  currentSettings.dailyStats.totalViewTime += totalViewTime;
  await saveSettings();
  
  if (currentSettings.actionOnTimeout === 'lock') {
    await showLockScreen();
  } else if (currentSettings.actionOnTimeout === 'redirect') {
    await redirectToYouTubeHome();
  }
  
  await resetTimer();
}

async function showLockScreen() {
  const activeTabs = Array.from(timerState.activeShortsTabs);
  
  // If no active Shorts tabs (e.g., force lock), show on current active tab
  if (activeTabs.length === 0) {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (activeTab) {
      activeTabs.push(activeTab.id);
    }
  }
  
  // First, pause videos on all active tabs
  for (const tabId of activeTabs) {
    try {
      await chrome.tabs.sendMessage(tabId, { type: 'pauseVideo' });
      debugLog('Sent pause video message to tab', tabId);
    } catch (error) {
      debugLog('Failed to send pause message to tab', tabId, error);
    }
  }
  
  // Then show lock screen
  for (const tabId of activeTabs) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['lock_screen.js']
      });
    } catch (error) {
      console.error('Failed to inject lock screen:', error);
    }
  }
}

async function redirectToYouTubeHome() {
  const activeTabs = Array.from(timerState.activeShortsTabs);
  for (const tabId of activeTabs) {
    try {
      await chrome.tabs.update(tabId, { url: 'https://www.youtube.com/' });
    } catch (error) {
      console.error('Failed to redirect tab:', error);
    }
  }
}

async function setupDailyReset() {
  const now = new Date();
  const next4AM = new Date(now);
  next4AM.setHours(4, 0, 0, 0);
  
  if (next4AM <= now) {
    next4AM.setDate(next4AM.getDate() + 1);
  }
  
  const delayInMinutes = (next4AM.getTime() - now.getTime()) / (60 * 1000);
  await chrome.alarms.create('dailyReset', { delayInMinutes, periodInMinutes: 24 * 60 });
}

async function setupAutoSave() {
  // Set up alarm to save every minute
  await chrome.alarms.create('autoSave', { periodInMinutes: 1 });
}

async function performAutoSave() {
  if (timerState.isRunning && timerState.startTime) {
    const now = Date.now();
    const sessionTime = now - timerState.lastSaveTime;
    
    if (sessionTime > 0) {
      currentSettings.dailyStats.totalViewTime += sessionTime;
      timerState.lastSaveTime = now;
      await saveSettings();
      debugLog('Auto-saved viewing time:', sessionTime / 1000, 'seconds');
    }
  }
}

async function checkDailyReset() {
  const now = new Date();
  const lastReset = currentSettings.dailyStats.lastResetDate ? new Date(currentSettings.dailyStats.lastResetDate) : null;
  
  if (!lastReset || shouldResetToday(lastReset, now)) {
    await performDailyReset();
  }
}

function shouldResetToday(lastReset, now) {
  const lastReset4AM = new Date(lastReset);
  lastReset4AM.setHours(4, 0, 0, 0);
  
  const today4AM = new Date(now);
  today4AM.setHours(4, 0, 0, 0);
  
  return today4AM > lastReset4AM;
}

async function performDailyReset() {
  debugLog('Performing daily reset');
  
  currentSettings.dailyStats = {
    totalViewTime: 0,
    extensionCount: 0,
    lastResetDate: new Date().toISOString()
  };
  
  const now = new Date();
  if (currentSettings.todayOffUntil && new Date(currentSettings.todayOffUntil) < now) {
    currentSettings.todayOffUntil = null;
  }
  
  await saveSettings();
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender, sendResponse);
  return true; // 非同期レスポンスを示す
});

async function handleMessage(message, sender, sendResponse) {
  debugLog('Received message:', message.type, message);
  try {
    switch (message.type) {
      case 'getStatus':
        const status = await getTimerStatus();
        debugLog('Sending status:', status);
        sendResponse(status);
        break;
        
      case 'updateSettings':
        debugLog('Updating settings:', message.settings);
        Object.assign(currentSettings, message.settings);
        await saveSettings();
        sendResponse({ success: true });
        break;
        
      case 'extendTimer':
        await extendTimer();
        sendResponse({ success: true });
        break;
        
      case 'goToYouTubeHome':
        await redirectToYouTubeHome();
        sendResponse({ success: true });
        break;
        
      case 'tempDisableForTab':
        const activeTab = Array.from(timerState.activeShortsTabs)[0];
        if (activeTab) {
          currentSettings.tempDisableForTab.add(activeTab);
          await saveSettings();
          await pauseTimer();
        }
        sendResponse({ success: true });
        break;
        
      case 'getLockScreenData':
        const lockData = await getLockScreenData();
        sendResponse(lockData);
        break;
        
      case 'forceLockScreen':
        debugLog('Force lock screen requested');
        await showLockScreen();
        sendResponse({ success: true });
        break;
        
      default:
        sendResponse({ error: 'Unknown message type' });
    }
  } catch (error) {
    console.error('Error handling message:', error);
    sendResponse({ error: error.message });
  }
}

async function getTimerStatus() {
  const currentTime = Date.now();
  let remainingTime = 0;
  let realTimeDailyViewTime = currentSettings.dailyStats.totalViewTime;
  
  if (timerState.isRunning && timerState.startTime) {
    const currentElapsed = timerState.elapsedTime + (currentTime - timerState.startTime);
    const totalTime = currentSettings.timerMinutes * 60 * 1000;
    remainingTime = Math.max(0, totalTime - currentElapsed);
    // Add current session time to daily view time for real-time display
    realTimeDailyViewTime += (currentTime - timerState.startTime);
  } else if (!timerState.isRunning && timerState.elapsedTime > 0) {
    const totalTime = currentSettings.timerMinutes * 60 * 1000;
    remainingTime = Math.max(0, totalTime - timerState.elapsedTime);
  } else {
    remainingTime = currentSettings.timerMinutes * 60 * 1000;
  }
  
  return {
    isRunning: timerState.isRunning,
    remainingTime: Math.floor(remainingTime / 1000),
    settings: currentSettings,
    dailyViewTime: realTimeDailyViewTime
  };
}

async function extendTimer() {
  currentSettings.dailyStats.extensionCount++;
  await saveSettings();
  
  const extensionTime = currentSettings.timerMinutes * 60 * 1000;
  timerState.elapsedTime = Math.max(0, timerState.elapsedTime - extensionTime);
  
  if (timerState.isRunning) {
    await chrome.alarms.clear('shortsTimer');
    const remainingTime = (currentSettings.timerMinutes * 60 * 1000) - timerState.elapsedTime;
    const delayInMinutes = remainingTime / (60 * 1000);
    
    if (currentSettings.debugMode && delayInMinutes < 1) {
      await chrome.alarms.create('shortsTimer', { delayInMinutes: Math.max(0.1, delayInMinutes) });
    } else {
      await chrome.alarms.create('shortsTimer', { delayInMinutes: Math.max(1, delayInMinutes) });
    }
  }
  
  debugLog('Timer extended by', currentSettings.timerMinutes, 'minutes');
}

async function getLockScreenData() {
  const messages = await loadMessages();
  const extensionCount = currentSettings.dailyStats.extensionCount;
  
  let messageCategory;
  if (extensionCount <= 4) {
    messageCategory = 'gentle';
  } else if (extensionCount <= 9) {
    messageCategory = 'warning';
  } else {
    messageCategory = 'strict';
  }
  
  const categoryMessages = messages[messageCategory] || messages.gentle;
  const randomMessage = categoryMessages[Math.floor(Math.random() * categoryMessages.length)];
  
  const currentViewTime = timerState.elapsedTime + (timerState.startTime ? Date.now() - timerState.startTime : 0);
  const realTimeDailyViewTime = currentSettings.dailyStats.totalViewTime + (timerState.startTime ? Date.now() - timerState.startTime : 0);
  
  return {
    message: randomMessage,
    currentViewTime: Math.floor(currentViewTime / 1000),
    dailyViewTime: Math.floor(realTimeDailyViewTime / 1000),
    extensionCount
  };
}

async function loadMessages() {
  try {
    const response = await fetch(chrome.runtime.getURL('messages.txt'));
    const text = await response.text();
    const lines = text.split('\n').filter(line => line.trim());
    
    return {
      gentle: lines.slice(0, 5),
      warning: lines.slice(5, 10),
      strict: lines.slice(10, 15)
    };
  } catch (error) {
    console.error('Failed to load messages:', error);
    return {
      gentle: ['少し休憩しませんか？'],
      warning: ['集中しすぎかも？一度リフレッシュしましょう'],
      strict: ['さすがに見過ぎでは…？一度YouTubeを閉じましょう！']
    };
  }
}
