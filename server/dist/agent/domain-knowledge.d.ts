/**
 * Domain-specific knowledge for the agent loop.
 * Single source of truth — shared between server (managed API, MCP)
 * and extension (via import at build time).
 */
interface DomainEntry {
    domain: string;
    antiBot?: boolean;
    skill: string;
}
/**
 * Look up domain knowledge for a URL.
 * Returns the first matching entry, or null.
 */
export declare function getDomainSkill(url: string): DomainEntry | null;
/**
 * Get all domain skills. Used by extension to import the full list.
 */
export declare function getAllDomainSkills(): DomainEntry[];
export {};
