# EdgeCMS 4-Layer API Security & Rate Limiting Architecture

EdgeCMS enforces a defence-in-depth security model across 4 distinct layers to protect headless content delivery, prevent unauthorized scraping, block DDoS attacks, and hide secrets from client browsers.

---

## Architecture Overview

```
                      ┌────────────────────────────────────────┐
                      │          Incoming HTTP Request         │
                      └───────────────────┬────────────────────┘
                                          │
                                          ▼
                      ┌────────────────────────────────────────┐
                      │ Layer 4: Cloudflare WAF + Edge Limiter │
                      │  • 60 req / 1 min per IP               │
                      │  • Exceeded -> 429 Too Many Requests   │
                      └───────────────────┬────────────────────┘
                                          │
                                          ▼
                      ┌────────────────────────────────────────┐
                      │ Layer 3: CORS Origin Whitelist         │
                      │  • Browser Origin Header Check         │
                      │  • Unauthorized Origin -> 403 Forbidden│
                      │  • Server / BFF requests bypass CORS   │
                      └───────────────────┬────────────────────┘
                                          │
                                          ▼
                      ┌────────────────────────────────────────┐
                      │ Layer 1: Read-Only API Key (X-API-Key) │
                      │  • Mandatory for all content endpoints │
                      │  • Validated against D1 workspace key  │
                      │  • Missing / Invalid -> 401            │
                      └───────────────────┬────────────────────┘
                                          │
                                          ▼
                      ┌────────────────────────────────────────┐
                      │ Layer 2: Next.js BFF Concealment       │
                      │  • Server Component / Route Handler    │
                      │  • CMS_API_SECRET_KEY hidden on server │
                      │  • Browser F12 DevTools sees only HTML │
                      └────────────────────────────────────────┘
```

---

## Layer 1: Read-Only API Key (`X-API-Key` Header) ⭐ (सबसे मुख्य)

Just like Stripe, OpenAI, or Strapi, all public content delivery endpoints require an API Read Key.

### Protected Endpoints
- `GET /api/content/:collectionSlug`
- `GET /api/content/:collectionSlug/:id`
- `GET /api/v1/:workspaceSlug/content/:collectionSlug`
- `GET /api/v1/:workspaceSlug/content/:collectionSlug/:id`
- `GET /api/posts`
- `GET /api/posts/:slug`

### Passing the API Key
Clients can pass the key using any of the following methods:
1. **Header (Recommended)**: `X-API-Key: cf_live_...`
2. **Bearer Token**: `Authorization: Bearer cf_live_...`
3. **Query Parameter**: `?apiKey=cf_live_...`

### Key Resolution & Multi-Tenancy
- Each workspace in Cloudflare D1 has its own unique `api_key` (e.g. `'cf_live_default_key'`).
- The API automatically associates the request with the workspace matching the API key.
- Active admin session tokens (`Bearer session_...`) are also accepted to support live editing previews in the Admin Studio.

### Error Responses
- **Missing Key (HTTP 401)**:
  ```json
  {
    "error": "Unauthorized: Read API key required",
    "message": "Access to Content Delivery API requires a valid API key. Pass it via 'X-API-Key' header, 'Authorization: Bearer <key>', or '?apiKey=<key>'.",
    "layer": "Layer 1: Read-Only API Key"
  }
  ```
- **Invalid Key (HTTP 401)**:
  ```json
  {
    "error": "Unauthorized: Invalid API key",
    "message": "The provided API key is invalid or has been revoked.",
    "layer": "Layer 1: Read-Only API Key"
  }
  ```

---

## Layer 2: Next.js Server-Side Concealment (BFF Pattern)

In Next.js (App Router) or Astro, requests are executed on the server rather than in client-side JavaScript.

### How Concealment Works
1. Store credentials in `.env.local`:
   ```env
   CMS_API_URL=http://localhost:8787
   CMS_API_SECRET_KEY=cf_live_default_key
   ```
2. **Crucial Rule**: Do **NOT** prefix `CMS_API_SECRET_KEY` with `NEXT_PUBLIC_` or `PUBLIC_`.
3. Because there is no `NEXT_PUBLIC_` prefix, Next.js will **never** include this secret in client JavaScript bundles.
4. When a visitor opens DevTools (F12 -> Network Tab), they will **never see**:
   - The Cloudflare Worker API URL
   - The Secret API Key (`cf_live_...`)
   - Internal CMS queries
   Visitors only see clean server-rendered HTML or your Next.js application's internal routes.

### Next.js Server Component Example (`app/blog/page.tsx`)
```tsx
import { createEdgeCMSClient } from '@cms/shared';

// Initialize client with server-side environment variables
const cms = createEdgeCMSClient({
  apiUrl: process.env.CMS_API_URL,
  apiKey: process.env.CMS_API_SECRET_KEY,
  workspaceSlug: 'default'
});

export default async function BlogPage() {
  // Executed 100% on the Next.js server
  const articles = await cms.getContent('articles', {
    revalidate: 60 // Next.js ISR: cached on edge for 60 seconds
  });

  return (
    <main className="max-w-4xl mx-auto py-12">
      <h1 className="text-3xl font-bold mb-6">Latest Articles</h1>
      <div className="grid gap-6">
        {articles.map((item) => (
          <article key={item.id} className="border p-4 rounded-lg">
            <h2 className="text-xl font-semibold">{item.data.title}</h2>
            <p className="text-gray-600">{item.data.excerpt}</p>
          </article>
        ))}
      </div>
    </main>
  );
}
```

