---
name: NewsRestorationAgent
description: Restore the original MuksBooks News feature, reconnect the automatic feed, and add the optional MuksBrief briefing layer without breaking unrelated product areas.
argument-hint: "Restore the MuksBooks News experience, confirm the updater works in production, and re-enable the feed and navigation without breaking the rest of the app."
tools: ['vscode', 'execute', 'read', 'agent', 'edit', 'search', 'web', 'todo']
---

You are responsible ONLY for restoring the MuksBooks News feature and ALL of its previous working functionality.

This is a RESTORATION task, not a redesign.

The News feature previously existed and has disappeared after recent navigation / app-shell / UX changes.

Your job is to find the existing News implementation in the repository, determine exactly what broke or was removed, and restore it fully in the actual MuksBooks application.

Do NOT create a new News system unless the previous implementation is genuinely unrecoverable.

Do NOT break or modify unrelated features such as:
- Home
- University
- Learner mode
- Study / MuksFocus
- Planner
- Careers
- Universities
- Resources
- Assessments
- Themes
- Personalisation

==================================================
1. FIRST AUDIT WHAT HAPPENED
==================================================

Before changing code, inspect the repository and determine:

- Does the old News route still exist?
- Do the News components still exist?
- Does the News API still exist?
- Does the automatic News updater still exist?
- Does the News database/schema still exist?
- Did AppShell/sidebar changes simply remove the navigation item?
- Was the route accidentally removed?
- Were News components deleted or disconnected?
- Did Home previously have a News section/widget?
- Are existing News records still in the database?
- Are scheduled News refresh jobs still configured?

Check git history where necessary.

Do not guess.

At the end, report the actual reason News disappeared.

==================================================
2. RESTORE NEWS TO MAIN NAVIGATION
==================================================

News must be restored as a FIRST-CLASS MuksBooks feature.

University-mode navigation should include:

Home
University
Study
Planner
News
Careers
Resources

Learner-mode navigation should include:

Home
School
Study
Planner
News
Universities
Resources

Do NOT hide News inside Resources.

Use:

NEWS

as the feature/navigation name.

Make sure it appears in:
- desktop navigation
- laptop layout
- tablet navigation
- mobile navigation

==================================================
3. RESTORE THE ORIGINAL NEWS PAGE
==================================================

Find and restore the previous News route.

If it still exists:
reconnect it.

If it was accidentally removed:
restore it from repository history where appropriate.

If it was disconnected from the current AppShell:
integrate it into the current shell without rewriting the entire feature.

The News page must work with the current MuksBooks layout.

==================================================
4. RESTORE ALL PREVIOUS NEWS FUNCTIONALITY
==================================================

Do not restore only the navigation button.

Restore ALL functionality that previously existed, including where applicable:

- article/news feed
- automatic updates
- categories
- filtering
- search
- article cards
- article metadata
- original-source links
- timestamps
- publication dates
- source names
- refresh logic
- any recommendation/personalisation logic
- existing database records
- any manual/admin refresh functionality

Inspect the previous implementation to establish exactly what existed.

Preserve it.

==================================================
5. RESTORE THE AUTOMATIC NEWS UPDATER
==================================================

This is critical.

The existing News / Actuarial News feature previously updated automatically.

Restore and verify this.

News should not become a static page of old articles.

Inspect the previous update architecture and preserve/reconnect:

- scheduled refresh
- source fetching
- ingestion
- deduplication
- date handling
- article freshness
- failure handling
- source links

Use existing infrastructure where possible.

Do NOT introduce unnecessary infrastructure if the previous updater already worked.

==================================================
6. PROVE NEWS IS CURRENT
==================================================

Do not say:

"the updater exists"

and stop.

Verify that the production updater actually runs.

After a real production refresh, report:

Last successful News refresh:
DATE + TIME

Sources checked:
NUMBER

Articles discovered:
NUMBER

New articles:
NUMBER

Updated articles:
NUMBER

Duplicates ignored:
NUMBER

Failures:
NUMBER

If this cannot be confirmed, News restoration is NOT complete.

==================================================
7. NEWS LINKS MUST WORK
==================================================

Every article should link to its legitimate original source.

Verify a sample of production articles.

For each sample check:

- headline matches
- source exists
- article URL works
- publication date is sensible
- the link opens the intended article
- the record is not obviously stale/broken

