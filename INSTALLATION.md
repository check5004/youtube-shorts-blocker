# YouTube Shorts Blocker - Installation Guide

## Chrome Extension Installation

### Method 1: Load Unpacked Extension (Developer Mode)

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" toggle in the top right corner
3. Click "Load unpacked" button
4. Select the `youtube-shorts-blocker` folder
5. The extension should now appear in your extensions list

### Method 2: Install from ZIP Package

1. Extract the `youtube-shorts-blocker.zip` file
2. Follow Method 1 steps with the extracted folder

## Verification

After installation, you should see:
- YouTube Shorts Blocker icon in the Chrome toolbar
- Extension listed in `chrome://extensions/` with enabled status

## Usage

1. **Timer Settings**: Click the extension icon to open popup and configure timer duration (5-720 minutes)
2. **Action on Timeout**: Choose between "Lock Screen" or "Redirect to YouTube Home"
3. **Temporary Disable**: Use "今回のみタイマーを起動しない" for current session
4. **Daily Disable**: Toggle "今日はタイマーをOFFにする" to disable until 4 AM next day
5. **Permanent Disable**: Toggle "タイマー自動起動を常にOFFにする" to disable completely

## Features

- **Automatic Detection**: Timer starts when visiting YouTube Shorts pages
- **Multi-tab Support**: Tracks viewing time across all YouTube Shorts tabs
- **Daily Statistics**: Shows cumulative viewing time (resets at 4 AM)
- **Progressive Messages**: Lock screen messages become stricter with more extensions
- **Persistent Settings**: All preferences saved and restored between browser sessions

## Troubleshooting

- **Timer not starting**: Check if extension is enabled and not in disabled mode
- **Lock screen not appearing**: Ensure popup blockers are disabled for YouTube
- **Settings not saving**: Check Chrome storage permissions for the extension
