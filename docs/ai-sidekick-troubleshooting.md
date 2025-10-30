# AI Sidekick Troubleshooting Checklist

Use this when the "Enhanced AI Sidekicks" page shows `Failed to load AI sidekicks`.

1. **Stop every running backend**
   ```bash
   npm run stop-server
   pkill -f "node server.cjs"  # only if old processes keep coming back
   ```

2. **Start fresh**
   ```bash
   npm run start-server
   ```
   Check `logs/backend.out` for `[Server] Registering AI Sidekick routes` – that means the route exists.

3. **Quick API test**
   ```bash
   curl http://localhost:3002/api/sidekicks
   ```
   - `{"sidekicks":[],"voices":[...]}` → backend is healthy
   - `Cannot GET /api/sidekicks` → wrong server/version still running
   - `{"error":"Failed to load AI sidekicks"}` → database objects missing (see next step)

4. **Fix database schema**
   - In Supabase SQL editor run the `supabase-setup.sql` script.
   - Make sure tables/columns exist:
     - `ai_sidekick_profiles` with `display_name`, `summary`, `voice_label`…
     - `ai_sidekick_training_feedback` table
   - Re-run the `curl` test – you should now get actual sidekick rows.

5. **Reload the web page**
   - Hard refresh `http://localhost:5180/#/dashboard-blueprint`
   - The sidekicks list should appear.

6. **If something still breaks**
   - Check `logs/backend.out` for the latest stack trace.
   - Copy errors into Slack/GitHub issue so we can update this playbook.