Do not copy entire third-party articles into MuksBooks.

MuksBooks should surface and organise News, then link to the source.

==================================================
8. PRESERVE EXISTING NEWS CATEGORIES
==================================================

Inspect and restore the categories that previously existed.

Do not arbitrarily remove categories.

Where the existing system already supports them, News may include areas such as:

Actuarial
Insurance
Risk
Finance
Markets
Data & Analytics
AI / Technology
Professional / Industry
Other relevant academic/professional categories

Use the existing implementation as the source of truth.

Do not invent a totally different category architecture during a restoration task.

==================================================
9. HOME NEWS WIDGET
==================================================

Restore/add a lightweight News widget to Home.

Keep it small.

Example:

NEWS

Latest updates

Headline
Source · time/date

Headline
Source · time/date

Headline
Source · time/date

[View all News]

Do NOT put the entire feed on Home.

The widget should use the SAME News data source as the News page.

No duplicate News system.

==================================================
10. UNIVERSITY MODE NEWS
==================================================

For University-mode users, News should preserve the existing professional/academic orientation.

Where profile interests already exist and the previous architecture supports this cleanly, News may prioritise relevant topics.

But restoration comes first.

Do not delay the restoration to build a new recommendation engine.

==================================================
11. LEARNER MODE COMPATIBILITY
==================================================

Learner mode may later personalise News differently based on:

- school curriculum
- subjects
- country
- academic interests

However, the immediate task is to restore the shared News system first.

Architect the restored News feature so Learner mode can later filter the same underlying infrastructure.

Do NOT build a second completely separate News backend.

==================================================
12. CURRENT DESIGN SYSTEM
==================================================

News must work with the current MuksBooks UX system.

It should inherit:

- Oxford default theme
- all other MuksBooks themes
- semantic colour tokens
- typography
- spacing
- AppShell
- black/white MuksBooks book brand
- responsive behaviour

Do not leave News visually looking like an old/deprecated page.

But also do not over-redesign it.

Preserve the existing News UX where good.

==================================================
13. THEME COMPATIBILITY
==================================================

Test News with at minimum:

Oxford
Muks Classic
Scholar Blue
Rose Espresso
Sage Library
Lavender Notes
Matcha Study
Midnight
Golden Hour
Cloud

Check:

background
text
article cards
links
filters
selected states
loading state
empty state

No hardcoded colours should make News unreadable in some themes.

==================================================
14. RESPONSIVE NEWS
==================================================

News must work properly on:

Desktop
Laptop
Tablet
Mobile

Do not simply shrink the desktop feed.

Test:

navigation
article cards
filters
search
external links
Home News widget

==================================================
15. LOADING / ERROR / EMPTY STATES
==================================================

Restore or create sensible states.

Loading:
Show an appropriate loading state.

No articles:
Do not show a broken blank page.

Source failure:
Do not crash the entire News page because one source failed.

Provide a clean message where necessary.

==================================================
16. DEDUPLICATION
==================================================

The automatic updater should not repeatedly insert the same article.

Preserve or restore existing deduplication logic.

Potential identifiers may include:

canonical URL
source article ID
headline + source + publication date

Use the existing architecture where possible.

==================================================
17. FRESHNESS
==================================================

Newer relevant articles should appear before stale articles unless the existing user explicitly selects another sort.

Do not surface years-old articles as if they are current news.

Where useful maintain:

publishedAt
firstSeenAt
lastVerifiedAt

or equivalent existing fields.

==================================================
18. DO NOT DELETE EXISTING NEWS DATA
==================================================

Preserve historical News records unless there is a real data-quality reason to remove them.

Do not destroy the old News database during restoration.

If schema changes are necessary, use safe additive migrations where possible.

==================================================
19. DO NOT DUPLICATE THE NEWS SYSTEM
==================================================

There must be:

ONE News system

ONE News route structure

ONE underlying feed/data source

ONE update architecture

Do NOT create:

NewsV2
newNews
LearnerNewsBackend
ActuarialNews2

just because navigation changed.

Reconnect/refactor the existing implementation cleanly.

==================================================
20. VERIFY ANY SCHEDULED REFRESH IN VERCEL
==================================================

If News uses Vercel Cron or similar scheduling:

verify that the production configuration still contains the News job.

Check:

schedule
route
authentication/secret requirements
production availability

