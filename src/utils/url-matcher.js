/**
 * URL matching utilities for page exclusion
 */

class URLMatcher {
  /**
   * Normalize URL for comparison
   * @param {string} url - URL to normalize
   * @returns {string} Normalized URL
   */
  normalizeURL(url) {
    try {
      const urlObj = new URL(url);
      // Remove trailing slash, fragment, and normalize
      return `${urlObj.protocol}//${urlObj.host}${urlObj.pathname.replace(/\/$/, '')}`;
    } catch (e) {
      // If URL parsing fails, return as-is
      return url;
    }
  }

  /**
   * Check if URL matches a pattern
   * Supports:
   * - Exact URL match
   * - Domain match (e.g., "example.com")
   * - Path match (e.g., "/path/to/page")
   * - Wildcard patterns (e.g., "*.example.com", "example.com/*")
   * @param {string} url - URL to check
   * @param {string} pattern - Pattern to match against
   * @returns {boolean} True if URL matches pattern
   */
  matches(url, pattern) {
    if (!url || !pattern) {
      return false;
    }

    try {
      const urlObj = new URL(url);
      const normalizedPattern = pattern.trim();

      // Exact match
      if (this.normalizeURL(url) === this.normalizeURL(normalizedPattern)) {
        return true;
      }

      // Domain-only match (e.g., "example.com")
      if (normalizedPattern === urlObj.hostname || 
          normalizedPattern === urlObj.host) {
        return true;
      }

      // Path-only match (e.g., "/path/to/page")
      if (normalizedPattern.startsWith('/')) {
        const urlPath = urlObj.pathname;
        if (urlPath === normalizedPattern || urlPath.startsWith(normalizedPattern + '/')) {
          return true;
        }
      }

      // Wildcard domain match (e.g., "*.example.com")
      if (normalizedPattern.startsWith('*.')) {
        const domain = normalizedPattern.substring(2);
        if (urlObj.hostname === domain || urlObj.hostname.endsWith('.' + domain)) {
          return true;
        }
      }

      // Wildcard path match (e.g., "example.com/*")
      if (normalizedPattern.endsWith('/*')) {
        const base = normalizedPattern.slice(0, -2);
        if (urlObj.hostname === base || urlObj.host === base) {
          return true;
        }
      }

      // Full wildcard pattern (e.g., "example.com/path/*")
      if (normalizedPattern.includes('/*')) {
        const [base, pathPattern] = normalizedPattern.split('/*');
        if (urlObj.hostname === base || urlObj.host === base) {
          if (!pathPattern || urlObj.pathname.startsWith(pathPattern)) {
            return true;
          }
        }
      }

      // Regex pattern (if pattern starts and ends with /)
      if (normalizedPattern.startsWith('/') && normalizedPattern.endsWith('/')) {
        try {
          const regex = new RegExp(normalizedPattern.slice(1, -1));
          return regex.test(url);
        } catch (e) {
          // Invalid regex, ignore
        }
      }

      return false;
    } catch (e) {
      // URL parsing failed, try simple string matching
      return url.includes(normalizedPattern);
    }
  }

  /**
   * Check if URL matches any pattern in a list
   * @param {string} url - URL to check
   * @param {string[]} patterns - Array of patterns to check against
   * @returns {boolean} True if URL matches any pattern
   */
  matchesAny(url, patterns) {
    if (!patterns || patterns.length === 0) {
      return false;
    }

    return patterns.some(pattern => this.matches(url, pattern));
  }

  /**
   * Get current page URL
   * @returns {string} Current page URL
   */
  getCurrentURL() {
    return window.location.href;
  }

  /**
   * Get current page URL in normalized form
   * @returns {string} Normalized current URL
   */
  getCurrentNormalizedURL() {
    return this.normalizeURL(this.getCurrentURL());
  }

  /**
   * Extract domain from URL
   * @param {string} url - URL to extract domain from
   * @returns {string} Domain name
   */
  getDomain(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch (e) {
      return '';
    }
  }

  /**
   * Extract path from URL
   * @param {string} url - URL to extract path from
   * @returns {string} Path
   */
  getPath(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.pathname;
    } catch (e) {
      return '';
    }
  }
}

// Export singleton instance
export const urlMatcher = new URLMatcher();

