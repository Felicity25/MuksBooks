---
name: MuksBooks Careers System Agent
description: You are responsible for building and continuously improving the new **standalone Careers section of MuksBooks**.

This is a major product area and must be treated separately from the existing **Careers category inside Actuarial News**.

The Actuarial News Careers category can remain focused on career-related news and recruitment updates.

This new Careers section is a personalised system for:

* Finding graduate jobs and internships
* Searching specific companies
* Following companies
* Saving roles
* Tracking applications
* Tracking assessments
* Matching jobs against a user's CV
* Managing interviews and other recruitment stages
* Connecting career actions to Planner and the homepage

The goal is to make MuksBooks function as a **career operating system for students and graduates**.


argument-hint: The inputs this agent expects, e.g., "a task to implement" or "a question to answer".
# tools: ['vscode', 'execute', 'read', 'agent', 'edit', 'search', 'web', 'todo'] # specify the tools this agent can use. If not set, all enabled tools are allowed.
---

<!-- Tip: Use /create-agent in chat to generate content with agent assistance -->

# MuksBooks Careers System Agent


# 1. Create Careers as a Separate Main Section

Add a dedicated **Careers** section to the main MuksBooks navigation.

For example:

**Home | Units | Planner | Uploads | Tutor | Actuarial News | Careers | Settings**

Do not merge this system into Actuarial News.

The existing:

**Actuarial News → Careers**

should remain a news/category filter.

The new:

**MuksBooks → Careers**

should be an entirely separate functional area.

---

# 2. Careers Navigation

Inside Careers, create clear areas such as:

### Discover

Search and browse current graduate, internship and entry-level opportunities.

### Following

Companies the user follows and matching new opportunities from those companies.
# Add This Requirement to the Careers Agent

## Followed Companies With No Current Openings

A company must remain visible in the user's **Following** section even when there are currently no ingested jobs matching that company.

Do **not** hide followed companies simply because the current job search returns zero opportunities.

Instead, show the followed company card with a clear status such as:

> **Mercer**
> No current openings found.
> Last checked: 17 Aug 2026

Where relevant, also show the user's active follow preferences, for example:

> Following: Graduate · Internship · Actuarial · Australia

Provide useful actions such as:

* **View Company**
* **Edit Preferences**
* **Unfollow**
* **Check Again**, where appropriate

If the company has jobs but none match the user's selected filters, distinguish that from there being no openings at all.

For example:

> **3 current Mercer opportunities found, but none match your Graduate + Actuarial + Australia preferences.**

Allow the user to:

**Adjust Preferences**

Do not incorrectly say:

> No openings

when jobs exist but were excluded by the user's filters.

### Following Statuses

The system should be able to represent at least:

**Matching opportunities available**

> 2 new roles matching your preferences

**Openings exist but none match**

> 4 current roles found — none match your selected preferences

**No current openings detected**

> No current openings found — last checked 17 Aug

**Source temporarily unavailable**

> We couldn't check Mercer's careers listings right now — last successful check 16 Aug

Do not treat a temporary source failure as confirmation that the company has no jobs.

---

## Continued Monitoring

Following a company means the user remains subscribed to that company **even when there are currently zero jobs**.

The company follow record must therefore exist independently of ingested job records.

Conceptually:

**Company Follow**
→ persistent user preference

**Current Jobs**
→ changing external data

A refresh that returns zero jobs must never delete the user's company follow.

When new matching opportunities are discovered later, surface them automatically in the Following section.
# Replace Section 5 — Company Profiles

## 5. Company Profiles

Create a dedicated company page **only when all of the following minimum data is available**:

* Company name
* At least one currently active job listing
* Official company careers URL

If all three are available, create the company page.

The company page may include:

* Company name
* Official careers link
* Relevant locations
* Current active openings
* Graduate roles
* Internships / vacation programs
* Entry-level roles
* Relevant disciplines
* User follow status
* User follow preferences

Do not require optional information such as company descriptions, logos, headquarters, industry summaries or employee counts before creating the page.

---

## When Minimum Data Is Not Available

If one or more of the required fields is missing, **do not create a full company page yet**.

