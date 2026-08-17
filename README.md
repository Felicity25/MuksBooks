# MuksBooks

> **An AI-powered study, career and actuarial intelligence workspace built by an actuarial student, for actuarial students.**

MuksBooks began with a simple problem: **my academic and actuarial life was spread across too many places.**

Lecture slides lived in one place. Assessments and deadlines in another. Study plans somewhere else. Internship applications had their own spreadsheets and tabs. Industry news required completely separate searches.

At the same time, I had recently been introduced to **AI coding agents** and wanted to understand what could actually be built with them.

So rather than creating a project for the sake of having a project, I used MuksBooks as an experiment:

**Could I take a real problem I had, combine my actuarial domain knowledge with AI agents, and build the tool I wished I already had?**

That experiment became MuksBooks.

---

## 🚧 Project status

MuksBooks is an actively developing personal project.

It began as a local application built for my own studies and is gradually being developed into a cloud-based platform that can be used across devices.

Some features are still experimental, being redesigned, or undergoing migration from local storage systems to persistent cloud infrastructure.

This repository therefore represents both the application itself and my ongoing process of learning how to design, build and improve software using AI-assisted development.

---

## ✨ What MuksBooks does

MuksBooks aims to bring the major parts of an actuarial student's academic and early-career life into one workspace.

### 🎓 AI Tutor

A unit-aware AI learning environment designed to work with a student's own university material.

It can support:

* Concept explanations
* Unit-specific tutoring
* Lesson generation
* Active recall
* Exam-style questions
* Assignment-style problem review
* Study recommendations
* Topic mastery tracking

The goal is not simply to provide answers, but to create a study environment centred around **understanding and active learning**.

---

### 📚 Unit & Upload Management

Students can organise academic information by unit and upload material such as:

* Lecture slides
* Notes
* Assignment briefs
* Rubrics
* Study material
* Other unit resources

This material can then support other parts of the platform, including tutoring and study planning.

---

### 🧠 Mastery & Deep Learning Tools

MuksBooks includes tools intended to make studying more active and measurable.

These include:

* Mastery tracking
* Feynman-style explanation practice
* Error logging
* Quiz rooms
* Calculation questions
* Exam-style questions
* Study templates
* Lesson generation

Rather than only recording *how long* I study, I wanted a way to think more deliberately about **what I actually understand**.

---

### 📅 Planner & Focus Tools

Academic tasks, study sessions and other commitments can be organised through the planning system.

Current tools include:

* Planner calendar
* Study task management
* Semester progress
* Upcoming deadlines
* Pomodoro focus tools

The longer-term goal is to connect planning directly with unit schedules, assessments, career deadlines and learning progress.

---

### 💼 Careers

The Careers section was designed around another problem I experienced: **keeping track of internships, graduate opportunities and applications can become chaotic very quickly.**

The feature is being developed to help users:

* Discover actuarial internships and graduate opportunities
* Filter opportunities by location and eligibility
* Review employer and role information
* Track applications
* Track recruitment stages
* Record closing dates and deadlines
* Link directly to employer application pages

The aim is to bring career exploration and application management into the same environment as university planning.

---

### 📰 Actuarial News / Intelligence Hub

Finding general financial news is easy.

Finding information specifically relevant to an actuarial student is much harder.

The MuksBooks Actuarial News feature collects and organises developments relating to areas such as:

* Insurance
* Risk management
* Financial markets
* Artificial intelligence
* Regulation
* Superannuation and pensions
* Climate risk
* Careers
* Actuarial research

The system prioritises sources such as regulators, government bodies, professional organisations and research publications.

It also attempts to classify articles by areas such as:

* Practice area
* Actuarial concept
* Country
* Regulatory relevance
* Importance

A **"Why this matters"** component is designed to help connect an article with its possible relevance to actuarial work.

#### Current sources include

* APRA
* Australian Treasury
* Reserve Bank of Australia
* ASFA
* The Actuary
* Actuarial Eye
* Insurance Business Australia
* Insurance Journal
* Risk.net
* arXiv quantitative finance research