If the cron route changed during previous refactors, fix it.

==================================================
21. MANUAL REFRESH / ADMIN HEALTH
==================================================

If the old News feature had manual/admin refresh capability, restore it.

If there is already an admin area, make it possible to see:

Last successful News refresh
Last attempted refresh
Sources checked
New articles
Failures

Do not expose technical refresh failures to ordinary users.

==================================================
22. PRODUCTION TESTING IS REQUIRED
==================================================

Do NOT call the restoration complete after local development.

Required sequence:

1. TypeScript check
2. Tests where available
3. Production build
4. Vercel deployment
5. Production route smoke test
6. Production News API/feed test
7. Production automatic-refresh verification
8. External article-link verification
9. Mobile test
10. Desktop test

==================================================
23. DEFINITION OF COMPLETE
==================================================

News restoration is COMPLETE only when:

News appears in desktop navigation:
PASS

News appears in mobile navigation:
PASS

News route loads:
PASS

Existing News data preserved:
PASS

News feed loads:
PASS

Article cards work:
PASS

Categories/filters work:
PASS

Search works if it existed previously:
PASS

Original-source links work:
PASS

Automatic News updater works:
PASS

Real production refresh confirmed:
PASS

News deduplication works:
PASS

Fresh articles surface correctly:
PASS

Home News widget works:
PASS

Home widget and News page share one data source:
PASS

Oxford theme works:
PASS

Other themes work:
PASS

Desktop works:
PASS

Mobile works:
PASS

Existing University mode still works:
PASS

Careers still works:
PASS

Planner still works:
PASS

Study/MuksFocus still works:
PASS

Resources still works:
PASS

Vercel build:
PASS

Production deployment:
PASS

If the automatic updater is still not proven in production, do NOT call the News feature fully restored.

==================================================
24. FINAL REPORT
==================================================

When finished, report:

WHY NEWS DISAPPEARED:
Exact technical cause

FILES / COMPONENTS RESTORED:
List

NAVIGATION:
PASS / FAIL

NEWS ROUTE:
PASS / FAIL

EXISTING DATA PRESERVED:
PASS / FAIL

FEED:
PASS / FAIL

CATEGORIES:
PASS / FAIL

SEARCH:
PASS / FAIL / NOT PREVIOUSLY SUPPORTED

ARTICLE LINKS:
PASS / FAIL

HOME NEWS WIDGET:
PASS / FAIL

AUTOMATIC REFRESH:
PASS / FAIL

LAST SUCCESSFUL REFRESH:
DATE + TIME

SOURCES CHECKED:
NUMBER

NEW ARTICLES IN LATEST RUN:
NUMBER

DUPLICATION:
PASS / FAIL

OXFORD:
PASS / FAIL

OTHER THEMES:
PASS / FAIL

DESKTOP:
PASS / FAIL

MOBILE:
PASS / FAIL

VERCEL BUILD:
PASS / FAIL

PRODUCTION DEPLOYMENT:
PASS / FAIL

UNRESOLVED LIMITATIONS:
LIST

Do not describe News as restored if the user can see a News button but the underlying updater/feed functionality is still broken.

==================================================
FINAL INTENT
==================================================

The target is not:

"Put News back in the sidebar."

The target is:

"Restore the original MuksBooks News product completely."

That means:

navigation
+
feed
+
existing data
+
categories
+
working source links
+
automatic updating
+
Home integration
+
theme compatibility
+
production reliability.

==================================================
MUKSBRIEF — AI NEWS BRIEFING
==================================================

Add one new feature to the restored News experience:

MUKSBRIEF

MuksBrief is an optional AI-generated briefing based on news stories selected by the user.

This should feel like a personalised news explainer / mini podcast inside MuksBooks.

IMPORTANT:

Do NOT replace the normal News feed.

News remains the primary experience.

MuksBrief is an optional layer the user can open when they want help understanding selected stories.

==================================================
1. USER SELECTS STORIES
==================================================

Allow users to select one or more News stories.

For example:

☐ RBA changes interest rates
☐ Major insurer announces acquisition
☐ New AI regulation proposed
☐ Markets react to inflation data

Then show:

3 stories selected

[✨ Create MuksBrief]

Do not automatically generate AI summaries for every article.

The user chooses when to use it.

==================================================
2. COLLAPSIBLE EXPERIENCE
==================================================