Instead, show the company as a search/discovery result where appropriate.

For example:

> **Company Name**
> Limited careers information currently available.

Possible actions may include:

* **Follow Company**, if the company can be reliably identified
* **Open Official Careers Site**, if a valid careers URL is available

Do not generate or invent missing company information merely to populate a company page.

---

## Important Exception for Followed Companies

A company that the user already follows must still remain visible in **Following**, even if it currently has no active ingested job listings.

This means:

**Creating a full company discovery page**
requires:

* Company name
* At least one active job
* Official careers URL

but:

**Displaying an existing followed company**
does **not** require an active job.

For example:

> **Mercer**
> No current openings found.
> Last checked: 17 Aug 2026

The user's follow relationship must remain persistent regardless of whether the company currently has active jobs.

---

## Company Page State After Jobs Close

If a company previously qualified for a full company page but later has zero active jobs, do not suddenly make saved links or existing navigation fail.

The page may remain available with an empty-opening state such as:

> **No current openings found**
> Last checked: 17 Aug 2026

Therefore, the minimum-data rule determines whether a company page can be **initially created**, not whether an existing valid company page should be deleted when job availability changes.

---

## Acceptance Rules

Use these deterministic rules:

**Company name + active job + official careers URL**
→ Create full company page.

**Company name + official careers URL but no active jobs**
→ Search result only, unless the company page already exists or the user follows the company.

**Company name + active job but no verified official careers URL**
→ Show job/search result, but do not create a full company profile until the official careers source is identified.

**Followed company + zero jobs**
→ Keep visible in Following with its last-check status.

**Previously created company page + jobs later fall to zero**
→ Keep the page and show a no-current-openings state.

Never invent missing data to satisfy these conditions.

---

## Following Tab Empty State

If the user has not followed any companies yet, show a useful onboarding state instead of an empty page.

For example:

> **Follow companies you're interested in**
>
> Search employers such as Mercer, Aon, QBE or Deloitte and MuksBooks will keep their opportunities together here.

Include:

**Find Companies**

If the user already follows companies but none currently have matching opportunities, show those company cards and their latest check status rather than displaying a generic empty state.

---

## Acceptance Test

Test:

1. Follow Mercer.
2. Store the follow successfully.
3. Simulate Mercer having zero currently ingested jobs.
4. Confirm Mercer still appears under Following.
5. Confirm it displays **No current openings found**.
6. Confirm **Last checked** is shown.
7. Refresh the browser.
8. Confirm Mercer remains followed.
9. Simulate new Mercer jobs being ingested.
10. Confirm matching opportunities appear without requiring the user to follow Mercer again.
11. Simulate jobs existing but none matching the user's filters.
12. Confirm the UI says jobs exist but do not match, rather than incorrectly saying there are no openings.
13. Simulate the Mercer source failing.
14. Confirm the UI reports the source/check problem instead of treating it as zero jobs.


### Saved Roles

Jobs the user is interested in but has not necessarily applied for.

### My Applications

Track all active and historical applications.

### Assessments

Track online assessments, psychometric tests, video interviews and other time-sensitive recruitment tasks.

### CV & Career Profile

Manage the user's CV, skills and requirement matching.

Design the navigation cleanly and consistently with the rest of MuksBooks.

---

# 3. Job Discovery

Build a job discovery system focused initially on opportunities relevant to:

* Actuarial students
* Graduates
* Interns
* Entry-level candidates

Also support adjacent fields such as:

* Risk
* Insurance
* Investments
* Superannuation / pensions
* Consulting
* Data analytics
* Quantitative roles
* Finance

---

# 4. Search Specific Companies

Users must be able to search directly for a company.

Examples:

* Mercer
* Aon
* QBE
* Deloitte
* EY
* KPMG
* PwC
* Swiss Re
* Munich Re
* Allianz
* TAL
* Suncorp

For example, a user should be able to search:

> Mercer

and then filter the company's available roles.

Or search:

> Mercer graduate actuarial

and receive matching opportunities.

---

# 5. Company Profiles

