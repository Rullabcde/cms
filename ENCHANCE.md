# Project Enhancement Guide: Credential Management Dashboard

## 🎯 Context & Goal

This document outlines the required functional improvements, bug fixes, and UI/UX enhancements for the Credential Management System (CMS) dashboard. The application currently has a base layout but lacks core logic for several components and needs a more modern, elegant design overhaul.

Please analyze the current codebase and implement the following points step-by-step.

---

## 🛠️ 1. Functional Enhancements

### A. Global Search Implementation

- **Current State:** The search bar at the top is a static UI component.
- **Requirement:** Implement real-time search logic (with debounce to prevent excessive rendering/API calls). The search should filter the credential cards based on their title (e.g., "Postgres", "MySQL"), tags, or descriptions.

### B. Sidebar Category Filtering

- **Current State:** Clicking categories in the sidebar (`Database`, `Elastic`, `Kubernetes`, etc.) does nothing.
- **Requirement:** Bind the sidebar items to the main view's state. When a category is selected, the main view should only display credentials associated with that specific category. Ensure there is an "All Credentials" state.

### C. Add New Category Feature

- **Current State:** There is a `+` icon next to "CATEGORIES" in the sidebar, but no functionality.
- **Requirement:** Create an interactive flow (e.g., a small modal or an inline input field) when the `+` button is clicked. Include the logic to save this new category to the database/state and dynamically update the sidebar list.

### D. Export to CSV Feature

- **Current State:** No export functionality exists.
- **Requirement:** Add an "Export CSV" button (ideally positioned next to the "+ Add Credential" button). Implement a utility function that parses the currently displayed (or filtered) credentials and downloads them as a formatted `.csv` file.

---

## 🐛 2. Bug Fixes

### A. Post-Login Routing Issue

- **Current State:** After successful authentication, the app redirects the user to port `8000` (which is likely the backend API port).
- **Requirement:** Fix the routing logic in the authentication flow. Upon successful login, the application must redirect the user to the frontend dashboard URL (e.g., `http://localhost:3000/dashboard` or `/`).

---

## ✨ 3. UI/UX Improvements (Modern & Elegant feel)

The current UI is functional but visually flat. Upgrade the design using the existing CSS framework (e.g., Tailwind CSS/CSS Modules) with the following principles:

- **Card Interactions:** Add subtle hover effects on the credential cards (e.g., a slight upward transform `translate-y-1`, soft glow/shadow, and smooth `transition-all duration-300`).
- **Action Icons Visibility:** Make the action icons (`View`, `Edit`, `Delete`) inside the cards look more interactive. Add distinct hover colors (e.g., red for delete, blue for edit) and tooltips.
- **Tag Styling:** Improve the tags (`production`, `sre`, `development`, `ai`). Use subtle background tints with matching text colors (e.g., a soft red background for `production`, soft green/blue for `development`) to make them easily distinguishable.
- **Typography & Spacing:** Enhance the visual hierarchy. Make the title of the credentials bolder and slightly larger. Ensure there is comfortable padding inside the cards and consistent gaps between UI elements.
- **State Handling (Empty & Loading):** Implement elegant Skeleton Loaders when fetching data, and a beautifully designed "Empty State" component (with a relevant icon) when a search or category filter yields no results.
