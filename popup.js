document.addEventListener('DOMContentLoaded', async () => {
  await initializePopup();
  setupEventListeners();
  startStatusUpdates();
});

const elements = {
  dailyViewTime: document.getElementById('dailyViewTime'),
  remainingTime: document.getElementById('remainingTime'),
  timerMinutes: document.getElementById('timerMinutes'),
  decreaseTime: document.getElementById('decreaseTime'),
  increaseTime: document.getElementById('increaseTime'),
  actionRadios: document.querySelectorAll('input[name="action"]'),
  tempDisableBtn: document.getElementById('tempDisableBtn'),
  todayOffToggle: document.getElementById('todayOffToggle'),
  alwaysOffToggle: document.getElementById('alwaysOffToggle')
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
  
  const actionRadio = document.querySelector(`input[name="action"][value="${status.settings.actionOnTimeout}"]`);
  if (actionRadio) {
    actionRadio.checked = true;
  }
  
  elements.todayOffToggle.checked = status.settings.todayOffUntil && new Date() < new Date(status.settings.todayOffUntil);
  elements.alwaysOffToggle.checked = status.settings.isTimerAlwaysDisabled;
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
  const currentValue = parseInt(elements.timerMinutes.value);
  const newValue = Math.max(5, Math.min(720, currentValue + delta));
  
  elements.timerMinutes.value = newValue;
  await updateTimerSetting(newValue);
}

async function handleTimerInput(event) {
  let value = parseInt(event.target.value);
  
  if (isNaN(value) || value < 5) {
    value = 5;
  } else if (value > 720) {
    value = 720;
  } else {
    value = Math.ceil(value / 5) * 5;
  }
  
  event.target.value = value;
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