The pipeline also detects similar coverage of the same event and can group related articles rather than presenting unnecessary duplicates.

---

## 🤖 Building MuksBooks with AI agents

One of the main reasons I started MuksBooks was to explore **AI-assisted software development and coding agents**.

I do not come from a traditional software engineering background.

Instead, I approached the project primarily from the perspective of someone who understood the **problem and the user** and wanted to discover how effectively AI could help translate those ideas into software.

My development workflow has involved tools including:

* GitHub Copilot
* VS Code
* ChatGPT
* AI coding agents

One of the biggest things I learned was that:

> **Using an AI coding agent effectively is very different from simply asking AI to "build an app".**

As MuksBooks became more complex, I began breaking development into specialised roles.

Different agent workflows have been used for areas including:

* Feature implementation
* Error diagnosis
* Debugging
* Architecture review
* Challenging proposed solutions
* Testing assumptions
* Database migration
* Cloud deployment
* Feature-specific development

Instead of giving one agent an enormous request, I increasingly worked through smaller cycles:

**Define → Build → Test → Review → Fix → Improve**

A significant part of the project therefore became learning how to write precise requirements, anticipate edge cases and communicate technical intentions clearly enough for AI agents to implement them reliably.

That process has taught me a great deal about:

* Prompt engineering
* AI agent orchestration
* Product thinking
* Requirements design
* Debugging
* Iterative development
* Software architecture
* Working within token and compute constraints
* Knowing when an AI-generated solution needs to be challenged rather than accepted

MuksBooks is therefore as much an **AI experimentation and learning project** as it is an actuarial study application.

---

## 🛠 Technology

MuksBooks currently uses technologies including:

* **Next.js**
* **TypeScript**
* **Tailwind CSS**
* **React**
* **Prisma**
* **PostgreSQL**
* **SQLite**
* **OpenAI API**
* **Vercel**
* AI-assisted development through **GitHub Copilot and coding agents**

The application uses the Next.js App Router with a modular component structure.

Some parts of MuksBooks are currently undergoing migration as the project moves from its original local architecture toward persistent cloud-based storage.

---

## 🏗 Architecture

MuksBooks has evolved significantly from its first local prototype.

The application currently contains a mixture of persistent systems while cloud migration continues.

### Main application data

PostgreSQL and Prisma support parts of the application's structured data layer.

Prisma schema:

```text
prisma/schema.prisma
```

Seed script:

```text
prisma/seed.ts
```

### Actuarial News

The current news intelligence pipeline uses the shared MuksBooks SQLite backend:

```text
Knowledge/app-state.db
```

Relevant implementation areas include:

```text
lib/news/
lib/app-state/
```

News tables include:

```text
news_items
news_saved_items
news_followed_topics
```

The longer-term architecture is being consolidated as part of the application's cloud migration.

---

## 📰 News pipeline

The Actuarial News pipeline is primarily implemented in:

```text
lib/news/pipeline.ts
```

Related components include:

```text
lib/news/sources.ts
lib/news/classify.ts
lib/news/relevance.ts
lib/news/store.ts
```

The pipeline:

1. Fetches articles from registered sources
2. Classifies them
3. Determines actuarial relevance
4. Generates a grounded "Why this matters" explanation
5. Detects near-duplicate reporting
6. Groups related coverage
7. Stores results for the application

AI enrichment can optionally be enabled through:

```env
NEWS_AI_ENRICHMENT=true
```

The feature also contains a non-AI fallback so article relevance does not depend entirely on model output.

---

## 🔌 News API

### Retrieve news

```http
GET /api/news
```

Supported filters include:

```text
category
country
range
q
concept
practiceArea
savedOnly
```

Example ranges:

```text
today
7d
30d
```

### Saved articles

```http
GET /api/news/saved
POST /api/news/saved
```

### Refresh news

```http
GET /api/news/refresh
```

A scheduled refresh can be configured through Vercel.

The refresh endpoint should be protected using:

```env
NEWS_CRON_SECRET=
```

and:

```http
Authorization: Bearer <NEWS_CRON_SECRET>
```

The pipeline can also be run manually:

