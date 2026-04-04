/**
 * Server-side domain knowledge — interaction patterns for common websites.
 *
 * Injected into the agent's system prompt when the task URL matches a domain.
 * This is the managed-API equivalent of the extension-side domain-skills.js.
 *
 * Each entry contains:
 * - domain: hostname to match (also matches subdomains, e.g. "google.com" matches "mail.google.com")
 * - antiBot: whether to enable human-like simulation (slower typing, random pauses)
 * - knowledge: markdown text appended to the system prompt
 */
export interface DomainEntry {
    domain: string;
    antiBot?: boolean;
    knowledge: string;
}
export declare const DOMAIN_KNOWLEDGE: DomainEntry[];
/**
 * Get domain knowledge entries matching a URL.
 * Matches exact domain or subdomains (e.g. "google.com" matches "mail.google.com").
 */
export declare function getDomainKnowledge(url: string): DomainEntry[];
/**
 * Check if anti-bot simulation should be enabled for a URL.
 */
export declare function isAntiBotDomain(url: string): boolean;
