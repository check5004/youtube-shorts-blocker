document.addEventListener('DOMContentLoaded', async () => {
  await initializePopup();
  setupEventListeners();
  startStatusUpdates();
});

const elements = {
  dailyViewTime: document.getElementById('dailyViewTime'),
  extensionCount: document.getElementById('extensionCount'),
  remainingTime: document.getElementById('remainingTime'),
  timerMinutes: document.getElementById('timerMinutes'),
  decreaseTime: document.getElementById('decreaseTime'),
  increaseTime: document.getElementById('increaseTime'),
  actionRadios: document.querySelectorAll('input[name="action"]'),
  tempDisableBtn: document.getElementById('tempDisableBtn'),
  todayOffToggle: document.getElementById('todayOffToggle'),
  alwaysOffToggle: document.getElementById('alwaysOffToggle'),
  debugModeToggle: document.getElementById('debugModeToggle'),
  debugControls: document.getElementById('debugControls'),
  forceLockBtn: document.getElementById('forceLockBtn'),
  exportDebugBtn: document.getElementById('exportDebugBtn')
};

async function initializePopup() {
  try {
    const status = await sendMessage({ type: 'getStatus' });
    updateUI(status);
  } catch (error) {
    console.error('Failed to initialize popup:', error);
  }
}

function setupEventListeners() {
  elements.decreaseTime.addEventListener('click', () => adjustTimer(-5));
  elements.increaseTime.addEventListener('click', () => adjustTimer(5));
  
  elements.timerMinutes.addEventListener('blur', handleTimerInput);
  elements.timerMinutes.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.target.blur();
    }
  });
  
  elements.actionRadios.forEach(radio => {
    radio.addEventListener('change', handleActionChange);
  });
  
  elements.tempDisableBtn.addEventListener('click', handleTempDisable);
  
  elements.todayOffToggle.addEventListener('change', handleTodayOffToggle);
  elements.alwaysOffToggle.addEventListener('change', handleAlwaysOffToggle);
  elements.debugModeToggle.addEventListener('change', handleDebugModeToggle);
  elements.forceLockBtn.addEventListener('click', handleForceLock);
  elements.exportDebugBtn.addEventListener('click', handleExportDebug);
}

function sendMessage(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else if (response && response.error) {
        reject(new Error(response.error));
      } else {
        resolve(response);
      }
    });
  });
}

