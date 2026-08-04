# Local demo runner -- starts the already-built production frontend bound to
# all interfaces so it's reachable via the router-forwarded public IP.
# Rebuild first with `npm run build` if .env.local's NEXT_PUBLIC_API_URL changes,
# since Next.js bakes that value in at build time.
npm run start -- -H 0.0.0.0
