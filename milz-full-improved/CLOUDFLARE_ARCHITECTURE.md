# Milz app architecture (Trend / Recommendation)

## Trend
- Major areas: short cache (15 min), regional-live style momentum
- Smaller areas: local momentum fallback, no empty state
- API: `/api/ai/query` with `mode=trend`

## Recommendation
- Uses existing places first
- Falls back to low-cost local templates
- API: `/api/ai/query` with `mode=recommend`

## Geocoding
- API: `/api/ai/geocode`
- Uses Nominatim with long cache

## Uploads
- API: `/api/storage/upload`
- Requires Cloudflare Pages Function + R2 binding `R2_BUCKET`

## Required Cloudflare env / bindings
- `R2_PUBLIC_DOMAIN`
- `R2_BUCKET` (binding)