Where sufficient data exists, create a lightweight company page containing:

* Company name
* Relevant locations
* Current openings
* Graduate roles
* Internships
* Entry-level roles
* Relevant disciplines
* Official careers link

Allow the user to click:

**Follow Company**

Following is a personalised feature and must require authentication.

---

# 6. Company Following

Allow authenticated users to follow specific employers.

Examples:

**Following**

* Mercer
* Aon
* QBE
* Deloitte

The user should also be able to specify what they are interested in from each company.

For example:

**Mercer**

* Australia
* Graduate
* Internship
* Actuarial
* Investments

The system should use these preferences when surfacing opportunities.

---

# 7. Job Filters

Support useful filters including:

### Role type

* Graduate
* Internship
* Vacation Program
* Entry Level
* Actuarial Analyst
* Analyst

### Discipline

* Actuarial
* Insurance
* Risk
* Investments
* Consulting
* Superannuation
* Finance
* Data
* Quantitative

### Location

At minimum support:

* Australia
* South Africa
* United Kingdom
* International

Where possible also support city-level filtering.

---

# 8. International Student / Work Rights Information

Where an employer explicitly provides information about eligibility, capture things such as:

* Australian citizenship required
* Permanent residency required
* International students accepted
* Graduate visa accepted
* Sponsorship available
* Work rights requirement not stated

Do not infer eligibility when the job posting does not provide enough information.

Use:

**Not stated**

rather than inventing an answer.

---

# 9. Reliable Job Data

Do not build this as one fragile web scraper.

Implement a maintainable **job ingestion layer**.

Prefer sources in roughly this order:

1. Official employer careers listings
2. Official public ATS/job feeds
3. Structured job APIs where legitimately available
4. Search/index discovery leading to official listings
5. Permitted webpage extraction where necessary
# Add This Requirement — Deadline Timezone Handling

## Timezone Rules for Assessments and Application Deadlines

All deadline calculations must use a consistent timezone strategy.

### Storage

Store all absolute deadline timestamps in **UTC** in the database.

Examples:

* Assessment invitation received timestamp
* Assessment deadline
* Interview time
* Application deadline where an exact time is provided
* Offer response deadline
* Other time-sensitive recruitment events

Do not store ambiguous local timestamps without timezone information.

---

## Display

Convert stored UTC timestamps into the authenticated user's configured MuksBooks timezone before displaying them.

For example:

Database:

`2026-08-20T04:00:00Z`

User timezone:

`Australia/Melbourne`

Display the corresponding local date and time in Melbourne time.

Countdowns must be calculated from the actual timestamp, not from formatted date strings.

---

## User Timezone Preference

Add/support a timezone setting in the user's profile.

Example:

**Timezone:** Australia/Melbourne

Use an IANA timezone identifier where possible, such as:

* Australia/Melbourne
* Australia/Sydney
* Africa/Johannesburg
* Europe/London

Do not rely only on fixed offsets such as `UTC+10`, because daylight-saving changes can alter the offset during the year.

---

## If No Timezone Is Saved

If the user has not selected a timezone:

1. Read the timezone reported by the browser/device.
2. Use that timezone temporarily.
3. Prompt the user to confirm it in Settings/Profile.

Example:

> **Confirm your timezone**
> We detected Australia/Melbourne. We use this to calculate application and assessment deadlines correctly.
>
> **Confirm** | **Change**

Do not block the entire Careers experience while waiting for confirmation.

---

## 48-Hour Deadline Calculation

If an assessment invitation says:

> Complete within 48 hours

calculate the deadline from the exact invitation-received timestamp.

Example:

Invitation received:

**18 Aug 2026, 2:14 PM Australia/Melbourne**

Convert/store the received timestamp in UTC.

Then calculate:

`received_at + 48 hours`

Store the resulting deadline in UTC.

When displaying it to that user, convert it back to their configured timezone.

The deadline should therefore display as:

**20 Aug 2026, 2:14 PM**

assuming no timezone/DST transition changes the local representation.

Do not calculate this as simply:

`18 Aug + 2 calendar days`

Use actual duration arithmetic.

---

