# create-cfedge-cms

Interactive CLI to scaffold a modern, high-speed **CFEdge-CMS** project powered by **Cloudflare Workers, Cloudflare D1 (SQL), and Cloudflare R2**.

## Quick Start

You can create a CFEdge-CMS project with a single command using your favorite package manager:

```bash
# npm
npm create cfedge-cms my-cms

# npx
npx create-cfedge-cms my-cms

# pnpm
pnpm create cfedge-cms my-cms

# bun
bun create cfedge-cms my-cms
```

## What's Included

- **Edge API Worker**: Cloudflare Workers + D1 database + R2 object storage.
- **Admin Dashboard**: Sleek, Vercel Geist OLED black dark-mode CMS control panel built with SvelteKit.
- **AI Agent Prompt Studio**: 1-click prompt generator for Cursor, Claude Code, and Windsurf to implement frontend components automatically.
- **Zero Config**: Local D1 SQLite simulation out of the box with zero external dependencies.

## Development

After scaffolding your project:

```bash
cd my-cms
pnpm dev
```

- **Admin UI**: http://localhost:5173
- **Edge API**: http://localhost:8787

## License

MIT © [Alok Mahapatra](https://github.com/AlokMahapatra26)
