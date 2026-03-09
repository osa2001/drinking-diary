# Architecture and Technical Design Document

# 1. Project Overview

**Drinking Diary** is a **mobile-first web application** with built-in Progressive Web App (PWA) support. It is designed to help users track alcohol consumption, understand intoxication levels, and gain insights into their drinking habits. The app allows users to record drinking sessions, explore alcohol information, discover nearby bars, and receive AI-generated insights about their drinking patterns.

The initial product is designed to **feel like a native mobile app on iPhone**, including responsive mobile layout, app-like navigation, home screen installability, and full-screen experience where possible.

The system is designed as a **lightweight but scalable architecture suitable for a personal project**, while still supporting deployment and future feature expansion.

The core design goals are:

- Simple architecture for solo development
- Mobile-first design with native app-like experience on iPhone
- Built-in PWA support (installable, offline-capable, full-screen)
- Scalable backend infrastructure
- Real-time data synchronization
- Good user experience for drink logging
- AI-powered insights generation
- Easy deployment and maintainability

---

# 2. High-Level System Architecture

The system follows a **mobile-first web-client + managed backend architecture**.

```
Web App (React / Next.js) + PWA
      │
      │ API requests
      ▼
Supabase Backend
  ├── Authentication
  ├── PostgreSQL Database
  ├── Storage
  └── Edge Functions
      │
      ├── External APIs
      │      ├── CocktailDB
      │      ├── Google Places
      │      └── OpenAI
      │
      └── Optional Python Microservice
             ├── BAC calculation
             ├── Drinking prediction
             └── AI report generation
```

### Key Idea

The architecture prioritizes **Supabase as the backend platform**, reducing the need to build a custom backend server. A Python service can be added later if advanced algorithms or analytics are required.

---

# 3. Technology Stack

The following technologies are used in the system.

### Frontend

```
React + Next.js + TypeScript
```

Used to build the mobile-first web application interface.

Advantages:

- Mobile-first responsive design for native app-like feel on iPhone
- Built-in PWA support (service worker, web app manifest, home screen install, full-screen display)
- Cross-platform (optimized for mobile, works on desktop)
- Modern declarative UI framework
- Fast development with hot reload
- SEO-friendly with server-side rendering (Next.js)
- Strong ecosystem and community support

---

### Backend Platform

```
Supabase
```

Supabase provides:

- Authentication system
- PostgreSQL database
- RESTful API
- Edge functions
- Storage

This significantly reduces backend development effort.

---

### Database

```
PostgreSQL
```

PostgreSQL is a relational database used to store:

- user profiles
- drinks
- drinking sessions
- drink logs
- bar data
- AI reports

It supports complex queries and strong data consistency.

---

### Local Storage & PWA

```
localStorage / IndexedDB
Service Worker (PWA)
```

PWA is built-in from the start. Local storage and service workers provide:

- recently used drinks
- favorite drinks
- offline caching and offline-capable experience
- quick autocomplete
- home screen installability (Add to Home Screen on iPhone)
- full-screen standalone display (no browser chrome)

---

### External APIs

The system integrates several third-party services.

| API | Purpose |
| --- | --- |
| CocktailDB | Alcohol and cocktail database |
| Google Places | Nearby bar discovery |
| OpenAI | AI insights generation |

---

### Optional Backend Service

```
Python + FastAPI
```

This service may be introduced later to support:

- advanced BAC prediction
- personalized intoxication models
- recommendation systems
- complex data analytics

---

# 4. System Modules

The application is divided into several major modules.

---

# 4.1 Authentication & User Profile

This module manages:

- user registration
- login
- user profile information

Profile data includes:

- weight
- height
- gender
- drinking tolerance

This information is required for **BAC calculation and intoxication prediction**.

---

# 4.2 Drink Catalog

The drink catalog contains information about alcoholic beverages.

Sources include:

- official drink database
- CocktailDB API
- user-created custom drinks

Each drink record contains:

- name
- brand
- alcohol percentage (ABV)
- category
- flavor profile
- volume

The catalog supports **search and autocomplete functionality**.

---

# 4.3 Drink Search & Autocomplete

To improve user experience, the system provides an intelligent drink search.

Search suggestions are ranked based on:

- prefix match
- partial text match
- fuzzy match
- recently used drinks
- favorite drinks
- custom drinks

This ensures users can quickly log drinks while typing only part of the name.

---

# 4.4 Drinking Diary

The drinking diary is the core feature of the application.

Users can create a **drinking session** representing a single drinking event.

Each session may contain multiple drink logs.

Session data includes:

- start time
- end time
- location
- companions
- mood
- notes
- self-reported intoxication level

