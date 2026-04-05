---
domain: x.com
aliases: [Twitter, twitter.com]
updated: 2026-03-30
verified: true
---

## Platform traits
- SPA built with React + Draft.js for text editors
- Aggressive anti-bot detection — avoid rapid repeated actions
- "Leave site?" dialog appears if you navigate away with unsaved text in a compose box
- Reply box and compose modal are DIFFERENT things — the reply box is inline on the tweet page, the compose modal is at x.com/compose/post
- Search results at /search?q={query}&src=typed_query&f=live (Latest tab)
- Tweet URLs: x.com/{handle}/status/{id}

## CRITICAL: Reading X pages
- X loads content asynchronously. After navigating, the page looks empty for 3-5 seconds.
- `read_page` often returns ONLY "To view keyboard shortcuts" — this means tweets have NOT loaded yet.
- When this happens: DO NOT navigate to the same URL again. That resets the page load and makes it worse.
- Instead: wait 5 seconds, then use `get_page_text` — it reads visible text and is more reliable for X.
- If `get_page_text` also returns nothing useful, scroll down once (with coordinates: `{"action": "scroll", "coordinate": [500, 400], "scroll_amount": 3, "scroll_direction": "down"}`) and try `get_page_text` again.
- NEVER re-navigate to a URL you are already on. Just wait and retry reading.

## Text input (CRITICAL — verified 2026-03-30)
X uses Draft.js for all text editors (reply box, compose box, quote tweet).
- `form_input` DOES NOT WORK — Draft.js ignores programmatic input
- `computer` type action GARBLES TEXT — even with 50ms delays, characters get scrambled mid-string
- ONLY RELIABLE METHOD: Use `javascript_tool` with this exact code:

```javascript
document.querySelector('[data-testid="tweetTextarea_0"]').focus();
document.execCommand('insertText', false, 'your reply text here');
```

- Always focus the element first, then execCommand
- Verify text appeared by reading the page after insertion
- If text didn't appear, click the text area again and retry the javascript_tool

## Replying to a tweet (verified working — 17 steps)
1. Navigate to the tweet URL (x.com/{handle}/status/{id})
2. Wait 3 seconds for the page to load
3. Read the page
4. Find the reply/comment icon (speech bubble) in the tweet's action bar (next to retweet, like, bookmark)
5. Click the reply/comment icon — this opens an inline reply composer
6. Use `javascript_tool` to focus and insert text (see Text input section above)
7. Read the page to verify text appeared in the reply box
8. Click the blue "Reply" button (appears once text is entered)
9. Wait 2 seconds to confirm the reply appeared in the thread
10. Do NOT navigate away until confirmed

## Known traps
- DO NOT scroll down looking for "Post your reply" — the reply box only appears when you click the comment icon on the tweet
- x.com/compose/post may open when you click reply — THIS IS FINE. Just type your reply there and click Reply. Do NOT try to escape or navigate back.
- "Leave site?" dialog: ALWAYS click Cancel. Never click Leave. Finish posting first.
- Draft.js editor refs change between page loads — always read_page fresh before interacting
- The Reply button is disabled until text is entered — verify text appeared before clicking
- Rate limiting: space replies at least 15 seconds apart. X may throttle after ~15 replies in a short period
- NEVER navigate to the same URL you're already on — it resets the page load and wastes steps

## Search (verified — use get_page_text, not read_page)
1. Navigate to https://x.com/search?q={encoded_query}&src=typed_query&f=live
2. Wait 5 seconds (X search loads tweets asynchronously)
3. Use `get_page_text` to read the page (NOT `read_page` — the accessibility tree often misses tweet content)
4. If the result only shows "To view keyboard shortcuts" or navigation elements, wait 3 more seconds and use `get_page_text` again
5. Scroll down once using coordinates: `{"action": "scroll", "coordinate": [500, 400], "scroll_amount": 3, "scroll_direction": "down"}`
6. Use `get_page_text` again to capture more tweets
7. Tweet URLs are in the page text — look for /status/ URLs
8. Each tweet has: author handle, display name, tweet text, engagement counts
9. Login wall: may appear after several searches — the user is already logged in, just wait and retry
10. Maximum 15 steps for a search task. If you haven't found tweets by step 12, report what you have.

## Profile pages
- URL: x.com/{handle}
- Bio, follower count, recent tweets visible
- Don't scroll aggressively — 1-2 scrolls max to avoid detection
