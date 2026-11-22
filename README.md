<div align="center">
  <img src="https://user-images.githubusercontent.com/37687705/192227260-db082018-947a-4166-a3f4-983e1024dd59.png" width="20%">
  <h1>Strapi Drag Drop Content Types Plugin</h1>
  <p>Drag-and-drop content ordering for Strapi v5 collection types</p>

[![npm version](https://img.shields.io/npm/v/@yunusemrejs/drag-drop-content-types-strapi5)](https://www.npmjs.com/package/@yunusemrejs/drag-drop-content-types-strapi5)
[![npm downloads](https://img.shields.io/npm/dm/@yunusemrejs/drag-drop-content-types-strapi5)](https://www.npmjs.com/package/@yunusemrejs/drag-drop-content-types-strapi5)
[![GitHub issues](https://img.shields.io/github/issues/yunusemrejs/drag-drop-content-types-strapi5)](https://github.com/yunusemrejs/drag-drop-content-types-strapi5/issues)
[![GitHub stars](https://img.shields.io/github/stars/yunusemrejs/drag-drop-content-types-strapi5)](https://github.com/yunusemrejs/drag-drop-content-types-strapi5/stargazers)
[![License](https://img.shields.io/npm/l/@yunusemrejs/drag-drop-content-types-strapi5)](https://github.com/yunusemrejs/drag-drop-content-types-strapi5/blob/main/LICENSE)

</div>

## Features

![dragdropcrop](https://user-images.githubusercontent.com/37687705/212884821-356ec68c-b71a-4b89-9e99-8a625f84cfbe.gif)

- Built for Strapi v5 (`>=5.9.0`) with TypeScript and `@dnd-kit`
- Works on default Content Manager list views even when `page` / `pageSize` URL parameters are omitted, and supports `0` as a valid initial rank
- Supports active Content Manager filters: reorders only matching entries while preserving existing rank slots so unfiltered entries are unaffected
- Scrollable sort menu with **Show more** and **Show all** controls for larger collections
- Internationalization (i18n) aware (omits `locale` automatically when i18n is not active)
- Optional webhook execution (`entry.update`) after rank updates
- Configurable title, subtitle, and rank field names

Originally inspired by the [Drag-Drop-Content-Type Strapi 4 plugin](https://github.com/plantagoIT/strapi-drag-drop-content-type-plugin) and rewritten with `dnd-kit` for Strapi v5 and React 18.

## Installation

```bash
# npm
npm install @yunusemrejs/drag-drop-content-types-strapi5

# yarn
yarn add @yunusemrejs/drag-drop-content-types-strapi5

# pnpm
pnpm add @yunusemrejs/drag-drop-content-types-strapi5
```

## Configuration

### 1. Enable the plugin

Add the plugin to `config/plugins.ts`:

```typescript
export default () => ({
  'drag-drop-content-types-strapi5': {
    enabled: true,
  },
});
```

### 2. Build and restart Strapi

```bash
npm run build
npm run develop
```

### 3. Configure your Content Type

1. Open **Settings → Drag Drop Content Type → Configuration**.
2. Set the **Rank Field Name** (default: `rank`).
3. Add an **Integer** field with that exact name to any Collection Type you want to sort.
4. In the Collection Type's **Configure the view** settings, set:
   - **Default sort attribute**: your rank field (e.g. `rank`)
   - **Default sort order**: `ASC`

#### Optional settings

- **Title / Subtitle fields**: Choose which fields appear in the drag-and-drop list (falls back to the content type's `mainField`).
- **Trigger Webhooks**: Fire Strapi's `entry.update` webhook listener after batch rank updates.

## Usage Notes

- **Filtered views**: When Content Manager filters are applied, the sort modal loads only the filtered entries and reassigns ranks within their existing rank slots.
- **Large collections**: Use **Show more** to expand the window incrementally or **Show all** to load every entry in the current view into the scrollable list.

## Querying Ordered Content

### REST API

```bash
# Basic ordering
GET /api/{content-type}?sort=rank:asc

# With pagination
GET /api/{content-type}?sort=rank:asc&pagination[page]=1&pagination[pageSize]=25

# With relations
GET /api/{content-type}?sort=rank:asc&populate=*
```

### GraphQL (Strapi v5)

```graphql
query {
  articles(sort: ["rank:asc"]) {
    documentId
    title
    rank
  }
}
```

## Development

### Internal plugin routes

- `GET /drag-drop-content-types-strapi5/settings` — Read plugin configuration
- `POST /drag-drop-content-types-strapi5/sort-index` — Fetch ordered entries (supports `start`, `limit`, `locale`, and `filters`)
- `PUT /drag-drop-content-types-strapi5/batch-update` — Persist updated ranks

### Scripts

```bash
npm run build    # Build admin and server bundles + type definitions
npm run verify   # Verify package exports with @strapi/sdk-plugin
npm run watch    # Rebuild on file changes
```

## Support

- [Report an issue](https://github.com/yunusemrejs/drag-drop-content-types-strapi5/issues)
- [Sponsor](https://github.com/sponsors/yunusemrejs)

## License

MIT © [Yunus Emre Kara](LICENSE)
