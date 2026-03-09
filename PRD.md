# PRD

# Drinking Diary

**Product Requirements Document (PRD)**

Version: 1.0

Platform: Web (mobile-first)

Product Type: Mobile-First Lifestyle Tracking Web Application with built-in PWA support

---

# 1. Product Overview

## 1.1 Product Vision

Drinking Diary is a **mobile-first** private alcohol tracking web application with **built-in Progressive Web App (PWA) support**. It allows users to record their drinking activities, learn about different alcoholic beverages, and predict their intoxication level based on personal drinking history and physiological data.

The initial product is designed to **feel like a native mobile app on iPhone**: responsive mobile layout, app-like bottom navigation, home screen installability ("Add to Home Screen"), and full-screen standalone experience where possible.

The web app aims to combine:

- alcohol knowledge database
- personal drinking diary
- intoxication prediction
- AI-generated drinking insights

into a single lifestyle tool for alcohol enthusiasts.

---

## 1.2 Product Positioning

Drinking Diary is primarily a:

**Personal Alcohol Diary + Alcohol Knowledge App**

Core value propositions:

1. Track personal drinking history
2. Understand alcohol types and cocktail recipes
3. Predict intoxication levels using BAC and personalized models
4. Generate AI-powered drinking reports and recommendations

The web app is **private**, meaning data is only visible to the user.

---

# 2. Target Users

## Primary Users

Alcohol enthusiasts who:

- enjoy cocktails, beer, whiskey, wine, or spirits
- want to track their drinking habits
- are curious about alcohol knowledge
- want to better understand their alcohol tolerance

Typical scenarios:

- recording a night out drinking
- learning about cocktails
- estimating intoxication level before drinking
- reviewing drinking history

---

# 3. Product Goals

### Goal 1

Provide an easy way for users to log their drinking activity.

### Goal 2

Build a personal alcohol consumption profile.

### Goal 3

Predict intoxication level based on drinking behavior and physiological information.

### Goal 4

Help users explore alcohol knowledge and bar locations.

---

# 4. Core Features

The product consists of **four main modules**.

---

# 4.1 Drink Diary

Users can record their drinking activities through a calendar-based logging system.

The diary allows users to track drinking events and associated contextual information.

## Recorded Data per Drinking Session

```
date
drinks
location
companions
mood
notes
intoxication level (slider)
```

Example:

```
Date: March 6

Drinks:
IPA x2
Grey Goose Vodka x1

Location: Atlas Bar
Mood: Happy
With: Alex
Drunk Level: 6 / 10
```

Each logged drink is linked to a drink entry that contains alcohol information (ABV, category, etc.), which is used for BAC and intoxication prediction.

---

# 4.1.1 Drink Search Autocomplete

To simplify drink logging and improve data accuracy, the web app provides an intelligent search suggestion system when users enter drink names.

As the user types in the drink search field, the system automatically displays a dropdown list of possible drink matches.

This allows users to quickly select the correct drink brand or type.

---

## Trigger Behavior

The autocomplete suggestion system activates when the user enters **at least two characters** in the drink search field.

Example input:

```
vod
```

Suggested results:

```
Grey Goose · Vodka · 40%
Ketel One · Vodka · 40%
Absolut · Vodka · 40%
Smirnoff · Vodka · 40%
```

Selecting a suggestion automatically fills in drink metadata, including alcohol category and ABV.

---

## Matching Logic

Drink suggestions are ranked using the following criteria:

1. Prefix matching (highest priority)
2. Partial text matching
3. Fuzzy matching (handles typos)
4. User preference weighting (frequently logged drinks ranked higher)

---

## Data Sources

The autocomplete system retrieves drink suggestions from three sources in priority order:

1. **User custom drinks** (moonshine or personal drinks)
2. **Recently logged or favorite drinks**
3. **Official alcohol database**

This ensures that drinks created by the user appear quickly in search suggestions.

---

## Manual Entry Option

If the drink the user is searching for does not exist in the database, the user can manually add it as a custom drink.

Example UI:

```
No results found
+ Add Custom Drink
```

After creation, the custom drink becomes part of the user's personal drink library and will appear in future autocomplete suggestions.

---

