# NFL Live Bet Tracker v2

Isolated from Pocket Chaise. Mobile-first live bet board with persistent ticket storage, duplicate protection, and a camera/photo intake UI.

## Screenshot intake
Both photo controls call `POST /api/intake` with `{mime,data}` (base64, JPEG/PNG/WebP, maximum 8 MB). The server calls OpenAI Responses with a strict schema and `store:false`. The response includes `draft`, detailed `legs`, per-field `confidence` and `evidence`, `uncertainFields`, `warnings`, `reviewRequired:true`, and `saved:false`.

Only readable fields with supporting evidence and confidence >= 0.9 enter the draft. Confidence is a model estimate, not a calibrated probability. Missing/cropped/uncertain values remain null. Every visible leg retains its slot; unreadable legs must be corrected. The UI requires review confirmation and an explicit Save; intake never writes to PostgreSQL. Failed image uploads can be retried without creating another bet.

Set `OPENAI_API_KEY` only on the server. `OPENAI_VISION_MODEL` optionally overrides the default `gpt-4.1-mini`. The dedicated production credential expires October 19, 2026; replace it in Railway before then. No credential belongs in Git or the browser bundle.

The existing app is public. Intake is limited per process to 40 requests per UTC day, two concurrent calls, and one start every three seconds. This bounds ordinary abuse but is not authentication or a durable billing cap: counters reset on restart. OpenAI requests have a 45-second timeout and 6,000 output-token limit. Configure provider spending controls separately if needed.

## Run
`npm start`

`DATABASE_URL` is required; `PORT` defaults to 3000. Existing PostgreSQL tables, screenshots, seed IDs, and Live/Settled/All views are preserved. Startup also creates a small `deleted_bets` table to prevent deleted seeded tickets from returning after restarts.

## Verify and rollback
`npm test` runs offline extraction and HTTP regression checks with an isolated in-memory database adapter. Production does not load the adapter. This plain Node/browser app has no compilation step; run `node --check` for changed JavaScript.

After deployment, check `/health`, read the existing bets, upload a real screenshot, review the fields and uncertainty warnings, and confirm that the bet count is unchanged until Save. Do not save duplicate test tickets in production. Roll back using Railway's previous successful deployment; no database rollback is required.

## Delete a ticket
Each ticket has a Delete ticket button in every view. The confirmation names the game and amounts. DELETE /api/bets/:id requires JSON `{confirm:true}`. A single PostgreSQL statement removes the selected ticket (its image cascades through the existing foreign key) and records the deleted ID so initial seed tickets stay deleted. This removes only tracker records, not sportsbook wagers.