function updateUI(status) {
  if (status.isRunning && status.remainingTime > 0) {
    elements.remainingTime.textContent = `残り ${formatTime(status.remainingTime)}`;
    elements.remainingTime.style.color = '#1a73e8';
  } else if (status.remainingTime <= 0) {
    elements.remainingTime.textContent = '時間切れ';
    elements.remainingTime.style.color = '#ea4335';
  } else {
    elements.remainingTime.textContent = '停止中';
    elements.remainingTime.style.color = '#5f6368';
  }
  
  elements.timerMinutes.value = status.settings.timerMinutes;
  
  elements.dailyViewTime.textContent = formatDuration(status.dailyViewTime);
  elements.extensionCount.textContent = `${status.settings.dailyStats.extensionCount || 0}回`;
  
  const actionRadio = document.querySelector(`input[name="action"][value="${status.settings.actionOnTimeout}"]`);
  if (actionRadio) {
    actionRadio.checked = true;
  }
  
  elements.todayOffToggle.checked = status.settings.todayOffUntil && new Date() < new Date(status.settings.todayOffUntil);
  elements.alwaysOffToggle.checked = status.settings.isTimerAlwaysDisabled;
  elements.debugModeToggle.checked = status.settings.debugMode || false;
  
  // デバッグモードに応じてコントロールの表示/非表示を切り替え
  elements.debugControls.style.display = status.settings.debugMode ? 'block' : 'none';
  
  // デバッグモードに応じてタイマー入力の設定を変更
  if (status.settings.debugMode) {
    elements.timerMinutes.min = '0.1';
    elements.timerMinutes.step = '0.1';
  } else {
    elements.timerMinutes.min = '5';
    elements.timerMinutes.step = '5';
  }
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

function formatDuration(milliseconds) {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  if (hours > 0) {
    return `${hours}時${minutes}分${seconds}秒`;
  } else if (minutes > 0) {
    return `${minutes}分${seconds}秒`;
  } else {
    return `${seconds}秒`;
  }
}

async function adjustTimer(delta) {
  const status = await sendMessage({ type: 'getStatus' });
  const isDebugMode = status.settings.debugMode || false;
  
  const currentValue = parseFloat(elements.timerMinutes.value);
  const minValue = isDebugMode ? 0.1 : 5;
  const step = isDebugMode ? delta * 0.1 : delta;
  const newValue = Math.max(minValue, Math.min(720, currentValue + step));
  
  elements.timerMinutes.value = isDebugMode ? newValue.toFixed(1) : Math.round(newValue);
  await updateTimerSetting(newValue);
}

async function handleTimerInput(event) {
  const status = await sendMessage({ type: 'getStatus' });
  const isDebugMode = status.settings.debugMode || false;
  
  let value = parseFloat(event.target.value);
  
  if (isDebugMode) {
    // デバッグモード: 0.1分単位で設定可能
    if (isNaN(value) || value < 0.1) {
      value = 0.1;
    } else if (value > 720) {
      value = 720;
    }
    event.target.value = value.toFixed(1);
  } else {
    // 通常モード: 5分単位
    if (isNaN(value) || value < 5) {
      value = 5;
    } else if (value > 720) {
      value = 720;
    } else {
      value = Math.ceil(value / 5) * 5;
    }
    event.target.value = value;
  }
  
  await updateTimerSetting(value);
}

async function updateTimerSetting(minutes) {
  try {
    await sendMessage({
      type: 'updateSettings',
      settings: { timerMinutes: minutes }
    });
  } catch (error) {
    console.error('Failed to update timer setting:', error);
  }
}

async function handleActionChange(event) {
  try {
    await sendMessage({
      type: 'updateSettings',
      settings: { actionOnTimeout: event.target.value }
    });
  } catch (error) {
    console.error('Failed to update action setting:', error);
  }
}

async function handleTempDisable() {
  try {
    await sendMessage({ type: 'tempDisableForTab' });
    elements.tempDisableBtn.textContent = '設定完了';
    elements.tempDisableBtn.disabled = true;
    
    setTimeout(() => {
      elements.tempDisableBtn.textContent = '今回のみタイマーを起動しない';
      elements.tempDisableBtn.disabled = false;
    }, 2000);
  } catch (error) {
    console.error('Failed to disable timer for tab:', error);
  }
}

async function handleTodayOffToggle(event) {
  try {
    const todayOffUntil = event.target.checked ? getTomorrowAt4AM().toISOString() : null;
    await sendMessage({
      type: 'updateSettings',
      settings: { todayOffUntil }
    });
  } catch (error) {
    console.error('Failed to update today off setting:', error);
  }
}

async function handleAlwaysOffToggle(event) {
  try {
    await sendMessage({
      type: 'updateSettings',
      settings: { isTimerAlwaysDisabled: event.target.checked }
    });
  } catch (error) {
    console.error('Failed to update always off setting:', error);
  }
}

async function handleDebugModeToggle(event) {
  try {
    await sendMessage({
      type: 'updateSettings',
      settings: { debugMode: event.target.checked }
    });
    
    // デバッグコントロールの表示/非表示を切り替え
    elements.debugControls.style.display = event.target.checked ? 'block' : 'none';
    
    // タイマー入力の設定を更新
    if (event.target.checked) {
      elements.timerMinutes.min = '0.1';
      elements.timerMinutes.step = '0.1';
    } else {
      elements.timerMinutes.min = '5';
      elements.timerMinutes.step = '5';
      // 通常モードに戻す場合、値を5分単位に丸める
      const currentValue = parseFloat(elements.timerMinutes.value);
      const roundedValue = Math.ceil(currentValue / 5) * 5;
      if (currentValue !== roundedValue) {
        elements.timerMinutes.value = roundedValue;
        await updateTimerSetting(roundedValue);
      }
    }
  } catch (error) {
    console.error('Failed to update debug mode setting:', error);
  }
}

async function handleForceLock() {
  try {
    await sendMessage({ type: 'forceLockScreen' });
    elements.forceLockBtn.textContent = 'ロック画面を起動しました';
    elements.forceLockBtn.disabled = true;
    
    setTimeout(() => {
      elements.forceLockBtn.textContent = 'ロック画面を強制起動';
      elements.forceLockBtn.disabled = false;
    }, 2000);
  } catch (error) {
    console.error('Failed to force lock screen:', error);
  }
}

function getTomorrowAt4AM() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(4, 0, 0, 0);
  return tomorrow;
}

function startStatusUpdates() {
  updateStatus();
  setInterval(updateStatus, 1000);
}

async function updateStatus() {
  try {
    const status = await sendMessage({ type: 'getStatus' });
    updateUI(status);
  } catch (error) {
    console.error('Failed to update status:', error);
  }
}

async function handleExportDebug() {
  try {
    // Get all storage data
    const allData = await chrome.storage.local.get(null);
    
    // Create debug export object
    const debugExport = {
      exportTime: new Date().toISOString(),
      extensionVersion: chrome.runtime.getManifest().version,
      settings: allData,
      debugEvents: allData.yt_shorts_blocker_debug_events || [],
      browserInfo: navigator.userAgent
    };
    
    // Convert to JSON and create download
    const jsonData = JSON.stringify(debugExport, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    // Create download link
    const a = document.createElement('a');
    a.href = url;
    a.download = `yt-shorts-blocker-debug-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    a.click();
    
    // Clean up
    URL.revokeObjectURL(url);
    
    // Update button to show success
    elements.exportDebugBtn.textContent = 'エクスポート完了！';
    elements.exportDebugBtn.disabled = true;
    
    setTimeout(() => {
      elements.exportDebugBtn.textContent = 'デバッグ情報をエクスポート';
      elements.exportDebugBtn.disabled = false;
    }, 2000);
  } catch (error) {
    console.error('Failed to export debug data:', error);
    alert('デバッグ情報のエクスポートに失敗しました');
  }
}