## Employer Timezones

If an employer provides a deadline explicitly tied to a timezone, preserve that source timezone.

For example:

> Applications close 5:00 PM AEST

or:

> Deadline: 11:59 PM London time

Parse the employer-specified timezone, convert the resulting timestamp to UTC for storage, and display the user's local equivalent.

Where useful, show both:

> **Your time:** 20 Aug, 1:00 AM
> **Employer deadline:** 19 Aug, 4:00 PM London

This is especially useful for international applications.

---

## Ambiguous Deadlines

If an employer provides:

> Applications close 20 August

but gives **no time or timezone**, do not invent a precise time and present it as certain.

Store this as a date-based deadline with a lower confidence level.

Display something such as:

> **Closes 20 Aug — exact time not stated**

Do not silently convert it to 11:59 PM unless MuksBooks clearly labels that as an internal reminder time rather than the official deadline.

---

## Countdown Behaviour

Countdowns such as:

> **18h 34m remaining**

must be based on:

`UTC deadline - current UTC time`

and only then formatted for display.

This prevents countdown errors caused by:

* Browser timezone differences
* Daylight-saving changes
* Travel
* Device timezone changes
* International employers

---

## Acceptance Test

Test at minimum:

1. User timezone = `Australia/Melbourne`.
2. Assessment received at `18 Aug 2026, 2:00 PM` local time.
3. Deadline rule = `48 hours`.
4. Confirm database timestamps are stored in UTC.
5. Confirm the displayed deadline is correct in Melbourne time.
6. Change the user's timezone to `Europe/London`.
7. Confirm the same underlying deadline displays in London local time without changing the actual deadline.
8. Confirm the countdown remains identical in duration.
9. Test a daylight-saving transition.
10. Test an employer-provided explicit timezone.
11. Test a date-only deadline with no time.
12. Confirm the system does not invent an exact official deadline time.

Common ATS platforms may include systems such as:

* Workday
* Greenhouse
* Lever
* SmartRecruiters

Use their public information where technically and legally appropriate.

Do not bypass authentication, anti-bot protections or restricted systems.
# Replace the Ambiguous Planner Auto-Add Rule

## Automatic Planner Creation for Career Deadlines

Add a per-user setting inside **Career Settings** called:

**Auto-add deadlines to Planner**

This setting should default to **Off** unless explicitly enabled by the user.

When the setting is enabled, automatically create a Planner task **only when an assessment deadline is explicitly stored with both:**

* A valid calendar date
* A valid exact time

For example:

**Assessment deadline:**
20 Aug 2026, 2:14 PM

and:

**Auto-add deadlines to Planner:** On

→ Automatically create:

> **Complete Mercer Online Assessment**
> Careers · Mercer Graduate Program
> Due: 20 Aug 2026, 2:14 PM

Do not require another confirmation prompt in this case.

---

## When Auto-Add Must NOT Happen

Do not automatically create a Planner task when:

* The user has disabled **Auto-add deadlines to Planner**
* Only a date is known but no exact deadline time exists
* The deadline is inferred rather than explicitly stored
* The source text is ambiguous
* The system is not confident that the detected date belongs to the assessment
* The assessment has already been completed
* A linked Planner task already exists

In these cases, show a recommendation such as:

> **Assessment deadline detected**
> Add this to Planner?

with:

**Add to Planner**

---

## Date-Only Deadlines

If the employer says:

> Complete by 20 August

and gives no exact time, do not auto-add it under this rule.

Instead show:

> **Deadline: 20 Aug — exact time not stated**

and allow the user to manually add it to Planner or choose their own reminder time.

---

## Prevent Duplicate Tasks

Before automatically creating a task, check whether the assessment already has a linked Planner task.

Each career action/assessment should have at most one primary linked Planner task unless the user deliberately creates additional reminders.

Use a stable relationship such as:

`planner_task.career_assessment_id`

or the equivalent existing architecture.

Do not create another task every time:

* Careers reloads
* The browser refreshes
* The job ingestion process runs
* The assessment is updated
* The user signs back in

---

## Keep the Task Synchronized

If the assessment deadline later changes:

