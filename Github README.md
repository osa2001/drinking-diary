# Github README

# Drinking Diary

AI-powered alcohol tracking and drinking insight app. **Mobile-first web application with built-in PWA support** — designed to feel like a native app on iPhone.

---

## Overview

Drinking Diary is a **mobile-first web application** with built-in PWA support, designed to help users track alcohol consumption and better understand their drinking habits. The initial product is built to **feel like a native mobile app on iPhone** — responsive mobile layout, app-like bottom navigation, home screen installability, and full-screen experience.

The web app allows users to:

- log drinking sessions
- estimate intoxication levels
- explore drinks and cocktails
- discover nearby bars
- receive AI-generated drinking insights

---

## Features

### Drinking Diary

Users can record drinking sessions including:

- drink type
- volume
- alcohol percentage
- drinking time
- location
- notes

---

### BAC Estimation

The system estimates blood alcohol concentration using the Widmark formula.

This provides users with an approximate intoxication level.

---

### Drink Exploration

Users can explore drinks and cocktails using data from CocktailDB.

---

### Bar Discovery

Nearby bars are displayed using Google Places API.

Users can save or mark bars as visited.

---

### AI Insights

Weekly AI-generated reports summarize drinking habits.

Examples include:

- most consumed drinks
- drinking frequency
- peak intoxication levels

---

## Tech Stack

Frontend

```
React + Next.js + TypeScript
Progressive Web App (PWA) — built-in from start
```

- Mobile-first responsive design  
- Home screen installability  
- Full-screen standalone mode  
- Offline support via service worker

Backend

```
Supabase
```

Database

```
PostgreSQL
```

External APIs

```
CocktailDB
Google Places
OpenAI
```

Optional ML Backend

```
Python
FastAPI
```

---

## Architecture

```
Web App (React / Next.js) + PWA
   ↓
Supabase Backend
   ↓
PostgreSQL Database
   ↓
External APIs
```

---

## Database Schema

Core tables include:

```
profiles
drinks
drinking_sessions
drink_logs
bars
weekly_reports
```

---

## Development Roadmap

### Phase 1

Core diary features

### Phase 2

Autocomplete & caching

### Phase 3

BAC estimation

### Phase 4

Bar discovery

### Phase 5

AI insights

---

## Future Improvements

- personalized intoxication prediction
- drink recommendation system
- social features