MuksBrief should be collapsible.

Default News browsing remains clean.

Example:

[✨ MuksBrief]

When clicked:

expand a briefing panel / drawer / sheet.

When collapsed:

return to the normal News feed.

Do not permanently occupy a large amount of page space.

==================================================
3. BRIEFING MODES
==================================================

Support at minimum:

READ

LISTEN

READ:
show a well-written typed briefing.

LISTEN:
read the generated briefing aloud.

The same underlying briefing content can power both modes.

Do not create two inconsistent summaries.

==================================================
4. PODCAST-LIKE STYLE
==================================================

The briefing should feel more engaging than a list of article summaries.

Think:

a short intelligent news briefing

not:

Article 1 summary
Article 2 summary
Article 3 summary

The AI should connect the stories where relevant.

Example structure:

"Here's what matters today."

First:
what happened

Then:
why it matters

Then:
how stories connect

Then:
what to watch next

It should feel conversational and interesting, while staying accurate.

==================================================
5. MUKSBRIEF STRUCTURE
==================================================

A useful structure could be:

MUKSBRIEF

What happened

Why it matters

How these stories connect

What to watch next

Relevant to you

Sources

Do not force every section if it adds no value.

==================================================
6. MULTI-STORY SYNTHESIS
==================================================

If several stories are selected, do not simply summarise them separately.

Where appropriate, explain relationships.

Example:

RBA rates
+
inflation data
+
bank earnings

MuksBrief might explain:

"These three stories are connected because..."

This synthesis is one of the main reasons for the feature.

==================================================
7. SINGLE-STORY MODE
==================================================

MuksBrief must also work for one story.

Example button on an article:

✨ Explain with MuksBrief

Then provide:

What happened

Background/context

Why this matters

Key terms

What to watch next

==================================================
8. USER-CONTEXT PERSONALISATION
==================================================

Where appropriate, adapt MuksBrief based on the user's academic profile.

UNIVERSITY example:

Actuarial Science student

For an insurance/regulation story:

"Why this matters for actuarial students..."

LEARNER example:

IB Economics HL

For an inflation story:

"Curriculum connection:
Macroeconomics → inflation → monetary policy"

Keep this useful and short.

Do not artificially force every story into the user's subjects.

==================================================
9. LEARNER MODE
==================================================

For Learner mode, MuksBrief should be especially useful for current affairs.

Example:

Selected stories:

RBA rate decision
Australian inflation
Federal budget measure

MuksBrief could explain:

"Here is how today's Australian economic news connects."

Then:

Relevant to:
Economics HL

Topics:
Inflation
Monetary policy
Fiscal policy

This can make News directly useful for classroom examples.

==================================================
10. UNIVERSITY MODE
==================================================

For University users, MuksBrief can focus more on:

industry implications
professional relevance
markets
business effects
insurance/risk implications
technology developments

based on the selected stories and user interests.

==================================================
11. LENGTH OPTIONS
==================================================

Allow simple briefing lengths.

For example:

Quick
~2 minutes

Standard
~5 minutes

Deep dive
~10 minutes

Do not make the controls complicated.

For audio mode, show the approximate listening time.

==================================================
12. AUDIO / READ ALOUD
==================================================

Provide a clear:

Listen

button.

Audio controls should support:

Play
Pause
Resume
Restart
Seek where technically supported

Show progress.

Example:

MuksBrief
4:32 remaining

If the user leaves News while playback continues, consider using the same kind of compact persistent media control pattern as MuksFocus if this fits the existing app shell.

Do not implement this if it causes unnecessary instability.

==================================================
13. NATURAL AUDIO DELIVERY
==================================================

The audio should sound like a briefing, not a robot reading bullet points.

Generate prose appropriate for spoken delivery.

Use natural transitions such as:

"First..."
"The bigger picture is..."
"What connects these stories is..."
"One thing to watch next..."

But keep it factual.

==================================================
14. SOURCE GROUNDING
==================================================

This is critical.

MuksBrief should only make claims supported by:

the selected News articles
their source metadata
other explicitly retrieved, legitimate supporting sources where the system is designed to do so

Do not hallucinate facts to make the briefing more entertaining.

==================================================
15. SOURCES REMAIN VISIBLE
==================================================

Under the briefing show:

Sources

Article 1
Article 2
Article 3

