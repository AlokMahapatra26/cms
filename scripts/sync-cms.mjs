#!/usr/bin/env node

/**
 * EdgeCMS Manual CLI Sync Script
 * 
 * Manually triggers sync of cms.config.ts into Cloudflare D1.
 */

const API_URL = process.env.CMS_API_URL || 'http://localhost:8787';

async function sync() {
  console.log(`\n⏳ Pinging EdgeCMS API at ${API_URL}...`);
  try {
    const res = await fetch(`${API_URL}/api/admin/collections/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-edgecms-cli': 'true'
      }
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}`);
    }

    const data = await res.json();
    console.log(`✅ [EdgeCMS] Successfully synced ${data.count || 0} collection(s) from cms.config.ts to Cloudflare D1!\n`);
    if (Array.isArray(data.collections) && data.collections.length > 0) {
      console.log('   Synced Collections:');
      data.collections.forEach((col) => {
        console.log(`   • ${col.name} (/${col.slug}) — ${col.fieldsCount} field(s)`);
      });
      console.log('');
    }
  } catch (err) {
    console.error(`\n❌ Failed to sync cms.config.ts:`, err.message);
    console.log(`💡 Make sure EdgeCMS API is running: "pnpm dev" or "pnpm dev:api"\n`);
    process.exit(1);
  }
}

sync();
