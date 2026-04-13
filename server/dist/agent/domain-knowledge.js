/**
 * Domain-specific knowledge for the agent loop.
 * Single source of truth — shared between server (managed API, MCP)
 * and extension (via import at build time).
 */
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
// Load from shared JSON file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DOMAIN_SKILLS = JSON.parse(readFileSync(join(__dirname, "domain-skills.json"), "utf-8"));
/**
 * Look up domain knowledge for a URL.
 * Returns the first matching entry, or null.
 */
export function getDomainSkill(url) {
    try {
        const hostname = new URL(url).hostname.toLowerCase();
        return DOMAIN_SKILLS.find((d) => hostname === d.domain || hostname.endsWith("." + d.domain)) || null;
    }
    catch {
        // URL might not be a full URL — try matching as a bare domain
        const lower = url.toLowerCase();
        return DOMAIN_SKILLS.find((d) => lower.includes(d.domain)) || null;
    }
}
/**
 * Get all domain skills. Used by extension to import the full list.
 */
export function getAllDomainSkills() {
    return DOMAIN_SKILLS;
}
