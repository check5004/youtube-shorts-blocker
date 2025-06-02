# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

YouTube Shorts Blocker is a Chrome extension that helps users limit their time watching YouTube Shorts. It uses Manifest V3 and vanilla JavaScript without any build tools or frameworks.

## Architecture

The extension follows a standard Chrome extension architecture with these key components:

- **background.js**: Service worker managing timers, tab tracking, storage, and message routing
- **content.js**: Injected into YouTube pages to detect Shorts navigation and page visibility changes
- **popup.js**: Controls the extension popup UI for settings and statistics
- **lock_screen.js**: Creates fullscreen overlay when timer expires

### Component Communication Flow

1. content.js detects YouTube Shorts URLs → sends message to background.js
2. background.js manages timer state → updates popup.js and triggers lock_screen.js
3. popup.js reads/writes settings → background.js persists to Chrome storage

## Development

No build process required - modify JavaScript files directly and reload the extension in Chrome.

### Testing
- Load unpacked extension in Chrome developer mode
- Navigate to YouTube Shorts to test timer functionality
- Use extension popup to verify settings and statistics

## Key Implementation Details

- Uses Chrome alarms API for timer expiration and daily resets (4 AM)
- Aggregates viewing time across multiple YouTube tabs
- Progressive messaging system (gentle → warning → strict) based on usage
- Blocks all keyboard events except F5/F12/DevTools in lock screen mode