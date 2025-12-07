/**
 * Control panel widget for flashcard management
 */

class ControlPanel {
  constructor() {
    this.panel = null;
    this.isMinimized = false;
    this.isEnabled = true;
    this.overlay = null;
    this.scheduler = null;
    this.flashcardManager = null;
    this.storage = null;
    this.urlMatcher = null;
  }

  /**
   * Set dependencies (called after modules are loaded)
   */
  setDependencies({ overlay, scheduler, flashcardManager, storage, urlMatcher }) {
    this.overlay = overlay;
    this.scheduler = scheduler;
    this.flashcardManager = flashcardManager;
    this.storage = storage;
    this.urlMatcher = urlMatcher;
  }

  /**
   * Initialize and inject control panel into page
   */
  init() {
    // Check if already initialized
    if (document.getElementById('flashcard-control-panel')) {
      return;
    }

    this.panel = this.createPanel();
    document.body.appendChild(this.panel);
    this.updateProgress();
    this.updateToggleState();

    // Update progress periodically
    setInterval(() => this.updateProgress(), 5000);
  }

  /**
   * Create control panel DOM structure
   * @returns {HTMLElement} Panel element
   */
  createPanel() {
    const panel = document.createElement('div');
    panel.id = 'flashcard-control-panel';
    panel.className = 'flashcard-control-panel';

    const header = document.createElement('div');
    header.className = 'control-panel-header';

    const title = document.createElement('div');
    title.className = 'control-panel-title';
    title.textContent = 'Flashcards';

    const minimizeBtn = document.createElement('button');
    minimizeBtn.className = 'control-panel-minimize';
    minimizeBtn.innerHTML = '−';
    minimizeBtn.addEventListener('click', () => this.toggleMinimize());

    header.appendChild(title);
    header.appendChild(minimizeBtn);

    const content = document.createElement('div');
    content.className = 'control-panel-content';

    // Progress display
    const progressDiv = document.createElement('div');
    progressDiv.className = 'control-panel-progress';
    progressDiv.id = 'flashcard-progress-display';
    progressDiv.textContent = 'Loading...';

    // Toggle for current page
    const toggleDiv = document.createElement('div');
    toggleDiv.className = 'control-panel-toggle';

    const toggleLabel = document.createElement('label');
    toggleLabel.className = 'control-panel-toggle-label';
    toggleLabel.textContent = 'Enable on this page';

    const toggleSwitch = document.createElement('div');
    toggleSwitch.className = 'control-panel-toggle-switch';
    toggleSwitch.id = 'flashcard-page-toggle';
    toggleSwitch.addEventListener('click', () => this.toggleCurrentPage());

    toggleLabel.appendChild(toggleSwitch);
    toggleDiv.appendChild(toggleLabel);

    // Show flashcard button
    const showBtn = document.createElement('button');
    showBtn.className = 'control-panel-btn';
    showBtn.textContent = 'Show Flashcard Now';
    showBtn.addEventListener('click', () => this.showFlashcard());

    content.appendChild(progressDiv);
    content.appendChild(toggleDiv);
    content.appendChild(showBtn);

    panel.appendChild(header);
    panel.appendChild(content);

    // Store references
    this.contentElement = content;
    this.progressElement = progressDiv;
    this.toggleElement = toggleSwitch;

    return panel;
  }

  /**
   * Update progress display
   */
  updateProgress() {
    if (!this.progressElement) return;
    if (!this.flashcardManager) return;

    const stats = this.flashcardManager.getProgressStats();
    this.progressElement.textContent = `${stats.completed}/${stats.total} completed`;
  }

  /**
   * Update toggle state based on current page exclusion
   */
  async updateToggleState() {
    if (!this.toggleElement) return;
    if (!this.urlMatcher || !this.storage) return;

    const currentURL = this.urlMatcher.getCurrentURL();
    const excludedPages = await this.storage.getExcludedPages();
    const isExcluded = this.urlMatcher.matchesAny(currentURL, excludedPages);

    this.toggleElement.classList.toggle('active', !isExcluded);
  }

  /**
   * Toggle enable/disable flashcards on current page
   */
  async toggleCurrentPage() {
    if (!this.urlMatcher || !this.storage) return;

    const currentURL = this.urlMatcher.getCurrentURL();
    const excludedPages = await this.storage.getExcludedPages();
    const isExcluded = this.urlMatcher.matchesAny(currentURL, excludedPages);

    if (isExcluded) {
      // Remove from excluded list
      const matchingPage = excludedPages.find(page => this.urlMatcher.matches(currentURL, page));
      if (matchingPage) {
        await this.storage.removeExcludedPage(matchingPage);
      }
    } else {
      // Add to excluded list
      await this.storage.addExcludedPage(currentURL);
    }

    await this.updateToggleState();
  }

  /**
   * Show a flashcard manually
   */
  async showFlashcard() {
    if (!this.overlay || !this.scheduler) return;

    if (this.overlay.isVisible()) {
      return; // Already showing a flashcard
    }

    const nextFlashcard = this.scheduler.getNextFlashcard();
    if (nextFlashcard) {
      await this.overlay.show(nextFlashcard, () => {
        this.updateProgress();
      });
    } else {
      alert('No flashcards available for review.');
    }
  }

  /**
   * Toggle minimize/maximize panel
   */
  toggleMinimize() {
    if (!this.panel || !this.contentElement) return;

    this.isMinimized = !this.isMinimized;
    this.panel.classList.toggle('minimized', this.isMinimized);

    if (this.isMinimized) {
      this.contentElement.style.display = 'none';
    } else {
      this.contentElement.style.display = 'block';
      this.updateProgress();
    }
  }

  /**
   * Remove control panel from page
   */
  destroy() {
    if (this.panel) {
      this.panel.remove();
      this.panel = null;
    }
  }

  /**
   * Check if panel is visible
   * @returns {boolean} True if panel exists and is visible
   */
  isVisible() {
    return this.panel !== null && document.body.contains(this.panel);
  }
}

// Export singleton instance
export const controlPanel = new ControlPanel();

