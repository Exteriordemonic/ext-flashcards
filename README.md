# Flashcard Overlay Chrome Extension

A Chrome extension that displays educational flashcards as overlays on web pages, featuring a spaced repetition algorithm (SM-2 variant) for optimal learning retention.

## Features

- **Automatic Flashcard Display**: Shows one flashcard automatically when you visit a page
- **Spaced Repetition Algorithm**: Uses OSR's variant of SM-2 algorithm for intelligent scheduling
- **Progress Tracking**: Tracks completed, skipped, and "repeat later" flashcards
- **Page Exclusion**: Exclude specific pages or domains from showing flashcards
- **Control Panel**: Floating widget with manual controls and progress display
- **Dark Theme UI**: Beautiful, modern dark theme matching your browsing experience
- **Flip Card Animation**: Smooth card flip animation to reveal answers
- **Configurable Algorithm**: Customize algorithm parameters via popup settings

## Installation

### From Source

1. Clone this repository:
```bash
git clone <repository-url>
cd ext-flashcards
```

2. Install dependencies (if using Bun):
```bash
bun install
```

3. Load the extension in Chrome:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the `ext-flashcards` directory

4. The extension is now installed and active!

## Usage

### Automatic Display

Once installed, the extension will automatically display one flashcard when you visit any web page (unless the page is excluded). The overlay will:

- Cover the entire page with a darkened backdrop
- Show a flashcard with question and answer
- Allow you to flip the card to see the answer
- Provide options to mark the review as Hard, Good, Easy, Skip, or Repeat Later

### Control Panel

A floating control panel appears in the bottom-right corner of pages:

- **Show Flashcard Now**: Manually trigger a flashcard display
- **Enable on this page**: Toggle to enable/disable flashcards on the current page
- **Progress Counter**: Shows how many flashcards you've completed (e.g., "5/10 completed")

### Extension Popup

Click the extension icon in Chrome's toolbar to access:

- **Progress Statistics**: View completion stats
- **Excluded Pages**: Manage list of pages where flashcards won't show
- **Algorithm Settings**: Configure spaced repetition parameters
- **Reset Progress**: Start over with all flashcards

### Algorithm Settings

The extension uses a configurable spaced repetition algorithm with these settings:

- **Base Ease**: Starting ease factor (default: 250, minimum: 130)
- **Interval Change (Hard)**: How much to reduce interval for hard reviews (default: 50%)
- **Easy Bonus**: Multiplier for easy reviews (default: 130%, minimum: 100%)
- **Load Balancer**: Distributes reviews evenly across days (default: enabled)
- **Maximum Interval**: Upper limit for review intervals (default: 36525 days = 100 years)
- **Maximum Link Contribution**: Contribution of linked notes' ease (default: 50%)

## Project Structure

```
ext-flashcards/
├── manifest.json              # Chrome extension manifest
├── package.json               # Project dependencies
├── src/
│   ├── background/
│   │   └── service-worker.js  # Background script
│   ├── content/
│   │   ├── content.js         # Main content script
│   │   ├── overlay.js         # Overlay display logic
│   │   └── control-panel.js   # Control panel widget
│   ├── popup/
│   │   ├── popup.html         # Popup UI
│   │   ├── popup.js           # Popup logic
│   │   └── popup.css          # Popup styles
│   ├── core/
│   │   ├── flashcards.js      # Flashcard management
│   │   ├── algorithm.js       # Spaced repetition algorithm
│   │   ├── storage.js         # Storage wrapper
│   │   └── scheduler.js      # Review scheduling
│   ├── ui/
│   │   ├── overlay.css        # Overlay styles
│   │   └── control-panel.css  # Control panel styles
│   ├── utils/
│   │   ├── url-matcher.js     # URL matching utilities
│   │   └── constants.js       # Configuration constants
│   └── data/
│       └── flashcards.json    # Default flashcard data
├── tests/
│   ├── algorithm.test.js      # Algorithm tests
│   ├── storage.test.js        # Storage tests
│   └── integration.test.js    # Integration tests
└── README.md                   # This file
```

## API

The extension exposes a global `Flashcards` API in content scripts:

```javascript
// Initialize the flashcard system
await Flashcards.init(config);

// Show a random flashcard manually
Flashcards.showRandom();

// Exclude current page from showing flashcards
await Flashcards.excludeCurrentPage();

// Include current page (remove from exclusion)
await Flashcards.includeCurrentPage();

// Reset all progress
await Flashcards.resetProgress();

// Get progress statistics
const stats = Flashcards.getProgress();

// Update algorithm configuration
await Flashcards.updateAlgorithmConfig({
  baseEase: 300,
  easyBonus: 150
});
```

## Development

### Running Tests

```bash
bun test
```

### Adding Flashcards

Edit `src/data/flashcards.json` to add or modify flashcards:

```json
{
  "flashcards": [
    {
      "id": "unique-id",
      "question": "Your question here",
      "answer": "Your answer here",
      "tags": ["category1", "category2"],
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### Building

No build step is required - the extension uses vanilla JavaScript and can be loaded directly into Chrome.

## Configuration

### Storage Keys

The extension uses Chrome's storage API with these keys:

- `flashcards_progress`: Progress tracking data
- `excluded_pages`: List of excluded URLs/patterns
- `algorithm_config`: Algorithm configuration
- `flashcards_enabled`: Global enable/disable flag

### Content Script Injection

The extension injects content scripts on all pages (`<all_urls>`). Scripts are loaded in this order:

1. Core utilities (storage, constants, url-matcher)
2. Algorithm and scheduler
3. Flashcard manager
4. UI components (overlay, control panel)
5. Main content script

## Algorithm Details

The extension implements OSR's variant of the SM-2 spaced repetition algorithm:

- **First Review**: Uses default intervals (Hard: 0.5 days, Good: 1 day, Easy: 4 days)
- **Subsequent Reviews**: 
  - Hard: `newInterval = oldInterval * (intervalChange / 100)`, ease decreases
  - Good: `newInterval = oldInterval * (ease / 100)`, ease unchanged
  - Easy: `newInterval = oldInterval * (ease / 100) * (easyBonus / 100)`, ease increases
- **Load Balancer**: Adds small random variation (±5%) to distribute reviews
- **Maximum Interval**: Caps intervals at the configured maximum

## Troubleshooting

### Flashcards not showing

1. Check if the current page is excluded (see popup settings)
2. Verify extension is enabled in `chrome://extensions/`
3. Check browser console for errors
4. Ensure flashcards.json is accessible

### Progress not saving

1. Check Chrome storage permissions
2. Verify storage quota hasn't been exceeded
3. Check browser console for storage errors

### Control panel not appearing

1. Refresh the page
2. Check if content scripts are loading (browser console)
3. Verify manifest.json permissions

## License

MIT License - see LICENSE file for details

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For issues, questions, or feature requests, please open an issue on the repository.