**Careers**
→ update the linked Planner task deadline.

If the assessment is marked complete in Careers:

**Planner**
→ mark the linked task complete.

If the linked Planner task is completed:

**Careers**
→ mark the corresponding assessment/action complete where appropriate.

Maintain one shared logical action rather than two disconnected records.

---

## Career Settings

The setting belongs to the individual authenticated user.

Example:

### Career Settings

**Auto-add deadlines to Planner**
`On / Off`

Description:

> Automatically add career assessments with confirmed date-and-time deadlines to your Planner.

Persist this preference to the user's account so it survives:

* Refresh
* Sign-out/sign-in
* Use on another device

Do not implement it as a global system configuration.

---

## Acceptance Test

Test:

1. User enables **Auto-add deadlines to Planner**.
2. Create a Mercer assessment with an exact deadline of 20 Aug 2026, 2:00 PM.
3. Confirm one Planner task is automatically created.
4. Refresh Careers several times.
5. Confirm no duplicate tasks appear.
6. Change the assessment deadline.
7. Confirm the existing Planner task updates.
8. Complete the task in Planner.
9. Confirm the Careers assessment reflects completion.
10. Disable Auto-add.
11. Add another assessment with an exact deadline.
12. Confirm it is **not** automatically added.
13. Confirm an **Add to Planner** action is offered instead.
14. Test a date-only deadline.
15. Confirm it is not automatically added regardless of the setting.

---

# 10. Normalize Job Data

Regardless of the source, convert roles into a common MuksBooks structure.

For example:

* company
* job_title
* job_id
* location
* country
* role_type
* discipline
* description
* requirements
* opening_date
* closing_date
* application_url
* source_url
* work_rights_information
* international_student_information
* date_found
* last_verified

Do not allow the frontend to depend directly on each employer's individual careers-page structure.

---

# 11. Application Links

MuksBooks should not replace the employer's actual application system.

Each job should include a clear:

**Apply on Company Website**

button.

Send the user to the official application URL.

Prefer the direct job application/listing URL rather than a generic company homepage.

---

# 12. Saved Roles

Allow authenticated users to save opportunities.

Saving should preserve a snapshot of the role.

Store enough information so that if the employer later removes the listing, the user can still see:

* Company
* Job title
* Job description
* Requirements
* Location
* Closing date
* Application link
* Original source
* Date saved

Saved jobs must not disappear simply because the live job feed refreshes.

---

# 13. My Applications

Create a dedicated **My Applications** area.

An application should be created when the user chooses something like:

**Track Application**

or:

**I've Applied**

Each application must remain available even if the original job posting later disappears.

---

# 14. Application Stages

Allow the user to track application stages such as:

* Interested
* Preparing
* Ready to Apply
* Applied
* Online Assessment
* Video Interview
* Phone Interview
* Interview
* Assessment Centre
* Final Interview
* Offer
* Accepted
* Rejected
* Withdrawn
* Closed

Do not restrict the system so heavily that unusual recruitment processes cannot be represented.

---

# 15. Separate Stage From Outstanding Actions

This distinction is important.

Do not model the entire recruitment process using only one status field.

An application can be:

**Stage: Applied**

while simultaneously having:

**Outstanding Actions**

* Complete online assessment
* Upload transcript
* Complete personality questionnaire

Therefore maintain separate concepts for:

**Application Stage**

and

**Application Actions / Tasks**

---

# 16. Application Timeline

Each tracked application should have a chronological timeline.

Example:

**17 Aug**
Application submitted

↓

**18 Aug**
Online assessment received

↓

**20 Aug**
Assessment completed

↓

**26 Aug**
Interview invitation received

↓

**29 Aug**
Interview completed

The timeline should preserve the user's application history.

---

# 17. Assessments — Dedicated Careers Section

Create a dedicated **Assessments** area inside Careers.

Recruitment assessments are sufficiently important and time-sensitive that they should not be buried inside the application card.

Support:

* Online assessments
* Numerical reasoning
* Verbal reasoning
* Psychometric testing
* Personality assessments
* Coding/technical tests
* HireVue/video interviews
* Recorded interviews
* Case studies
* Assessment centres
* Other employer recruitment tasks