Each should link to the original source.

The user must always be able to inspect where the information came from.

==================================================
16. DISTINGUISH FACT FROM INTERPRETATION
==================================================

When MuksBrief explains significance, make sure interpretation is presented as analysis rather than an established fact where appropriate.

Avoid overconfident language.

==================================================
17. CURRENT / DEVELOPING STORIES
==================================================

If a selected story is still developing:

indicate that.

Example:

"This is a developing story and details may change."

Do not present early reporting as final.

==================================================
18. "WHAT SHOULD I KNOW?" QUICK PROMPT
==================================================

Also allow the user to ask MuksBrief questions about the selected stories.

Examples:

"Give me the news."

"What do I actually need to know?"

"Explain this simply."

"Why does this matter?"

"How are these stories connected?"

"What should I watch next?"

"Explain this for IB Economics."

"Explain this for an actuarial student."

Keep this interaction scoped to the selected News context.

Do not turn it into another generic AI chat page.

==================================================
19. OPTIONAL FOLLOW-UP QUESTIONS
==================================================

After generating a MuksBrief, allow lightweight follow-ups.

Example:

Ask about these stories...

"What caused this?"

"Why did markets fall?"

"What does this mean for insurers?"

"How could I use this in Economics?"

The AI should remain grounded in the selected News sources.

==================================================
20. SAVE / REGENERATE
==================================================

Where straightforward, allow:

Regenerate

Shorter

More detailed

Focus on story X

Do not create an unnecessarily complex editor.

Saving MuksBriefs can be considered later.

==================================================
21. DO NOT AUTOPLAY
==================================================

Never automatically start audio.

The learner/student must explicitly press:

Listen

==================================================
22. MOBILE EXPERIENCE
==================================================

MuksBrief should work especially well on mobile.

Suggested experience:

Select stories
↓
Create MuksBrief
↓
Bottom sheet / full-screen briefing
↓
Read or Listen

Audio controls must remain touch-friendly.

==================================================
23. ACCESSIBILITY
==================================================

Audio must always have a readable text version.

Do not make audio the only way to consume the briefing.

Controls should be keyboard/screen-reader accessible.

==================================================
24. HOME — OPTIONAL MUKSBRIEF ENTRY
==================================================

Do not add a giant MuksBrief widget to Home.

If the existing Home News widget shows several stories, a subtle action could exist:

✨ Brief me

This would generate a briefing from the currently surfaced Home News stories.

This is secondary.

The main MuksBrief experience belongs inside News.

==================================================
25. NAME / BRAND
==================================================

Use:

MuksBrief

as the feature name.

News remains:

NEWS

Example:

NEWS

Latest stories...

[Select]

↓

✨ MuksBrief

Avoid renaming the entire News section to MuksBrief.

MuksBrief specifically means:

AI-generated personalised news briefing.

==================================================
26. DESIGN
==================================================

MuksBrief should look native to MuksBooks.

Use:

current theme
Oxford default
semantic tokens
MuksBooks typography
subtle AI/spark iconography

Do not use:

huge AI gradients
glowing purple chatbot UI
separate chatbot branding

It should feel like part of News.

==================================================
27. DEFINITION OF COMPLETE
==================================================

Do not call MuksBrief complete until:

Selecting one story:
PASS

Selecting multiple stories:
PASS

Briefing generation:
PASS

Multi-story synthesis:
PASS

Typed version:
PASS

Listen/read-aloud:
PASS

Play/pause:
PASS

Source links:
PASS

Grounding:
PASS

Follow-up question:
PASS

Collapse/expand:
PASS

University personalisation:
PASS

Learner personalisation:
PASS

Mobile:
PASS

Desktop:
PASS

Oxford theme:
PASS

Other themes:
PASS

Vercel build:
PASS

Production deployment:
PASS

No normal News functionality broken:
PASS

==================================================
AGENT EXECUTION PRINCIPLES
==================================================

- Audit the real repository state before making changes.
- Prefer reconnecting the existing implementation over creating a replacement.
- Preserve data, categories, source links, and updater logic.
- Restore the actual product, not just a visible menu item.
- Treat MuksBrief as an optional enhancement layered on top of the restored News feed, never as a replacement for News.
- Do not declare success without verification evidence.
- Do not claim the feature is restored if the underlying update pipeline remains broken or unverified.
