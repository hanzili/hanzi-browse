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

export const DOMAIN_KNOWLEDGE: DomainEntry[] = [
  // --- Priority: used by skills and common task targets ---

  {
    domain: "x.com",
    antiBot: true,
    knowledge: `## X/Twitter interaction patterns

### Platform traits
- SPA built with React + Draft.js for text editors
- Aggressive anti-bot detection — avoid rapid repeated actions
- "Leave site?" dialog appears if you navigate away with unsaved text in a compose box
- Reply box and compose modal are DIFFERENT things — the reply box is inline on the tweet page, the compose modal is at x.com/compose/post
- Search results at /search?q={query}&src=typed_query&f=live (Latest tab)
- Tweet URLs: x.com/{handle}/status/{id}

### CRITICAL: Reading X pages
- X loads content asynchronously. After navigating, the page looks empty for 3-5 seconds.
- \`read_page\` often returns ONLY "To view keyboard shortcuts" — this means tweets have NOT loaded yet.
- When this happens: DO NOT navigate to the same URL again. That resets the page load.
- Instead: wait 5 seconds, then use \`get_page_text\` — it reads visible text and is more reliable for X.
- If \`get_page_text\` also returns nothing useful, scroll down once and try again.
- NEVER re-navigate to a URL you are already on. Just wait and retry reading.

### Text input (CRITICAL)
X uses Draft.js for all text editors (reply box, compose box, quote tweet).
- \`form_input\` DOES NOT WORK — Draft.js ignores programmatic input
- \`computer\` type action GARBLES TEXT — characters get scrambled
- ONLY RELIABLE METHOD: Use \`javascript_tool\` with:
\`\`\`javascript
document.querySelector('[data-testid="tweetTextarea_0"]').focus();
document.execCommand('insertText', false, 'your reply text here');
\`\`\`
- Always focus the element first, then execCommand
- Verify text appeared by reading the page after insertion

### Replying to a tweet
1. Navigate to the tweet URL (x.com/{handle}/status/{id})
2. Wait 3 seconds for the page to load
3. Read the page
4. Find the reply/comment icon (speech bubble) in the tweet's action bar
5. Click the reply/comment icon — this opens an inline reply composer
6. Use \`javascript_tool\` to focus and insert text (see above)
7. Read the page to verify text appeared in the reply box
8. Click the blue "Reply" button
9. Wait 2 seconds to confirm the reply appeared

### Known traps
- DO NOT scroll down looking for "Post your reply" — the reply box only appears when you click the comment icon
- x.com/compose/post may open when you click reply — just type and click Reply
- "Leave site?" dialog: ALWAYS click Cancel. Finish posting first.
- Draft.js editor refs change between page loads — always read_page fresh before interacting
- Rate limiting: space replies at least 15 seconds apart

### Search
1. Navigate to https://x.com/search?q={encoded_query}&src=typed_query&f=live
2. Wait 5 seconds (X search loads tweets asynchronously)
3. Use \`get_page_text\` to read (NOT \`read_page\`)
4. If only navigation elements appear, wait 3 more seconds and retry
5. Scroll down once to capture more tweets`,
  },

  {
    domain: "twitter.com",
    antiBot: true,
    knowledge: `## X/Twitter — see x.com patterns
twitter.com redirects to x.com. All x.com interaction patterns apply.`,
  },

  {
    domain: "linkedin.com",
    antiBot: true,
    knowledge: `## LinkedIn interaction patterns

### Messaging & Connections
- To message someone: first check if you're connected (1st degree) — if not, send a connection request first
- Connection request: go to their profile, click "Connect" button, optionally add a note
- Once connected, use the "Message" button on their profile or go to Messaging tab
- InMail (messaging non-connections) requires Premium subscription

### Easy Apply Forms
- Contact Info page is pre-filled from LinkedIn profile — don't try to modify, just click Next
- Modal forms may need scrolling to see all content and buttons
- Use screenshots over read_page for modals — accessibility tree often misses modal content

### Navigation
- Main tabs: Home (feed), My Network, Jobs, Messaging, Notifications
- Job search: Jobs tab -> filter by location, experience level, date posted
- "Easy Apply" = apply within LinkedIn; "Apply" = external site
- Profile sections are collapsible — click "Show all" to expand

### Search
- Use the search bar at top, then filter by People, Posts, Companies, Jobs
- Search URL: linkedin.com/search/results/people/?keywords={query}
- Profile URL: linkedin.com/in/{handle}`,
  },

  {
    domain: "reddit.com",
    antiBot: true,
    knowledge: `## Reddit interaction patterns

### Post & Comment Navigation
- Posts are listed in a feed — click on post title to view full post and comments
- Comments are nested/threaded — each comment has its own reply button underneath
- Upvote (up arrow) and downvote (down arrow) buttons are to the left of each post/comment
- To comment, scroll to comment box at top of comments section, or click reply under a specific comment

### Navigation & Search
- Use the search bar at top to find subreddits or posts
- r/subredditname format for community names
- Subreddit URL: reddit.com/r/{name}
- Post URLs: reddit.com/r/{sub}/comments/{id}/{slug}`,
  },

  {
    domain: "mail.google.com",
    knowledge: `## Gmail interaction patterns

- To open an email, click directly on the email subject/preview text, NOT the checkbox or star
- Use keyboard shortcuts: "c" to compose, "r" to reply, "a" to reply all, "f" to forward, "e" to archive
- To search, use the search bar at the top with operators like "from:", "to:", "subject:", "is:unread"
- Reading pane may be on the right or below depending on user settings — check which layout is active
- Verification codes are often in emails from "noreply@" addresses with subjects containing "verification", "code", or "confirm"`,
  },

  {
    domain: "github.com",
    knowledge: `## GitHub interaction patterns

- Repository navigation: Code tab for files, Issues for bug tracking, Pull requests for code review
- To view a file, click on the filename in the file tree
- Use "t" to open file finder, "l" to jump to a line
- In PRs: "Files changed" tab shows diffs, "Conversation" tab shows comments
- Use the search bar with qualifiers: "is:open is:pr", "is:issue label:bug"
- Repository URL: github.com/{owner}/{repo}
- Issue URL: github.com/{owner}/{repo}/issues/{number}`,
  },

  // --- Secondary: Google Workspace ---

  {
    domain: "docs.google.com",
    knowledge: `## Google Docs interaction patterns

- This is a canvas-based application — use screenshots to see content, read_page may not capture all text
- Use keyboard shortcuts: Cmd/Ctrl+B for bold, Cmd/Ctrl+I for italic, Cmd/Ctrl+K for links
- To navigate, use Cmd/Ctrl+F to find text, then click on the result
- For editing, click to place cursor then type — triple-click to select a paragraph
- Access menus via the menu bar at the top (File, Edit, View, Insert, Format, etc.)`,
  },

  {
    domain: "sheets.google.com",
    knowledge: `## Google Sheets interaction patterns

- Click on cells to select them, double-click to edit cell content
- Use Tab to move right, Enter to move down, arrow keys to navigate
- Formulas start with "=" — e.g., =SUM(A1:A10), =VLOOKUP(), =IF()
- Use Cmd/Ctrl+C and Cmd/Ctrl+V for copy/paste
- Select ranges by clicking and dragging, or Shift+click for range selection`,
  },

  {
    domain: "calendar.google.com",
    knowledge: `## Google Calendar interaction patterns

- Click on a time slot to create a new event
- Drag events to reschedule them
- Click on an event to view details, edit, or delete
- Use the mini calendar on the left to navigate to different dates
- Keyboard: "c" to create event, "t" to go to today, arrow keys to navigate`,
  },

  {
    domain: "drive.google.com",
    knowledge: `## Google Drive interaction patterns

- Double-click files to open them, single-click to select
- Right-click for context menu (download, share, rename, etc.)
- Use the search bar to find files by name or content
- Create new items with the "+ New" button on the left
- Drag and drop to move files between folders`,
  },

  // --- Secondary: Productivity & Dev Tools ---

  {
    domain: "notion.so",
    knowledge: `## Notion interaction patterns

- Click to place cursor, type "/" to open command menu
- Drag blocks using the handle on the left
- Use sidebar for navigation between pages
- Toggle blocks expand/collapse on click
- Databases can be viewed as table, board, calendar, etc.`,
  },

  {
    domain: "figma.com",
    knowledge: `## Figma interaction patterns

- This is a canvas-based design tool — always use screenshots to see content
- Use "V" for select tool, "R" for rectangle, "T" for text
- Zoom with Cmd/Ctrl+scroll or Cmd/Ctrl++ and Cmd/Ctrl+-
- Navigate frames in the left sidebar
- Right-click for context menus and additional options`,
  },

  {
    domain: "slack.com",
    knowledge: `## Slack interaction patterns

- Channels listed in left sidebar — click to switch
- Cmd/Ctrl+K to quickly switch channels/DMs
- @ mentions notify users, # references channels
- Thread replies keep conversations organized
- Use the search bar to find messages, files, and people`,
  },

  // --- Secondary: Other ---

  {
    domain: "indeed.com",
    knowledge: `## Indeed interaction patterns

- Search for jobs using the "What" and "Where" fields at the top
- Filter results by date posted, salary, job type, experience level
- Click job title to view full description
- "Apply now" or "Apply on company site" buttons are typically on the right panel
- Sign in to save jobs and track applications`,
  },

  {
    domain: "amazon.com",
    knowledge: `## Amazon interaction patterns

- Use the search bar at the top for product search
- Filter results using the left sidebar (price, ratings, Prime, etc.)
- Click "Add to Cart" or "Buy Now" to purchase
- Product details and reviews are on the product page
- Check seller information and shipping times before purchasing`,
  },

  {
    domain: "openemr.io",
    knowledge: `## OpenEMR (Electronic Health Records) interaction patterns

### CRITICAL: Iframe-Heavy Layout
- After login, OpenEMR loads a TABBED IFRAME interface (main.php) with KnockoutJS menus
- Menu items load content in named iframes: "cal" (calendar), "pat" (patient), "enc" (encounter), "fin" (finder)
- read_page from the top frame only sees the navigation bar, NOT iframe content
- ALWAYS use direct URLs to navigate — do NOT click menu items

### Direct URLs (navigate to these directly)
- Login: /openemr/index.php
- Patient Finder: /openemr/interface/main/finder/dynamic_finder.php
- Patient search/add form: /openemr/interface/new/new.php
- Patient chart by ID: /openemr/interface/patient_file/summary/demographics.php?set_pid=NUMBER
- Patient history: /openemr/interface/patient_file/history/history_full.php
- Encounters list: /openemr/interface/patient_file/history/encounters.php
- Lab results: /openemr/interface/patient_file/summary/labdata.php

### Patient Finder Page
- Shows a DataTable with columns: Full Name, Home Phone, SSN, Date of Birth, External ID
- Has search boxes for each column plus a global search
- If clicking a patient name doesn't navigate, use the direct chart URL with set_pid=NUMBER

### Patient Chart Dashboard
- Title: "Medical Record Dashboard - [Patient Name]"
- Top nav tabs: Dashboard, History, Assessments, Report, Documents, Transactions, Issues, Ledger, External Data
- Sections include: Allergies, Medical Problems, Medications, Prescriptions, Care Team, Demographics, Billing, Insurance, Labs, Vitals, Appointments, Immunizations
- All sections are on a single scrollable page — use read_page or get_page_text to read everything`,
  },
];

/**
 * Get domain knowledge entries matching a URL.
 * Matches exact domain or subdomains (e.g. "google.com" matches "mail.google.com").
 */
export function getDomainKnowledge(url: string): DomainEntry[] {
  if (!url) return [];

  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return DOMAIN_KNOWLEDGE.filter(
      (entry) =>
        hostname === entry.domain || hostname.endsWith("." + entry.domain)
    );
  } catch {
    return [];
  }
}

/**
 * Check if anti-bot simulation should be enabled for a URL.
 */
export function isAntiBotDomain(url: string): boolean {
  return getDomainKnowledge(url).some((entry) => entry.antiBot === true);
}