Each drink log contains:

- drink type
- volume
- alcohol percentage
- time consumed

---

# 4.5 BAC & Intoxication Prediction

The system estimates blood alcohol concentration using the **Widmark formula**.

The BAC calculation considers:

- alcohol consumption
- body weight
- gender
- drinking duration

The result is converted into an estimated intoxication level.

In the future, a personalized prediction model may be developed based on historical drinking data.

---

# 4.6 Bar Map

Users can discover nearby bars using Google Places (with browser geolocation API).

Features include:

- interactive map view of nearby bars
- saving favorite bars
- marking visited bars
- linking drinking sessions to bar locations

---

# 4.7 AI Insights

The system generates AI-powered insights about user drinking habits.

Examples include:

- weekly drinking summary
- favorite drink categories
- most visited bars
- highest intoxication session

The workflow is:

1. Aggregate structured data from the database
2. Generate statistics
3. Send structured summary to OpenAI
4. Generate natural language insights

Generated reports are cached to reduce API costs.

---

# 5. Database Design

The system uses a relational database schema.

---

## 5.1 Profiles

```
profiles
- id
- display_name
- gender
- weight_kg
- height_cm
- tolerance_level
- created_at
```

---

## 5.2 Drinks

```
drinks
- id
- name
- brand
- category
- abv
- volume_ml
- source_type
- created_by
- flavor_profile
- aliases
- created_at
```

---

## 5.3 Drinking Sessions

```
drinking_sessions
- id
- user_id
- started_at
- ended_at
- location_name
- companions
- mood
- notes
- self_reported_drunk_level
- estimated_bac
- created_at
```

---

## 5.4 Drink Logs

```
drink_logs
- id
- session_id
- user_id
- drink_id
- amount
- volume_ml
- abv
- consumed_at
- note
```

Each drink log belongs to a **drinking session**.

---

## 5.5 Bars

```
bars
- id
- google_place_id
- name
- address
- lat
- lng
- rating
```

---

## 5.6 User Saved Bars

```
user_saved_bars
- user_id
- bar_id
- status
```

Status may include:

- saved
- visited
- favorite

---

## 5.7 Weekly Reports

```
weekly_reports
- user_id
- week_start
- week_end
- summary_json
- ai_text
```

This table stores cached AI-generated summaries.

---

# 6. Key Application Workflows

---

## Logging a Drinking Session

1. User creates a new session
2. User searches for a drink
3. Autocomplete returns drink suggestions
4. User selects a drink
5. Drink log is added
6. BAC is calculated in real time
7. Session summary is stored when session ends

---

## Drink Search Workflow

Search ranking considers:

- custom drinks
- recent drinks
- favorite drinks
- official drink database

This ensures frequently used drinks appear first.

---

## AI Report Generation

1. System aggregates user drinking data
2. Statistics are computed
3. Summary data is sent to OpenAI
4. AI generates a natural language report
5. The report is cached in the database

---

# 7. Deployment Strategy

The system is designed to be easily deployable.

Recommended deployment setup:

Frontend

```
Web App
(Vercel / Netlify / Cloudflare Pages)
```

Backend

```
Supabase Cloud
```

Optional Python Service

```
Render
Railway
Fly.io
```

This setup minimizes infrastructure maintenance.

---

# 8. Development Roadmap

The project will be implemented in phases.

---

### Phase 1 — Core Diary & PWA Foundation

- PWA setup (web app manifest, service worker, installability, full-screen)
- mobile-first responsive layout and app-like bottom navigation
- authentication
- user profile
- drink catalog
- drinking session logging
- drink logs

---

### Phase 2 — Search & UX

- drink autocomplete
- recent drinks
- favorite drinks
- local caching

---

### Phase 3 — BAC Estimation

- Widmark BAC calculation
- intoxication estimation
- dashboard summary

---

### Phase 4 — Explore & Map

- drink exploration
- cocktail database
- bar map

---

### Phase 5 — AI Insights

- weekly drinking summary
- AI-generated insights
- recommendation system

---

# 9. Design Principles

The system architecture follows several principles.

### Simplicity

The architecture is optimized for **solo development**.

### Scalability

Supabase and PostgreSQL support scaling if the application grows.

### Modularity

Modules are designed independently:

- diary
- catalog
- AI insights
- map

### Extensibility

Advanced features such as machine learning models can be added later through a Python microservice.

---

# Conclusion

The Drinking Diary architecture balances **simplicity, scalability, and functionality**. By leveraging modern backend platforms such as Supabase and integrating AI services, the system enables rapid development while maintaining flexibility for future enhancements.