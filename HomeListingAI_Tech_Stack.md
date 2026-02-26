# HomeListingAI - Technology Stack

### ⚡ Front-End
* **Framework:** React 18 (built with Vite)
* **Language:** TypeScript
* **Styling:** Tailwind CSS (with PostCSS & Autoprefixer)
* **Routing:** React Router v6
* **State Management:** Zustand
* **UI Extras:** `lucide-react` (icons), `@dnd-kit` (drag-and-drop), `react-quill` / `react-simple-wysiwyg` (text editors)

### ⚙️ Back-End
* **Server / Runtime:** Node.js with Express.js
* **Database & Authentication:** Supabase (built on PostgreSQL)
* **WebSockets:** `ws` package for real-time bidirectional communication.

### 🧠 AI & LLM Infrastructure
* **Primary AI Engine:** OpenAI (`openai` SDK for GPT-4 etc.)
* **Google AI:** Google Gen AI SDK (`@google/genai`) 
* **Voice AI:** Custom integrations utilizing Vapi and Telnyx.

### 📞 Telecom & Communications
* **Voice & SMS:** Telnyx (primary telecom provider for phone numbers and SMS validation)
* **Email:** Mailgun (used for tracking opens/clicks and sending outbound drip campaigns)

### 💳 Payments & Billing
* **Payment Processor:** Stripe (specifically using the newly unveiled `2025-08-27.preview` V2 API and thin-events architecture for heavy backend billing automation)

### 🕷️ Automation & Utilities
* **Scraping:** Puppeteer and Cheerio 
* **Analytics:** Google Analytics Data API (`googleapis` for GA4 tracking)
* **Background Jobs:** `node-cron`
* **Hosting / Deployment:** Built to deploy on Vercel for the front end, with a custom Node server for the back end.