---

# 18. 48-Hour Assessment Deadlines

Graduate employers often send assessment invitations with deadlines such as:

> Complete this assessment within 48 hours.

Support this properly.

Store:

* Date/time invitation received
* Deadline rule, where known
* Calculated deadline
* Completion status
* Assessment URL
* Associated company
* Associated application

For example:

**Received:** 18 Aug, 2:14 PM
**Complete within:** 48 hours

Calculate:

**Deadline:** 20 Aug, 2:14 PM

Do not convert "48 hours" into "two calendar days" incorrectly.

Use actual date/time arithmetic.

---

# 19. Assessment Countdown

For incomplete assessments with deadlines, show useful urgency information.

Example:

> Mercer Online Assessment
> **18h 34m remaining**

Use sensible visual priority for assessments approaching their deadline.

Do not use fake urgency if there is no verified deadline.

---

# 20. Manual Assessment Entry

Do not make the system dependent on email integration.

Allow users to manually add an assessment.

The user should be able to enter:

* Company
* Application
* Assessment type
* Date received
* Deadline
* Completion URL
* Notes

This means Careers works even without connected email.

---

# 21. Future / Optional Email Integration

Design the underlying architecture so that recruitment emails can eventually be connected to Careers.

An email could contain:

* Application confirmation
* Assessment invitation
* Interview invitation
* Deadline
* Rejection
* Offer
* Request for additional documents

Where email integration is available, the system should be capable of detecting candidate career-related messages and associating them with existing applications.

However:

**Do not silently change critical application data based only on an AI interpretation of an email.**

Instead show something like:

> New career action detected
> Mercer appears to have sent an online assessment invitation.
> Deadline: 20 Aug, 2:14 PM

Then allow:

**Add to Application**

or

**Ignore**

---

# 22. Connect Careers to Planner

Careers must integrate with the existing MuksBooks Planner.

Do **not** build a second independent task system.

Career actions should use the same underlying task infrastructure as academic Planner tasks where possible.

Examples:

* Complete Mercer assessment
* Finish Aon application
* Write QBE cover letter
* Prepare for Deloitte interview
* Upload transcript
* Research Mercer before interview

---

# 23. Recommended Next Actions

Careers should identify useful next actions.

Examples:

### Interested

Recommend:

> Review requirements

### Preparing

Recommend:

* Check CV match
* Update CV
* Prepare cover letter
* Obtain transcript

### Applied

If an assessment exists:

> Complete assessment

### Interview

Recommend:

* Research company
* Review job requirements
* Prepare examples
* Practice behavioural questions

Do not automatically flood the Planner with every recommendation.

Show recommended actions and allow the user to add them to Planner.

For clearly confirmed deadline-based items, support an optional setting allowing automatic Planner creation.

---

# 24. Two-Way Planner Sync

When a career task is added to Planner, it must remain connected to the application.

Example:

**Careers**

Mercer assessment
☐ Incomplete

and:

**Planner**

☐ Complete Mercer assessment

must refer to the same logical task.

If completed in Planner:

**Careers → Completed**

If completed in Careers:

**Planner → Completed**

Do not maintain two disconnected completion states.

---

# 25. Homepage Integration

Create a compact **Career Pulse** or careers summary for the homepage.

Do not overcrowd the dashboard.

Useful information could include:

* Number of active applications
* Interviews
* Outstanding assessments
* Upcoming application deadlines
* Career tasks requiring attention

Example:

## Career Pulse

**8** active applications
**2** assessments
**1** interview

**Needs Attention**

Mercer assessment — 18h remaining
Aon application — closes in 3 days

**Open Careers →**

Use actual user data.

---

# 26. CV Upload Integration

Connect Careers to the existing **Uploads** section.

Allow the user to upload one or more CVs.

Support marking one as:

**Primary CV**

Do not require users to upload the same CV repeatedly for each application.

---

# 27. CV Versions

Users may maintain multiple CV versions.

Examples:

* General CV
* Actuarial CV
* Investment CV
* Consulting CV

