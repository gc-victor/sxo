# SXOUI: Collection of Components

A comprehensive showcase project demonstrating the integration of **SXO** (server-side JSX framework), **reactive-component** (client-side islands), and **basecoat-css** (component styling system). This project serves as a reference implementation for building modern web applications with this powerful stack.

**🌐 Live Demo & Documentation**: [https://sxoui.com](https://sxoui.com)

SXOUI is a production-ready component library built on vanilla JSX with no client-side framework dependencies. All components are designed for server-side rendering with optional client-side interactivity through reactive islands. The library provides accessible, semantic, and performant components that work seamlessly with any backend stack.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Architecture](#architecture)
- [Components](#components)
  - [UI Components](#ui-components)
  - [Component Features](#component-features)
  - [Using Components](#using-components)
- [Development](#development)
- [Build & Deployment](#build--deployment)
- [Contributing](#contributing)
- [License](#license)

## Overview

This project showcases how to build modern web interfaces using:

- **[SXO Framework](https://github.com/gc-victor/sxo)**: Server-side JSX transformer with hot-reload, routing, and esbuild integration
- **[reactive-component](https://github.com/gc-victor/reactive-component)**: Lightweight reactive islands for client-side interactivity
- **[basecoat-css](https://basecoatui.com)**: Pre-built component styles and design tokens
- **Tailwind CSS**: Utility-first CSS framework for custom styling

The result is a **fast, accessible, and maintainable** component library that works across any traditional web stack - no React required.

## Features

### 🚀 **Performance First**

- Server-side rendering with minimal client JavaScript
- Fast builds powered by esbuild and Rust/WASM JSX transformer
- Optimized asset serving with precompression and caching

### 🎨 **Design System**

- Comprehensive component library with 20+ components
- Consistent design tokens and theming
- Dark mode ready with Tailwind CSS integration
- Accessible components following WCAG guidelines

### 🏗️ **Developer Experience**

- Hot-reload development server with SSE-based updates
- Directory-based routing with dynamic segments
- TypeScript/JSDoc support with strict checking
- Biome linting and formatting

### 🔧 **Framework Agnostic**

- Works with any backend (Node.js, Python, PHP, etc.)
- Plain HTML output, no framework lock-in
- Vanilla JavaScript for client interactivity
- Compatible with existing CSS and JavaScript

### 📱 **Modern UX**

- Responsive design with mobile-first approach
- Keyboard navigation and screen reader support
- Progressive enhancement with client islands
- Smooth animations and transitions

## Installation

### Prerequisites

- Node.js 20+
- pnpm (recommended) or npm

### Clone and Install

```bash
git clone https://github.com/gc-victor/sxo
cd components
pnpm install
```

## Quick Start

### Development

Start the development server with hot-reload:

```bash
pnpm dev
```

This will:

- Start the SXO dev server on `http://localhost:3000`
- Watch for file changes and reload automatically
- Open your browser to the homepage

### Build for Production

```bash
pnpm sxo:build    # Build production bundles
pnpm sxo:generate # Pre-render static routes to HTML
pnpm sxo:start    # Start production server
```

### View Components

Visit the following routes to explore:

- `/` - Complete component showcase

## Project Structure

```
components/
├── src/
│   ├── components/          # Reusable UI components (JSX + client scripts)
│   ├── pages/               # SXO routes (directory = route)
│   │   ├── index.jsx        # Homepage (/)
│   │   ├── sections/        # Reusable page sections
│   │   ├── client/          # Client-side entry for homepage
│   │   └── global.css       # Compiled Tailwind output
│   ├── types/               # TypeScript type definitions
│   │   └── jsx.d.ts         # JSX element type definitions
│   ├── utils/               # Utility functions
│   │   ├── cn.js            # Class name utility (like clsx)
│   │   ├── escape-html.js   # HTML escaping utilities
│   │   └── highlight-jsx.*  # JSX syntax highlighting
│   └── styles.css           # Tailwind source file
├── e2e/                     # End-to-end tests
├── test-results/            # Test output and reports
├── dist/                    # Build output (generated)
│   ├── client/              # Public assets (HTML, CSS, JS)
│   └── server/              # SSR bundles + routes.json
├── biome.json               # Biome linter/formatter config
├── jsconfig.json            # JavaScript/TypeScript config
├── sxo.config.js            # SXO framework configuration
├── playwright.config.js     # E2E testing configuration
├── package.json             # Dependencies and scripts
└── pnpm-lock.yaml           # pnpm lock file
```

## Architecture

### Component Architecture

Components are built using **vanilla JSX** - pure functions that return HTML strings, no React runtime required.

#### JSX Components (`src/components/`)

```javascript
/**
 * @param {ButtonProps} props
 * @returns {string} HTML string
 */
export default function Button({ children, className, variant = "primary", ...rest }) {
  const classes = cn("btn", variantClasses[variant], className);

  return (
    <button class={classes} {...rest}>
      {children}
    </button>
  );
}
```

#### Client Islands (`*.client.js`)

For interactivity, use reactive-component's `define()` API:

```javascript
import { define } from "@qery/reactive-component";

define("bc-accordion", ({ $state, $bind }) => {
  $state.openItems = [];

  $bind.toggle = (itemId) => {
    // Toggle logic
  };
});
```

### Routing

- **Directory-based**: Each folder in `src/pages/` becomes a route
- **Dynamic routes**: Use `[slug]` for parameterized routes
- **Full HTML documents**: Each page returns complete `<html>` with `<head>` and `<body>`

## Components

### UI Components

SXOUI includes 25+ production-ready components, all available at [sxoui.com](https://sxoui.com) with live demos, code examples, and installation instructions:

#### Layout & Structure
- **Card** - Flexible container with header, body, and footer sections
- **Badge** - Small inline status indicators and labels
- **Breadcrumb** - Hierarchical navigation trail
- **Pagination** - Multi-page navigation controls
- **Table** - Accessible data tables with sorting and styling

#### Form Controls
- **Input** - Text, email, password, and number inputs
- **Textarea** - Multi-line text input with auto-resize
- **Select** - Native dropdown select with styling
- **Select Menu** - Custom accessible dropdown with search and keyboard navigation
- **Checkbox** - Toggle selection with indeterminate state support
- **Radio Group** - Mutually exclusive option selector
- **Switch** - Toggle switch for boolean values
- **Slider** - Range input for numeric values
- **Label** - Accessible form field labels
- **Form** - Form validation and layout utilities

#### Feedback & Overlays
- **Alert** - Informational banners with variants (info, success, warning, error)
- **Alert Dialog** - Modal confirmation dialogs
- **Dialog** - General-purpose modal dialogs
- **Toast** - Temporary notification messages
- **Skeleton** - Loading placeholders
- **Tooltip** - Contextual help on hover/focus

#### Navigation & Interaction
- **Tabs** - Content organization with tabbed interface
- **Dropdown Menu** - Accessible action menus
- **Popover** - Floating content panels
- **Accordion** - Expandable/collapsible content sections

#### Content Display
- **Avatar** - User profile images with fallback
- **Button** - Primary interaction buttons with variants
- **Icon** - SVG icon system with semantic usage

### Component Features

All SXOUI components are built with the following principles:

- **Semantic HTML**: Proper accessibility attributes and WCAG 2.1 AA compliance
- **Keyboard Navigation**: Full keyboard support for all interactive elements (Tab, Enter, Space, Arrow keys, Escape)
- **Screen Reader Support**: Comprehensive ARIA attributes, labels, and live regions
- **Theme Support**: Built-in dark/light mode with CSS custom properties
- **Responsive Design**: Mobile-first approach with breakpoint utilities
- **Zero Runtime Dependencies**: No React, Vue, or other framework required
- **Progressive Enhancement**: Works with JavaScript disabled where possible
- **Type Safety**: Full JSDoc type definitions for all components
- **Customizable**: CSS custom properties for theming and easy style overrides
- **Performance Optimized**: Minimal bundle size with tree-shaking support

### Using Components

Visit [sxoui.com](https://sxoui.com) for:
- **Live Examples**: Interactive component demonstrations
- **Copy-Paste Ready**: Complete code snippets for each component
- **API Documentation**: Props, variants, and usage patterns
- **Accessibility Notes**: WCAG compliance details and keyboard shortcuts
- **Integration Guides**: Framework-specific usage examples

## Development

### Available Scripts

```bash
# Development
pnpm dev                # Start SXO dev server + Tailwind watch (parallel)
pnpm sxo:dev            # SXO dev server only
pnpm watch:tailwind     # Tailwind watch mode only

# Build & Production
pnpm sxo:build          # Build production bundles
pnpm sxo:generate       # Pre-render static routes to HTML
pnpm sxo:start          # Start production server
pnpm sxo:clean          # Remove dist/ directory

# Quality Assurance
pnpm check              # Biome lint check
pnpm check:fix          # Biome lint + auto-fix
pnpm test:e2e           # Full e2e testing
pnpm test:e2e <filepath> # Test specific component
```

### Development Guidelines

#### Code Standards

- **JSX**: Vanilla JSX compiled to template literals (NOT React)
- **Imports**: Use `.js` extensions for all imports
- **Formatting**: Biome with 4-space indentation, 140-character line width
- **Naming**: PascalCase for components, camelCase for functions
- **Documentation**: JSDoc for all exported components

#### Component Development

1. Create component in `src/components/`
2. Add proper JSDoc documentation
3. Export with named exports for composition
4. Add usage examples in `src/pages/sections/`
5. Update kitchen sink showcase

#### Testing

- **E2E Tests**: Playwright for component integration tests
- **Validation**: Run `pnpm check:fix` before committing
- **Component Testing**: Test specific components with `pnpm test:e2e <filepath>`

## Build & Deployment

### Production Build

```bash
# Build client and server bundles
pnpm sxo:build

# Pre-render static routes (optional, improves performance)
pnpm sxo:generate

# Start production server
pnpm sxo:start
```

### Deployment Options

- **Static Hosting**: Use `pnpm sxo:generate` for static site generation
- **Server**: Deploy with Node.js server using `pnpm sxo:start`
- **Edge/CDN**: Compatible with Cloudflare Workers, Vercel, Netlify
- **Traditional Servers**: Works with Express, Fastify, or any HTTP server

## Contributing

### Development Setup

1. Fork the repository
2. Clone your fork: `git clone <your-fork-url>`
3. Install dependencies: `pnpm install`
4. Start development: `pnpm dev`

### Guidelines

#### Code Quality

- Follow the standards in `AGENTS.md`
- Run `pnpm check:fix` before committing
- Write descriptive commit messages
- Keep PRs focused and reviewable

#### Component Contributions

- Add components to `src/components/`
- Include comprehensive JSDoc documentation
- Add usage examples in `src/pages/sections/`
- Update kitchen sink showcase
- Ensure accessibility compliance

#### Testing

- Add E2E tests for new components
- Test across different browsers and devices
- Validate with screen readers and keyboard navigation

### File Restrictions

⚠️ **Do NOT modify** these configuration files without explicit permission:

- `biome.json` - Linting and formatting rules
- `jsconfig.json` - TypeScript/JavaScript configuration
- `sxo.config.js` - SXO framework settings
- `package.json` - Dependencies and scripts

### Anchor Comments

Add `AIDEV-NOTE:` comments for complex logic, important patterns, or non-obvious decisions.

### Commit Standards

Use conventional commit format:

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `style:` - Code style changes
- `refactor:` - Code refactoring
- `test:` - Testing changes
- `chore:` - Maintenance tasks

## License

MIT License - see [LICENSE](../LICENSE) file for details.

---

Built with ❤️ using [SXO](https://github.com/gc-victor/sxo), [reactive-component](https://github.com/gc-victor/reactive-component), and [basecoat-css](https://basecoatui.com).

**Explore the full component library at [sxoui.com](https://sxoui.com)** - Live demos, documentation, and copy-paste ready code for all components.
