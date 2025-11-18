# project_name

A minimal SXO project with example components and starter pages.

## Quick Start

Install dependencies:

```bash
pnpm install
```

Start the development server:

```bash
pnpm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
project_name/
├── src/
│   ├── components/     # Reusable UI components
│   ├── pages/          # Route pages (directory-based routing)
│   │   ├── about/      # About page route
│   │   └── index.jsx   # Homepage
│   ├── types/          # TypeScript type definitions
│   └── utils/          # Utility functions
├── sxo.config.js       # SXO configuration
└── package.json
```

## Creating a New Component

Create a new file in `src/components/`:

```jsx
/**
 * @fileoverview Button component - vanilla JSX example.
 */

/**
 * @typedef {import('../types/jsx.d.ts').HTMLButtonAttributes & {
 *   variant?: 'primary' | 'secondary';
 * }} ButtonProps
 */

/**
 * @param {ButtonProps} props
 */
export default function Button({ variant = 'primary', class: className, ...rest }) {
    const variantClass = variant === 'primary' ? 'bg-blue-500' : 'bg-gray-500';
    
    return (
        <button class={`px-4 py-2 rounded ${variantClass} ${className || ''}`} {...rest}>
            {rest.children}
        </button>
    );
}
```

## Creating a New Page/Route

Create a new directory and `index.jsx` file in `src/pages/`:

```jsx
// src/pages/blog/index.jsx
export default function BlogPage() {
    return (
        <html lang="en">
            <head>
                <meta charset="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <title>Blog - project_name</title>
            </head>
            <body>
                <h1>Blog</h1>
                <p>Welcome to the blog!</p>
            </body>
        </html>
    );
}
```

The page will automatically be available at `/blog`.

## Main Scripts

- `pnpm run dev` - Start development server with hot reload
- `pnpm run server` - Start production server
- `pnpm run build` - Build for production

## Learn More

- [SXO GitHub Repository](https://github.com/gc-victor/sxo)
- [basecoat-css Documentation](https://basecoat-css.vercel.app/)
- [@qery/reactive-component](https://github.com/qery-js/reactive-component)

## Adding More Components

Use the SXO CLI to add components from the basecoat library:

```bash
sxo add button
sxo add card
sxo add badge
```

## License

MIT
