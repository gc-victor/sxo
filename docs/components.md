# Components (SXOUI)

**[sxoui.com](https://sxoui.com)** — production-ready components for SXO.

SXOUI is a component library built specifically for SXO: 38 accessible, semantic, performant components that work with server-side rendering and optional client-side interactivity.

## Installation

Components are copied into your project with the CLI:

```shell
sxo add button
sxo add card
sxo add dialog
```

They land in the components directory (default `src/components/`, configurable via the `COMPONENTS_DIR` env or the `componentsDir` config key) — you own the code and can modify it.

## Available Components

**Layout & structure**: Card, Badge, Breadcrumb, Pagination, Table

**Form controls**: Input, Input Group, Textarea, Select, Native Select, Select Menu, Combobox, Checkbox, Radio Group, Switch, Slider, Label, Field, Form

**Feedback & overlays**: Alert, Alert Dialog, Dialog, Drawer, Toast, Skeleton, Tooltip, Progress

**Navigation**: Tabs, Dropdown Menu, Popover, Accordion, Collapsible, Command

**Content display**: Avatar, Button, Button Group, Icon, Empty

## Key Features

- **Zero framework dependencies** — vanilla JSX, no React required
- **WCAG 2.1 AA compliant** — full accessibility with ARIA attributes
- **Keyboard navigation** for all interactive elements
- **Dark mode ready** — CSS custom properties
- **Responsive**, mobile-first
- **Performance optimized** — minimal bundle size, tree-shaking
- **Type safe** — comprehensive JSDoc types
- **Progressive enhancement** — works without JavaScript where possible

## Usage

Components are plain functions: some ship a default export (`Button`, `Card`), compound parts are named exports (`CardHeader`, `CardSection`), and interactive components include a colocated `*.client.js` entry (see [Client](client.md)).

```jsx
// src/pages/index.jsx
import Button from "@components/button.jsx";
import Card, { CardFooter, CardHeader, CardHeaderTitle, CardSection } from "@components/card.jsx";

export default () => (
  <html lang="en">
    <head>
      <meta charSet="UTF-8" />
      <title>My App</title>
    </head>
    <body>
      <Card>
        <CardHeader>
          <CardHeaderTitle>Welcome</CardHeaderTitle>
        </CardHeader>
        <CardSection>
          <p>Get started with SXOUI components</p>
        </CardSection>
        <CardFooter>
          <Button variant="primary">Get Started</Button>
        </CardFooter>
      </Card>
    </body>
  </html>
);
```

## Documentation

Visit [sxoui.com](https://sxoui.com) for live demos, copy-paste snippets, complete API docs (props, variants), accessibility notes, and integration guides.