# 4.2 Alcohol Knowledge Database (Updated)

The web app provides an alcohol knowledge database that allows users to explore different types of alcoholic beverages.

The database includes both **cocktails and base alcohol categories**, enabling users to learn about drink ingredients, alcohol content, flavor profiles, and origin stories.

Supported categories include:

```
cocktails
beer
whiskey
gin
rum
vodka
tequila
wine
liqueur
```

Users can browse drinks by category or search directly by name.

---

## Data Sources

To provide comprehensive alcohol information, the system integrates multiple data sources.

### 1. Cocktail Database

Cocktail recipes and preparation methods are retrieved from:

```
TheCocktailDB API
```

This database provides:

- cocktail names
- ingredients
- preparation instructions
- glass types
- alcohol categories

---

### 2. Alcohol Brand and Category Database

Information about base alcohol types and brands (e.g., beer, vodka, whiskey) is retrieved from an alcohol brand database.

This database provides:

```
drink name
brand
alcohol category
ABV
flavor profile
country of origin
```

Examples:

```
Grey Goose — Vodka — 40% — France
Guinness — Stout Beer — 4.2% — Ireland
Macallan 12 — Whisky — 40% — Scotland
```

This database is used for:

- drink search autocomplete
- BAC calculation
- alcohol knowledge browsing

---

### 3. User Custom Drinks

Users may create custom drink entries when a drink is not found in the database.

These include:

```
moonshine
homemade alcohol
rare local alcohol
custom cocktails
```

Custom drinks are stored in the user's **Personal Drink Library** and will appear in drink search suggestions.

---

# Database Structure Update

To support multiple alcohol categories, the **Drinks table** includes the following fields:

```
id
name
brand
category
abv
volume
origin_country
flavor_profile
aliases
```

Example record:

```
name: Grey Goose
brand: Grey Goose
category: Vodka
abv: 40
origin_country: France
```

---

# Integration With Drink Logging

All drinks in the database (cocktails, alcohol brands, and custom drinks) are searchable through the drink autocomplete system.

When a drink is selected:

```
drink name
category
ABV
volume
```

are automatically populated and used in **BAC and intoxication prediction calculations**.

---

# 4.3 Intoxication Prediction

One of the core differentiating features.

The web app predicts intoxication levels based on:

- physiological data
- drink type
- drinking history

---

## Model Structure

The prediction system is a **hybrid model**.

### Layer 1: Physiological BAC Model

The web app calculates Blood Alcohol Concentration using the Widmark Formula.

BAC formula:

```
BAC = (A × 5.14 / (W × r)) − 0.015 × H
```

Where:

A = alcohol consumed (ounces)

W = body weight

r = body water constant

```
male = 0.73
female = 0.66
```

H = hours since drinking started

---

### Layer 2: Personalized Intoxication Model

Because subjective intoxication differs between individuals, the system also estimates:

```
drunk level (0–10)
```

Inputs include:

```
BAC
drink count
drink type
drinking speed
user drinking history
body data
```

Output:

```
predicted intoxication level
```

The model gradually improves as more user data is collected.

---

# 4.4 Bar Map

Users can explore and save bars.

Integration:

**Google Places API**

Users can:

- view bars on map
- mark visited bars
- save favorite bars

The web app generates:

```
My Drinking Map
```

which visualizes the user’s drinking locations.

---

# 4.5 AI Features

Two AI-powered features will be included.

---

## AI Drinking Report

The system generates weekly summaries of drinking behavior.

Example:

```
Weekly Drinking Summary

You had 6 drinks this week.

Most frequent alcohol:
IPA

Favorite bar:
Atlas Bar

Highest intoxication night:
Friday (7/10)
```

Reports may also include insights such as:

- drinking patterns
- favorite drinks
- monthly drinking trends

---

## AI Bar Recommendation

Based on:

```
favorite alcohol types
visited bars
location
drinking preferences
```

The system recommends a bar each week.

Example:

```
Recommended bar this week:
Employees Only (Singapore)
```

---

# 5. Web App Structure

The application uses a **5-section navigation** with a **mobile-first, app-like design**:

- **Bottom tab bar** on mobile (native app-style navigation)
- Responsive layout that prioritizes mobile viewport
- Full-screen display when installed as PWA (no browser chrome)

