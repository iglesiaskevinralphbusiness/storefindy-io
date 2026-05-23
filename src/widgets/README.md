# Widgets

Embeddable web components built from React. Bundled into a single `public/widgets.js` that any plain HTML page can load via one `<script>` tag.

## Run it yourself

```bash
npm run dev
```

Then open http://localhost:3000/tools.html.

To re-bundle after editing widgets, run this in a second terminal:

```bash
npm run dev:widgets
```

For a one-shot production build of the bundle:

```bash
npm run build:widgets
```

## Embed on any page

```html
<script src="https://yoursite.com/widgets.js" defer></script>

<my-widget title="Hello" theme="dark"></my-widget>
<another-widget label="Click me" color="blue"></another-widget>
```

## Adding a new widget

Say you're adding `<price-tag>`. Three files to touch (plus one optional).

### 1. Create `src/widgets/PriceTag.tsx`

```tsx
type Props = { amount?: string; currency?: string };

export default function PriceTag({ amount = '0', currency = 'USD' }: Props) {
  return <span className="tag">{currency} {amount}</span>;
}

export const priceTagStyles = `
  :host { display: inline-block; }
  .tag { font-weight: 600; }
`;
```

### 2. Register it in `src/widgets/index.tsx`

```tsx
import PriceTag, { priceTagStyles } from './PriceTag';

defineWidget({
  tagName: 'price-tag',                       // must contain a hyphen
  component: PriceTag,
  observedAttributes: ['amount', 'currency'], // every attr you want React to react to
  styles: priceTagStyles,
});
```

### 3. Rebuild

```bash
npm run build:widgets
```

Or leave `npm run dev:widgets` running for auto-rebuild on save.

### 4. (Optional) Add a live example to `public/tools.html`

```html
<price-tag amount="29.99" currency="USD"></price-tag>
```

## Gotchas

- **Tag name must have a hyphen** (`price-tag` ✅, `pricetag` ❌) — HTML spec requirement for custom elements.
- **All attributes arrive as strings.** If you need a number/bool/JSON, parse it inside the component (`Number(amount)`, `theme === 'dark'`, `JSON.parse(data)`).
- **Only attributes listed in `observedAttributes` trigger re-renders** when the host page changes them. Add every attribute you read.
- **Styles must live inside the component's exported style string** — Tailwind classes from `globals.css` will not apply (Shadow DOM blocks them). That is the isolation feature working as intended.
- **No SSR.** These are client-only; do not import them from `src/app/*`.

## File map

| File | Purpose |
| --- | --- |
| `src/widgets/index.tsx` | Registers every custom element |
| `src/widgets/defineWidget.tsx` | Generic React → Custom Element wrapper (Shadow DOM, attribute observation) |
| `src/widgets/MyWidget.tsx` | Example widget — `title`, `theme` |
| `src/widgets/AnotherWidget.tsx` | Example widget — `label`, `color` |
| `scripts/build-widgets.mjs` | esbuild bundler config |
| `public/widgets.js` | Built output (loaded by host pages) |
| `public/tools.html` | Live demo + embed snippet |