### Next.js Route Handler BFF Proxy (`app/api/content/[slug]/route.ts`)
If a client-side component (e.g. search bar or infinite scroll) needs to fetch items dynamically:
```tsx
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const { searchParams } = new URL(req.url);
  const page = searchParams.get('page') || '1';
  const search = searchParams.get('search') || '';

  const cmsUrl = `${process.env.CMS_API_URL}/api/content/${params.slug}?page=${page}&search=${search}`;

  const res = await fetch(cmsUrl, {
    headers: {
      'Accept': 'application/json',
      'X-API-Key': process.env.CMS_API_SECRET_KEY!
    },
    next: { revalidate: 30 }
  });

  const data = await res.json();
  return NextResponse.json(data);
}
```

---

## Layer 3: CORS Restriction (Origin Whitelist)

By default, an open API (`Access-Control-Allow-Origin: *`) allows any website to steal data or embed API responses directly in visitors' browsers.

EdgeCMS restricts CORS exclusively to approved origins.

### Configuration (`wrangler.toml` or Cloudflare Dashboard)
```toml
[vars]
ALLOWED_ORIGINS = "https://yourbrand.com,https://admin.yourbrand.com,http://localhost:5173,http://localhost:3000,http://localhost:4321"
```

### Behavior
- **Server / BFF Calls**: Server-to-server calls (Next.js Server Components, Astro SSR, curl) have no `Origin` header and bypass CORS entirely.
- **Allowed Origins**: Cloudflare Worker responds with `Access-Control-Allow-Origin: <origin>` and `Access-Control-Allow-Credentials: true`.
- **Unauthorized Browser Origins**: Denied with `403 Forbidden` and no `Access-Control-Allow-Origin` header:
  ```json
  {
    "error": "CORS Origin Denied",
    "message": "The origin 'https://unauthorized-domain.com' is not authorized by CORS policy.",
    "layer": "Layer 3: CORS Restriction (Origin Whitelist)"
  }
  ```

---

## Layer 4: Cloudflare Native Rate Limiting (Anti-Scraping)

Layer 4 protects your D1 database and R2 storage against scraping bots, content scrapers, and DDoS attacks.

### 1. Cloudflare Dashboard 1-Click WAF Setup (Network Level)
1. Log in to the [Cloudflare Dashboard](https://dash.cloudflare.com).
2. Select your Domain / Zone.
3. In the sidebar, navigate to **Security** → **WAF** → **Rate limiting rules**.
4. Click **Create rule**.
5. Configure the rule:
   - **Rule Name**: `EdgeCMS Anti-Scraping Shield`
   - **If incoming requests match**:
     - Field: `URI Path`
     - Operator: `starts with`
     - Value: `/api/`
     - *(Expression: `starts_with(http.request.uri.path, "/api/")`)*
   - **When rate exceeds**:
     - Requests: `60`
     - Period: `1 minute` (60 seconds)
     - Counting characteristic: `IP address`
   - **Then take action**:
     - Action: `Block` (or `Managed Challenge`)
     - Duration: `10 minutes` (600 seconds)
     - Custom response code: `429`
     - Response type: `application/json`
     - Response body:
       ```json
       {"error":"Too Many Requests","message":"Anti-scraping shield triggered. IP temporarily blocked."}
       ```
6. Click **Deploy**.

### 2. Edge Worker Middleware (Application Level)
In addition to Cloudflare WAF, EdgeCMS includes built-in sliding window rate limiting right inside the Worker (`apps/api/src/index.ts`).
- Runs in local development (`wrangler dev`) and production alike.
- Tracks requests per IP (`cf-connecting-ip` / `x-real-ip`).
- Returns RFC-compliant rate limit headers on **all** responses:
  - `X-RateLimit-Limit: 60`
  - `X-RateLimit-Remaining: 58`
  - `X-RateLimit-Reset: 1731481200`
- If an IP exceeds 60 requests in 60 seconds:
  - Status: `HTTP 429 Too Many Requests`
  - Header: `Retry-After: 60`
  - Body:
    ```json
    {
      "error": "Too Many Requests",
      "message": "Anti-scraping shield: Rate limit exceeded (60 requests per 60s). Please slow down or try again later.",
      "limit": 60,
      "windowSeconds": 60,
      "retryAfter": 60,
      "layer": "Layer 4: Rate Limiting (Anti-Scraping)"
    }
    ```

---

## Testing & Verification Matrix

| Scenario | Request | Expected Status | Result |
| :--- | :--- | :--- | :--- |
| **No API Key** | `GET /api/content/events` | `401 Unauthorized` | ❌ Blocked by Layer 1 |
| **Invalid Key** | `GET /api/content/events` with `X-API-Key: invalid` | `401 Unauthorized` | ❌ Blocked by Layer 1 |
| **Valid Key** | `GET /api/content/events` with `X-API-Key: cf_live_...` | `200 OK` | ✅ Authorized |
| **Unauthorized Origin** | Browser `fetch` with `Origin: https://evil.com` | `403 Forbidden` | ❌ Blocked by Layer 3 |
| **Next.js Server Component** | Server-side `fetch` with `process.env.CMS_API_SECRET_KEY` | `200 OK` | ✅ Concealed (Layer 2) |
| **> 60 Requests in 1 Min** | Automated bot loop | `429 Too Many Requests` | ❌ Throttled by Layer 4 |
