# Integration Guide: Cloudflare Images CDN for DeckVerse OS

This module provides optional Cloudflare Images CDN integration for DeckVerse OS.

## Overview Flow

```
Fandom (pageimages)
    → URL original da wiki
    → Worker CF (upload por URL, token seguro serverless)
    → https://imagedelivery.net/{account_hash}/{id}/public
    → card.img_oficial no localStorage / banco
```

## Environment Setup (Frontend)

Add to `.env` or project environment settings:

```env
VITE_CF_ACCOUNT_HASH=seu_hash_publico
VITE_CF_IMAGE_VARIANT=public
VITE_CF_IMAGES_PROXY=https://deckverse-cf-images.seu_subdominio.workers.dev
```

If `VITE_CF_IMAGES_PROXY` is empty or omitted, `cloudflareImages.resolveCdnImage` performs automatic passthrough to the direct Fandom URL. The application operates continuously without breaking.

## Worker Deploy Instructions

```bash
cd services/cdn
cp wrangler.toml.example wrangler.toml
# Fill in CF_ACCOUNT_HASH in wrangler.toml

npx wrangler secret put CF_ACCOUNT_ID
npx wrangler secret put CF_API_TOKEN   # Needs Images Edit permission
npx wrangler deploy
```

## Client Integration Example

```js
import { fandomClient } from "@/services/fandom/fandomClient";
import { cloudflareImages } from "@/services/cdn/cloudflareImages";

const fandomUrl = await fandomClient.resolveCharacterImage(name, collectionCode);
const cdnUrl = fandomUrl
  ? await cloudflareImages.resolveCdnImage(fandomUrl, { name, collection_id: collectionCode })
  : "";

card.img_oficial = cdnUrl || fandomUrl || "";
card.image_url = card.img_oficial;
```

A local cache map (`dv_cf_image_map_v1` in `localStorage`) prevents duplicate uploads for already cached image URLs.
