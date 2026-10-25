# Marketing engine screens

The front half of the marketing engine (the back half is `backend/marketing-engine/`, see its README). Copy this folder to another app's `src/` along with the backend folder.

| Path | What it is |
|---|---|
| `screens/` | Today, Autopilot (with the Approve button and the "Post by itself" switch), Marketing Studio, Connected accounts, Facebook groups, results. Each has its own test. |
| `services/` | The calls the Studio screens make to the backend. |
| `host/` | **The only place the screens touch the rest of the app.** One tiny file per thing borrowed: `api.ts` (API address), `authedFetch.ts` (fetch with the login token), `supabase.ts`, `authService.ts`, `BlogEditor.ts` (the host's blog screen). Point each at the new app's version. |
| `index.ts` | The screens the host app places in its admin. |
| `boundary.test.ts` | Fails if anything outside `host/` imports from the rest of the app. |

Place `TodayView` as the admin's home page and `AutopilotPanel`, `AdminMarketingStudio`, `ConnectedAccountsPanel` under a Marketing item. The Today numbers come from `GET /api/admin/today`.
