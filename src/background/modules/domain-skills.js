/**
 * Domain-specific skills and best practices for common websites.
 * These are injected into the agent's context when visiting matching domains.
 *
 * SINGLE SOURCE OF TRUTH: server/src/agent/domain-skills.json
 * This file imports from there. Both extension and server read the same data.
 *
 * Fields:
 * - domain: The domain to match (e.g., 'reddit.com')
 * - skill: Best practices text injected into the agent's system prompt
 * - antiBot: If true, enables human-like simulation for typing, clicking, scrolling
 */

// Chrome extension service workers can't import JSON directly.
// Fetch the JSON at init time from the extension bundle.
let _domainSkills = [];
let _loaded = false;

async function ensureLoaded() {
  if (_loaded) return;
  try {
    const url = chrome.runtime.getURL('server/src/agent/domain-skills.json');
    const res = await fetch(url);
    _domainSkills = await res.json();
  } catch {
    // Fallback: if fetch fails (e.g., file not in web_accessible_resources),
    // the skills will be empty. This is non-fatal.
    console.warn('[DomainSkills] Could not load domain-skills.json');
    _domainSkills = [];
  }
  _loaded = true;
}

// Load immediately on import
ensureLoaded();

export { _domainSkills as DOMAIN_SKILLS };

/**
 * Get domain skills for a given URL
 * @param {string} url - The URL to check
 * @param {Array} userSkills - Optional array of user-defined skills [{ domain, skill }]
 * @returns {Array} - Array of matching domain skills (user skills override built-in)
 */
export function getDomainSkills(url, userSkills = []) {
  if (!url) return [];

  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();

    const matchSkill = (skill) => {
      return hostname === skill.domain || hostname.endsWith('.' + skill.domain);
    };

    const builtInMatches = _domainSkills.filter(matchSkill);
    const userMatches = userSkills.filter(matchSkill);

    const result = [...builtInMatches];
    for (const userSkill of userMatches) {
      const existingIndex = result.findIndex(s => s.domain === userSkill.domain);
      if (existingIndex >= 0) {
        result[existingIndex] = userSkill;
      } else {
        result.push(userSkill);
      }
    }

    return result;
  } catch {
    return [];
  }
}

/**
 * Check if anti-bot simulation is enabled for a given URL
 * @param {string} url - The URL to check
 * @param {Array} userSkills - Optional array of user-defined skills
 * @returns {boolean} - True if antiBot is enabled for this domain
 */
export function isAntiBotEnabled(url, userSkills = []) {
  const skills = getDomainSkills(url, userSkills);
  return skills.some(skill => skill.antiBot === true);
}

