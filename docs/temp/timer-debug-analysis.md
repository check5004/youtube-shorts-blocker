# YouTube Shorts Blocker - Timer Debug Analysis

## Timer Stop/Pause Conditions

### 1. Explicit Timer Stop Conditions

1. **Timer Expiration** (`background.js:189-202`)
   - When chrome alarm "timer-expired" fires
   - Calls `stopTimer()` function
   - Shows lock screen if enabled

2. **Manual Stop** (`background.js:169-187`)
   - `stopTimer()` function
   - Clears elapsed time
   - Removes active tabs
   - Clears timer expiration alarm

3. **All Shorts Tabs Closed** (`background.js:275-283`)
   - When last Shorts tab is removed from `activeShortsTabs`
   - Calls `pauseTimer()`
   - Saves elapsed time

4. **Navigation Away from Shorts** (`content.js:34-47`)
   - When URL changes from Shorts to non-Shorts
   - Sends "shorts-left" message
   - Removes tab from active list

5. **Tab Closed** (`background.js:301-312`)
   - `chrome.tabs.onRemoved` listener
   - Removes tab from `activeShortsTabs`
   - Pauses timer if no more Shorts tabs

6. **Temporary Disable** (`background.js:373-378`)
   - When tab ID is in `tempDisableForTab` Set
   - Prevents timer from starting/continuing

### 2. Timer Pause Conditions

1. **Page Hidden** (`content.js:61-67`)
   - When `document.visibilityState` becomes "hidden"
   - Sends "visibility-changed" message with `isVisible: false`
   - Pauses timer counting

2. **Tab Becomes Inactive** (`background.js:154-167`)
   - `pauseTimer()` function
   - Saves current elapsed time
   - Stops real-time counting but maintains state

3. **Browser/Extension Restart** (`background.js:23-57`)
   - Timer state persists in Chrome storage
   - Restores on startup but requires user action to resume

### 3. Potential Error/Crash Scenarios

1. **Storage Access Failures**
   - `chrome.storage.local.get()` might fail
   - No try-catch in some critical paths
   - Could result in undefined timer state

2. **Race Conditions**
   - Multiple tabs updating timer simultaneously
   - No locking mechanism for shared state
   - Potential for lost updates

3. **Type Conversion Issues**
   - `tempDisableForTab`: Set → Array conversion
   - Missing validation in popup.js
   - Causes `.includes is not a function` error

4. **Alarm API Limitations**
   - Minimum 1-minute granularity
   - Silent failures if alarm creation fails
   - No error handling for alarm operations

5. **Message Passing Failures**
   - No acknowledgment for critical messages
   - Messages might be lost during high activity
   - No retry mechanism

6. **Memory/State Corruption**
   - Settings object might be partially loaded
   - Missing default values for some settings
   - Unexpected null/undefined propagation

## Observed Reset Behavior Analysis

Based on the issue description, the likely scenario is:

1. **During repeat playback**: Timer continues running
2. **Something causes timer to pause** (visibility change, tab switch)
3. **Page reload on video change** triggers state restoration
4. **Corrupted/missing storage data** causes full reset

The settings reset indicates a storage corruption or initialization failure rather than just a timer issue.

## Additional Error Scenarios Found

### 1. Storage Quota Exceeded
- Chrome storage has limits (5MB for local storage)
- No error handling for storage quota exceeded errors
- Could cause silent failures in `saveSettings()` and `saveTimerState()`

### 2. Extension Update/Reload
- When extension updates, all runtime state is lost
- Background script restarts, but tabs remain open
- Content scripts become orphaned and can't communicate

### 3. Chrome Profile Sync Conflicts
- Multiple devices syncing can overwrite local storage
- Race conditions between sync and local operations
- No conflict resolution mechanism

### 4. Memory Pressure Events
- Chrome may suspend background scripts under memory pressure
- Timer state might not persist properly before suspension
- Alarms may not fire correctly after resumption

### 5. Permission Changes
- If user modifies extension permissions during runtime
- Can cause API calls to fail silently
- No permission checking before API usage

## Root Cause Analysis

The most likely cause of the timer reset issue is:

1. **Primary Issue**: The `tempDisableForTab` type mismatch causes an unhandled error
2. **Secondary Issue**: This error interrupts the normal save/restore flow
3. **Result**: Settings fail to save properly, leading to reset on next load

When combined with YouTube's aggressive page reloading during video transitions, this creates the perfect storm for data loss.

## Recommendations

1. Add comprehensive error handling around storage operations
2. Implement storage data validation and recovery
3. Add debug logging for timer state transitions
4. Fix the `tempDisableForTab` type mismatch (DONE)
5. Implement history tracking to diagnose issues
6. Add storage quota monitoring
7. Handle extension update scenarios gracefully
8. Implement data versioning for migrations