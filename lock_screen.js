(function() {
  'use strict';
  
  let debugMode = false;
  
  // Get debug mode setting
  chrome.storage.local.get(['debugMode'], (result) => {
    debugMode = result.debugMode || false;
  });
  
  function debugLog(...args) {
    if (debugMode) {
      console.log('[YT Shorts Blocker Lock Screen]', ...args);
    }
  }
  
  if (document.getElementById('youtube-shorts-blocker-overlay')) {
    debugLog('Lock screen already exists, skipping');
    return;
  }
  
  debugLog('Requesting lock screen data');
  chrome.runtime.sendMessage({ type: 'getLockScreenData' }, (response) => {
    if (response && !response.error) {
      debugLog('Lock screen data received:', response);
      showLockScreen(response);
    } else {
      debugLog('Error getting lock screen data:', response);
    }
  });
  
  function showLockScreen(data) {
    const overlay = document.createElement('div');
    overlay.id = 'youtube-shorts-blocker-overlay';
    overlay.innerHTML = createLockScreenHTML(data);
    
    applyLockScreenStyles(overlay);
    
    document.body.appendChild(overlay);
    
    setupLockScreenEvents(overlay);
    
    document.addEventListener('keydown', blockKeyboardEvents, true);
    document.addEventListener('keyup', blockKeyboardEvents, true);
    document.addEventListener('keypress', blockKeyboardEvents, true);
  }
  
  function createLockScreenHTML(data) {
    return `
      <div class="lock-screen-content">
        <div class="message-area">
          <h2 class="lock-title">休憩時間です</h2>
          <p class="lock-message">${data.message}</p>
        </div>
        
        <div class="stats-area">
          <div class="stat-item">
            <span class="stat-label">今回の視聴時間:</span>
            <span class="stat-value">${formatTime(data.currentViewTime)}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">本日の累計視聴時間:</span>
            <span class="stat-value">${formatTime(data.dailyViewTime)}</span>
          </div>
        </div>
        
        <div class="button-area">
          <button id="extend-timer-btn" class="lock-btn extend-btn">
            時間延長
          </button>
          <button id="go-home-btn" class="lock-btn home-btn">
            YouTubeホームへ
          </button>
        </div>
        
        <div class="extension-count">
          ${data.extensionCount > 0 ? `本日の延長回数: ${data.extensionCount}回` : ''}
        </div>
      </div>
    `;
  }
  
  function applyLockScreenStyles(overlay) {
    const styles = `
      #youtube-shorts-blocker-overlay {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        background: rgba(0, 0, 0, 0.9) !important;
        z-index: 999999 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
        color: white !important;
      }
      
      .lock-screen-content {
        background: #1a1a1a !important;
        border-radius: 16px !important;
        padding: 40px !important;
        max-width: 500px !important;
        width: 90% !important;
        text-align: center !important;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5) !important;
      }
      
      .lock-title {
        font-size: 28px !important;
        font-weight: 600 !important;
        margin-bottom: 16px !important;
        color: #ff6b6b !important;
      }
      
      .lock-message {
        font-size: 18px !important;
        line-height: 1.5 !important;
        margin-bottom: 32px !important;
        color: #e0e0e0 !important;
      }
      
      .stats-area {
        margin-bottom: 32px !important;
        padding: 20px !important;
        background: rgba(255, 255, 255, 0.1) !important;
        border-radius: 8px !important;
      }
      
      .stat-item {
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
        margin-bottom: 12px !important;
        font-size: 16px !important;
      }
      
      .stat-item:last-child {
        margin-bottom: 0 !important;
      }
      
      .stat-label {
        color: #b0b0b0 !important;
      }
      
      .stat-value {
        font-weight: 600 !important;
        color: #4fc3f7 !important;
      }
      
      .button-area {
        display: flex !important;
        gap: 16px !important;
        justify-content: center !important;
        margin-bottom: 20px !important;
      }
      
      .lock-btn {
        padding: 12px 24px !important;
        border: none !important;
        border-radius: 8px !important;
        font-size: 16px !important;
        font-weight: 600 !important;
        cursor: pointer !important;
        transition: all 0.3s ease !important;
        min-width: 140px !important;
      }
      
      .extend-btn {
        background: #ff9800 !important;
        color: white !important;
      }
      
      .extend-btn:hover {
        background: #f57c00 !important;
        transform: translateY(-2px) !important;
      }
      
      .home-btn {
        background: #4caf50 !important;
        color: white !important;
      }
      
      .home-btn:hover {
        background: #388e3c !important;
        transform: translateY(-2px) !important;
      }
      
      .extension-count {
        font-size: 14px !important;
        color: #888 !important;
        font-style: italic !important;
      }
      
      @media (max-width: 600px) {
        .lock-screen-content {
          padding: 24px !important;
          margin: 20px !important;
        }
        
        .button-area {
          flex-direction: column !important;
        }
        
        .lock-btn {
          width: 100% !important;
        }
      }
    `;
    
    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
  }
  
  function setupLockScreenEvents(overlay) {
    const extendBtn = overlay.querySelector('#extend-timer-btn');
    const homeBtn = overlay.querySelector('#go-home-btn');
    
    extendBtn.addEventListener('click', () => {
      debugLog('Extend timer button clicked');
      chrome.runtime.sendMessage({ type: 'extendTimer' }, () => {
        removeLockScreen();
      });
    });
    
    homeBtn.addEventListener('click', () => {
      debugLog('Go to YouTube home button clicked');
      chrome.runtime.sendMessage({ type: 'goToYouTubeHome' }, () => {
        removeLockScreen();
      });
    });
    
    overlay.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
    });
  }
  
  function removeLockScreen() {
    const overlay = document.getElementById('youtube-shorts-blocker-overlay');
    if (overlay) {
      overlay.remove();
    }
    
    document.removeEventListener('keydown', blockKeyboardEvents, true);
    document.removeEventListener('keyup', blockKeyboardEvents, true);
    document.removeEventListener('keypress', blockKeyboardEvents, true);
    
    // Notify background that lock screen was removed
    chrome.runtime.sendMessage({ type: 'lockScreenRemoved' });
  }
  
  function blockKeyboardEvents(e) {
    const allowedKeys = ['F5', 'F12'];
    const isCtrlShiftI = e.ctrlKey && e.shiftKey && e.key === 'I';
    
    if (!allowedKeys.includes(e.key) && !isCtrlShiftI) {
      e.stopPropagation();
      e.preventDefault();
    }
  }
  
  function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}時間${minutes}分${secs}秒`;
    } else if (minutes > 0) {
      return `${minutes}分${secs}秒`;
    } else {
      return `${secs}秒`;
    }
  }
})();
