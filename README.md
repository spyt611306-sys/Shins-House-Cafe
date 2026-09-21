# Shin's House Cafe

Shin's House 공식 홈페이지 저장소입니다.

## Deployment
- Production branch: `main`
- Netlify site: `shinshouse`
- Static frontend + Netlify Functions `/api/*`
- Future persistence: Supabase (server-side only)

## Current commercialization status
The original v4.3 package was a visual/functional preview. Its browser-side Mock API must not be treated as a real commerce backend.

Commercialization work is split into six tracked phases:
1. Production safety & deployment foundation — Issue #4
2. Real orders/inventory/Supabase — Issue #5
3. Admin authentication & operations — Issue #6
4. Legal/privacy/refund flow — Issue #7
5. UX/mobile/SEO/accessibility/performance — Issue #8
6. QA/CI/monitoring/launch checklist — Issue #9

See `docs/COMMERCIALIZATION_AUDIT.md` for blockers and acceptance criteria.

## Environment
Copy `.env.example` only as a reference. Configure real values in Netlify Environment Variables.

Never commit:
- Supabase service-role keys
- Database passwords
- administrator credentials/tokens
- real secret API keys

`COMMERCE_ENABLED` must stay `false` until the server-side order flow, admin auth, business disclosures and policies have passed production checks.

## Local development
Use Netlify Dev so `/api/*` resolves through the same serverless runtime used in production.

```bash
npx netlify dev
```