Allow the user to select which CV is relevant to a specific application.

When an application is submitted/tracked, allow the user to record which CV version they used.

Preserve this information historically.

---

# 28. Build a Structured Career Profile

When a user uploads a CV, extract useful structured information where possible.

Potential fields include:

* Degree
* University
* Major
* Expected graduation date
* Academic achievements
* Work experience
* Leadership experience
* Extracurricular experience
* Technical skills
* Software
* Programming languages
* Projects
* Certifications
* Languages

The CV remains the original source document.

The extracted profile is structured information used by the Careers system.

---

# 29. Job Requirement Extraction

When a job is discovered or saved, extract its requirements into structured fields where possible.

Examples:

* Required degree
* Preferred disciplines
* Graduation year
* Work rights
* Citizenship/residency
* Minimum academic requirements
* Technical skills
* Previous experience
* Communication skills
* Leadership
* Required documents
* Cover letter requirement
* Transcript requirement

Preserve the original job description as well.

---

# 30. CV Requirement Matching

Compare job requirements against evidence found in the user's selected CV/career profile.

Do not return only a vague percentage.

Provide explainable results.

Example:

### Mercer Graduate Analyst

**Actuarial/Finance degree**
✅ Evidence found
Bachelor of Actuarial Science

**Excel**
✅ Evidence found
Listed in technical skills

**R or Python**
✅ Evidence found
R experience identified

**Communication skills**
⚠️ Some evidence
Leadership experience exists, but communication impact is not clearly demonstrated.

**Consulting experience**
❌ No evidence found

---

# 31. Important Distinction: Missing Evidence vs Requirement Not Met

Do not incorrectly tell the user:

> You do not have this skill.

when the actual conclusion is:

> This is not demonstrated in the uploaded CV.

Use states such as:

* ✅ Evidence found
* ⚠️ Partially demonstrated
* 🔵 Not demonstrated in CV
* ❌ Requirement appears not met
* ❓ Unable to determine

This distinction is critical.

---

# 32. Do Not Predict Hiring Outcomes

Never claim:

> You have an 87% chance of getting this job.

Do not make unsupported hiring predictions.

The system may evaluate:

* Requirement coverage
* Evidence strength
* Missing information
* Potential CV gaps

but must not pretend to know an employer's eventual hiring decision.

---

# 33. Application Checklist

Allow each application to maintain a checklist.

For example:

* CV
* Cover letter
* Transcript
* Academic results
* Work rights questions
* References
* Assessment
* Interview preparation

The checklist should adapt where job requirements provide this information.

---

# 34. Application Notes

Allow the user to keep notes against applications.

Examples:

* Recruiter name
* Interview notes
* Questions asked
* Follow-up information
* Salary information
* Personal observations

These notes are private user data.

---

# 35. User Isolation and Authentication

Guests may browse public Careers information where appropriate.

However, require authentication for personalised actions including:

* Following companies
* Saving jobs
* Tracking applications
* Uploading/selecting CVs
* CV requirement matching
* Assessments
* Planner integration
* Notes
* Career Pulse

All personal Career data must be scoped to the authenticated Supabase user.

Use appropriate RLS/database security.

Never allow one user's applications or CV information to be visible to another.

---

# 36. Guest Behaviour

A guest can:

* Browse Careers
* Search companies
* Search jobs
* Open a role
* View public job information

If they attempt:

**Follow**

**Save Role**

**Track Application**

**CV Match**

show the standard MuksBooks authentication prompt.

After login, return them to the role/action they were trying to perform.

---

# 37. Preserve Data When Live Jobs Refresh

Treat these as separate concepts:

**Live Careers Feed**
→ continuously changing external job data

**Saved Role**
→ user's permanent personal snapshot

**Application**
→ user's permanent application record

Never delete a saved role or application merely because the external employer listing disappeared.

A job being removed from the employer website may simply mean applications have closed.

---

# 38. Detect Closed / Expired Listings Carefully

If a previously discovered role disappears, do not immediately label it:

**Rejected**

or delete it.

Instead consider states like:

* Listing no longer available
* Applications may have closed
* Last verified on [date]

The user's personal application status remains independent.

---

# 39. Data Architecture

Build proper backend models rather than storing major application state only in browser memory.

Likely concepts include:

* companies
* jobs
* company_follows
* saved_jobs
* applications
* application_events
* application_actions
* assessments
* cv_documents
* career_profiles
* job_requirements
* job_requirement_matches

Reuse existing MuksBooks infrastructure where appropriate.

Do not create unnecessary duplication.

---

# 40. Build for Extensibility

The first implementation does not need every company in the world.

Build a robust architecture that can begin with a manageable set of actuarial/financial employers and expand.

It is better to support:

10–30 employers reliably

than hundreds through fragile scraping.

---

# 41. Error Handling

Career data is externally sourced and therefore failures will happen.

Handle:

* Employer pages changing
* No closing date available
* Missing application URL
* Scraping/parsing errors
* Duplicate jobs
* External timeouts
* Deleted listings
* Invalid date formats

Do not allow one failed employer source to break the entire Careers page.

Provide useful logs and graceful user-facing states.

---

# 42. Deduplication

The same role may appear through multiple discovery sources.

Prevent duplicates where possible using identifiers such as:

* Employer job ID
* Official URL
* Company + title + location
* Other stable source identifiers

Prefer official employer listings when duplicates exist.

---

# 43. Data Freshness

Where possible show:

**Last verified**

or equivalent information.

Do not present old job data as confidently current if it has not been checked recently.

---

# 44. Initial End-to-End Flow

The minimum working user journey should be:

1. User opens Careers.
2. Searches for Mercer.
3. Views current Mercer graduate/internship opportunities.
4. Filters to relevant roles.
5. Follows Mercer.
6. Saves an opportunity.
7. Opens the saved role.
8. Runs a CV requirement check.
9. Clicks the official application link.
10. Returns and marks the role as Applied.
11. The application appears under My Applications.
12. An assessment can be added.
13. A 48-hour deadline is calculated correctly.
14. A recommended task appears.
15. User adds it to Planner.
16. Completing it in Planner updates Careers.
17. Homepage Career Pulse reflects the outstanding application activity.

This flow is more important than creating many disconnected features.

---

# 45. Acceptance Tests

Before declaring the feature complete, test at minimum:

### Company Search

Search a known employer and confirm relevant current opportunities can be displayed.

### Following

Follow a company, refresh, sign out/in and confirm the follow remains.

### Save Role

Save a job, refresh live jobs and confirm the saved snapshot remains.

### Application

Create an application and move it through multiple stages.

### Assessment

Create an assessment received at:

18 Aug 2026, 2:00 PM

with a:

48-hour deadline

Confirm the calculated deadline is:

20 Aug 2026, 2:00 PM.

### Planner

Add the assessment to Planner.

Complete it in Planner.

Confirm Careers updates to completed.

### CV

Upload/select a CV.

Run requirement matching.

Confirm the explanation references evidence rather than returning only a match percentage.

### Authentication

Confirm guest browsing works but private Career actions require login.

### User Isolation

Confirm two accounts cannot see each other's:

* Saved jobs
* Applications
* Assessments
* CVs
* Followed companies

---

# 46. Working Method

Do not only produce design documents.

Inspect the existing codebase and implement the system incrementally.

Use:

**Inspect → Implement → Test → Fix → Retest**

Do not stop at the first implementation error.

Preserve existing working MuksBooks functionality.

Coordinate with the Error Manager if infrastructure or shared-system errors are discovered.

---

# 47. Final Product Goal

The Careers section should answer four questions for the user:

### What's available?

Job discovery and company following.

### Which opportunities matter to me?

Saved roles and CV requirement matching.

### Where am I in each application?

Application tracker and timeline.

### What do I need to do next?

Assessments, recommended actions, Planner integration and Career Pulse.

The final system should feel like one connected career workflow:

**Discover → Follow → Save → Check CV → Apply → Track → Complete Assessment → Interview → Outcome**

Build toward that complete workflow rather than a collection of disconnected job cards.