```bash
npm run collect-news
```

---

## 🚀 Local development

### Requirements

Use:

* Node.js **20 or 22 LTS**
* npm
* Docker
* PostgreSQL

> Node 24 is currently not supported by this project.

### 1. Clone the repository

```bash
git clone <repository-url>
cd MuksBooks
```

### 2. Create your environment file

```bash
cp .env.example .env
```

### 3. Start PostgreSQL

```bash
docker compose up -d
```

### 4. Install dependencies

```bash
npm install
```

### 5. Generate the Prisma client

```bash
npm run prisma:generate
```

### 6. Run database migrations

```bash
npm run prisma:migrate
```

### 7. Seed the database

```bash
npm run seed
```

### 8. Configure OpenAI

Add an API key to `.env`:

```env
OPENAI_API_KEY=your-openai-api-key
```

An optional model can also be configured:

```env
OPENAI_MODEL=gpt-4o-mini
```

### 9. Start MuksBooks

```bash
npm run dev
```

Then open:

```text
http://localhost:3000
```

---

## 🧑‍🏫 AI Tutor configuration

The AI Tutor is available at:

```text
/ai-tutor
```

When `OPENAI_API_KEY` is configured, the tutor can use the OpenAI API.

Without an API key, the application can fall back to a structured demo mode.

---

## 🍎 macOS troubleshooting

If the development server hangs or times out:

Confirm your Node version:

```bash
node -v
```

MuksBooks currently expects Node 20 or 22 LTS.

If the repository is stored in a cloud-synchronised Desktop or Documents directory, consider moving it to a local development folder such as:

```text
~/Projects/MuksBooks
```

Check for existing development servers:

```bash
lsof -nP -iTCP:3000-3010 -sTCP:LISTEN
```

Stop an old process if necessary:

```bash
kill <pid>
```

Then restart:

```bash
npm run dev -- --hostname 127.0.0.1 --port 3000
```

---

## 🔭 What's next?

MuksBooks is still evolving.

Areas currently being explored or improved include:

* ☁️ Full cloud persistence
* 🔐 Authentication and user accounts
* 🎓 Actuarial exemption tracking
* 💼 More robust career opportunity discovery
* 📊 Improved learning analytics
* 🧠 Deeper mastery modelling
* 📚 Better multi-file unit ingestion
* 📰 Expanded actuarial intelligence sources
* 🔗 Stronger connections between Planner, Careers, Tutor and Units
* 📱 Improved cross-device experience
* 🤖 Continued experimentation with specialised AI agents

---

## 💭 Why I built this

MuksBooks was not originally created as a portfolio project.

I built it because I had a problem I wanted to solve and had just discovered a technology I desperately wanted to experiment with.

What started as:

> *"I wonder what I could build with AI agents?"*

became:

> *"Could I build the system I wish I had as an actuarial student?"*

It is imperfect, experimental and constantly changing — but that is exactly what has made building it valuable.

Every new feature has given me another problem to understand.

Every bug has forced me to learn something.

And every iteration has shown me a little more about what becomes possible when domain knowledge, curiosity and AI tools are combined effectively.

---

## 👤 About the creator

MuksBooks is a personal project created by **Felicity Nangammbi**, an actuarial science student at Monash University with an interest in actuarial work, AI, technology and how emerging tools can improve the way people learn and work.

The project began after being introduced to AI coding agents through the **Monash Actuarial Students’ Society Project Committee** and grew from experimentation into the platform contained in this repository.

---

## 🤝 Feedback

MuksBooks is still a work in progress.

Feedback, ideas and suggestions are welcome — particularly from actuarial students, actuaries, developers and anyone experimenting with AI-assisted development.

If something is broken, confusing or could be genuinely useful if improved, feel free to raise an issue.

---

## ⚠️ Disclaimer

MuksBooks is an independent personal project and is **not an official Monash University application**.

AI-generated educational content should be treated as a study aid rather than an authoritative academic source. AI can make mistakes, always check important info.

Career opportunities and industry information should always be verified against the original employer, regulator, publication or professional body's website.