```
Home
Diary
Explore
Map
Profile
```

---

## Home

Displays:

- today’s drinks
- predicted intoxication level
- BAC estimate
- weekly drink count
- recommended bar

---

## Diary

Calendar view of drinking history.

Users can:

- view past drinking sessions
- add new drink logs
- record intoxication levels

---

## Explore

Alcohol database.

Users can:

- search drinks
- view recipes
- learn about alcohol types

---

## Map

Bar exploration map.

Functions:

- discover bars
- save bars
- mark visited bars

---

## Profile

User personal data:

```
height
weight
gender
drinking tolerance
```

Also includes:

```
favorite drinks
lifetime drink count
monthly reports
```

---

# 6. Data Structure

Key database tables.

---

## Users

```
id
height
weight
gender
tolerance
```

---

## Drinks

```
id
name
type
abv
volume
```

---

## DrinkLogs

```
user_id
drink_id
amount
time
date
```

---

## Sessions

A drinking event.

```
start_time
end_time
location
mood
companions
notes
drunk_level
```

---

## Bars

```
name
location
rating
```

---

## Favorites

```
user_id
drink_id
```

---

# 7. Technology Stack

The Drinking Diary application is designed as a **mobile-first web application with built-in PWA support** and a lightweight backend architecture.

The initial product is designed to **feel like a native mobile app on iPhone**, including responsive mobile layout, app-like navigation, home screen installability, and full-screen experience where possible.

The system integrates external APIs for drink information, location services, and AI-powered insights.

The technology stack prioritizes **stability, fast search performance, simple deployment, and mobile-first UX** for a small private user base.

---

# 7.1 Frontend

The web application will be developed using:

```
React + Next.js + TypeScript
Progressive Web App (PWA)
```

This stack provides:

- **Mobile-first responsive design** — primary viewport is mobile; desktop is enhanced
- **Built-in PWA support** — web app manifest, service worker, home screen install, full-screen standalone mode
- **App-like navigation** — bottom tab bar on mobile for native feel
- modern declarative UI framework
- fast development iteration with hot reload
- efficient state management for interactive components such as drink search autocomplete
- SEO-friendly server-side rendering (Next.js)

Key UI components include:

- drink logging interface
- drink search autocomplete dropdown
- calendar-based drinking diary
- alcohol knowledge browsing
- map-based bar exploration

---

# 7.2 Backend

The backend system will be implemented using:

```
Supabase
```

Supabase provides:

- authentication
- PostgreSQL database
- REST and realtime APIs
- cloud storage
- simple deployment

The backend stores:

- user profiles
- drink logs
- drinking sessions
- custom drinks
- user preferences
- drinking statistics

Supabase enables secure user data storage while keeping the architecture lightweight.

---

# 7.3 Local Data Storage & PWA

PWA support is **built-in from the start**. To ensure fast search performance, offline functionality, and installability:

Local storage and service worker cache may include:

```
drink brand database
recently logged drinks
favorite drinks
custom drinks
```

Implementation:

```
localStorage
IndexedDB
Service Worker (offline caching, installability)
Web App Manifest (home screen add, full-screen display)
```

Local caching improves performance for the **drink search autocomplete system**. PWA enables **home screen installability**, **full-screen standalone experience**, and **offline access** on iPhone and other devices.

---

# 7.4 External APIs

The application integrates several external APIs to provide drink information, location services, and AI-powered features.

---

## 7.4.1 Cocktail Database API

Cocktail recipes and preparation information are retrieved from:

```
TheCocktailDB API
```

This API provides:

- cocktail names
- ingredients
- preparation instructions
- glass types
- drink categories

This data powers the **cocktail knowledge section** in the Explore module.

---

## 7.4.2 Alcohol Brand Database

To support a wide range of alcoholic beverages, the system maintains a database of alcohol brands and drink categories.

Supported categories include:

```
beer
whiskey
vodka
gin
rum
tequila
wine
liqueur
```

This database contains information such as:

```
drink name
brand
alcohol category
ABV
origin country
flavor profile
aliases
```

Example entries:

```
Grey Goose — Vodka — 40% — France
Guinness — Stout Beer — 4.2% — Ireland
Macallan 12 — Whisky — 40% — Scotland
```

This database is used for:

- drink search autocomplete
- drink logging
- BAC calculation
- alcohol knowledge browsing

---

## 7.4.3 Map and Bar Location API

Bar discovery and map visualization are powered by:

```
Google Places API
```

This API provides:

- bar locations
- ratings
- opening hours
- geographic coordinates

These data are used in the **Map module**, where users can:

- discover bars
- mark visited bars
- save favorite bars

---

## 7.4.4 AI Services

AI functionality is powered by:

```
OpenAI API
```

AI services are used for:

- generating weekly drinking reports
- generating drinking insights
- recommending bars based on user preferences

Example output:

```
Weekly Drinking Summary

You had 6 drinks this week.

Most frequent alcohol: IPA
Favorite bar: Atlas Bar
Highest intoxication: Friday night (7/10)
```

---

# 7.5 Search and Autocomplete System

The drink search input field includes an **autocomplete suggestion system** to simplify drink logging.

When users type part of a drink name, the system displays a list of suggested drinks.

Suggestions are retrieved from:

1. user custom drinks
2. recently logged drinks
3. official alcohol database

The system ranks results based on:

- prefix matching
- partial text matching
- fuzzy matching
- user preference weighting

If a drink is not found, users can create a **custom drink entry**, which will then be included in future search suggestions.

---

# 7.6 AI Recommendation Engine

The system includes a lightweight AI recommendation module.

Inputs include:

```
favorite alcohol types
drinking history
visited bars
user location
```

Outputs include:

```
weekly drinking report
personal drinking insights
bar recommendations
```

This module enhances user engagement by providing personalized drinking insights.

---

# 7.7 Future Scalability

The architecture is designed to support additional integrations in the future.

Potential integrations include:

```
Untappd API (beer database)
Vivino API (wine database)
spirits and whisky databases
```

These integrations would expand the alcohol knowledge database.

---

# 7.8 Security and Privacy

Because Drinking Diary is a **private personal tracking application**, user data is protected using:

```
secure authentication
encrypted data transmission
private user data storage
```

User drinking records are not shared publicly.

---

# 9. MVP Scope

The first version of Drinking Diary will focus on the **core drink tracking and alcohol knowledge experience**, while more advanced features will be introduced in later versions.

---

# Phase 1 — Core Drinking Diary & PWA Foundation

Mobile-first foundation and core functionality for recording drinking activity.

Features include:

- **PWA setup** — web app manifest, service worker, home screen installability, full-screen standalone display
- **Mobile-first layout** — responsive design, app-like bottom tab navigation
- drink logging
- drink search autocomplete (for logging drinks)
- custom drink creation
- intoxication slider
- calendar-based drink history

---

# Phase 2 — BAC Prediction

Basic intoxication prediction system.

Features include:

- BAC calculation using Widmark formula
- estimated intoxication level display

Required inputs:

```
weight
gender
drink ABV
drink volume
drinking duration
```

---

# Phase 3 — Alcohol Knowledge Database

Alcohol information browsing.

Features include:

- cocktail knowledge database integration
- alcohol category browsing
- drink information pages

---

# Phase 4 — Bar Map

Location-based bar discovery.

Features include:

- map view
- bar discovery
- favorite bars
- visited bars

Powered by:

```
Google Places API
```

---

# Phase 5 — AI Insights

AI-generated drinking insights.

Features include:

- weekly drinking report
- basic bar recommendation

Powered by:

```
OpenAI API
```

---

# MVP Release Goal

The MVP release should enable users to:

- use the app as a **mobile-first PWA** (install to home screen, full-screen experience on iPhone)
- record drinking activities
- estimate intoxication level
- explore alcohol knowledge
- review drinking history

Advanced features such as **improved AI recommendations and expanded alcohol databases** will be introduced in later versions.

---

# 9. Privacy

The web app is designed as a **private personal diary**.

User data:

- is not public
- is not shared with other users

No social features will be included in the initial version.

---

# 10. Success Metrics

Key metrics include:

- number of drink logs per user
- weekly active users
- user retention
- frequency of report generation
- number of saved drinks