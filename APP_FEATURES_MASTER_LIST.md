# HomeListingAI: Master Feature Inventory 📋

**Purpose:** This document lists every feature, functionality, and utility within the HomeListingAI application. Use this to train AI modls (like NotebookLM) on *exactly* what the software is capable of.

---

## 🤖 1. Core AI Communication Capabilities

### **AI Voice Agent (Vapi Integration)**
*   **Realistic Voice Synthesis:** Uses ultra-low latency voice AI (under 800ms) that sounds indistinguishable from a human.
*   **Context-Aware Calling:** The AI knows the Lead's name, the Property they inquired about, and the Agent's details before dialing.
*   **Smart Voicemail Drop:** If an answering machine is detected, the AI automatically leaves a polite, pre-scripted voicemail message.
*   **Live Transcriptions:** Real-time speech-to-text transcription of every call.
*   **Call Recording:** Every call is recorded and accessible via a URL for review.
*   **Conversation Summary:** AI automatically generates a text summary of the call (e.g., "Lead is interested but price is too high") and saves it to the CRM.

### **AI SMS & Texting (Telnyx Integration)**
*   **24/7 Auto-Response:** AI instantly replies to incoming text messages at any time of day.
*   **Contextual Conversation History:** The AI "remembers" previous texts to maintain a coherent conversation flow.
*   **Missed Call "Safety Net":** If a lead fails to answer a call, the system automatically sends a follow-up text ("Is now a good time?").
*   **Multi-Channel Awareness:** The AI knows if it spoke to the lead via Voice or Text and references that history.

### **Web Chat Assistant**
*   **Instant Website Capture:** Embeddable chat widget for real estate websites.
*   **Lead Identification:** Captures visitor Name/Phone/Email during the chat flow.
*   **Property Inquiries:** Can answer questions specific to the property listing page it is embedded on.

---

## 🛡️ 2. Safety, Compliance & Cost Control ("The Shield")

### **Legal & TCPA Compliance**
*   **"Red Light" Auto-Stop:** Automatically detects keywords like `STOP`, `QUIT`, `UNSUBSCRIBE`. Instantly marks the lead as "Unsubscribed" in the database and blocks all future AI outbound attempts.
*   **"Sleep Mode" Protection:** Hard-coded prohibition on sending texts or making calls during sensitive hours (e.g., 9 PM - 8 AM) to prevent harassment complaints.

### **Cost Efficiency & Validation**
*   **Pre-Dial Number Verification:** Before dialing or texting, the system pings the carrier (Telnyx Lookup) to verify the number is valid and active.
*   **Anti-Spam Rate Limiting:** "Frequency Guard" prevents the system from accidentally spamming a lead with multiple messages in a short burst (e.g., max 1 message per 10 seconds).

---

## 💻 3. Agent Dashboard (The "AI Interaction Hub")

### **Command Center UI**
*   **Unified Inbox:** A single feed showing all Voice Calls, SMS threads, and Web Chats in chronological order.
*   **Real-Time Status Indicators:**
    *   **Sent (✓):** Message left the server.
    *   **Delivered (✓✓):** Carrier confirmed delivery to the handshake.
    *   **Failed (⚠️):** Visual alert if a number is disconnected or blocked.
*   **Manual Intervention Mode:** Agents can take over the AI conversation at any time by typing into the "Reply" box.
*   **Smart Channel Switching:** The dashboard automatically selects SMS (if phone available) or Chat (if web-only) when the agent replies manually.
*   **Search & Filter:** Instantly filter interactions by "Inquiry," "Call," or "Active Chat," or search by Lead Name.

### **Detailed Interaction View**
*   **Full Thread History:** Scrollable view of every message exchanged.
*   **"Intent" Tagging:** AI analyzes the conversation and tags it with the lead's intent (e.g., "Buying," "Selling," "Just Looking").
*   **Message Count Metrics:** Quickly see how deep a conversation has gone.

---

## 🗂️ 4. CRM & Lead Management

### **Lead Organization**
*   **Automatic Profile Creation:** Creates a new Lead profile instantly upon the first inbound contact (Chat/SMS).
*   **Data Enrichment:** Stores Lead Name, Phone, Email, Property of Interest, and "Last Contact" timestamp.
*   **CSV Export:** One-click export of all conversations and lead data for external reporting.
*   **"Create Lead" Shortcut:** Agents can manually promote a casual inquiry to a full Pipeline Lead with one click from the Dashboard.

### **Pipeline status**
*   **Status Tracking:** Tracks leads as "New," "Active," "Unsubscribed," etc.
*   **AI Hand-off:** AI can determine when a lead is "Hot" and needs human attention (represented by conversation summary).

---

## 🚀 5. Growth & Marketing Tools

### **AI Business Card**
*   **QR Code Generator:** Generates a unique QR code for the agent.
*   **Digital Profile:** Scannable card that leads to the Agent's AI-enabled profile or listing.

### **Listing Marketing**
*   **"Listing Sidekick" Widget:** Specific AI widget tailored for a single property listing (e.g., "123 Main St Chatbot").
*   **Public Landing Pages:** Generates public-facing URLs for property inquiries.

---

## ⚙️ 6. Technical Infrastructure & Integrations

### **Backend Power**
*   **Supabase Database:** Real-time, scalable SQL database for storing millions of interactions.
*   **Server-Side Logic:** Robust Node.js backend handling all logic, security, and API orchestration.

### **Third-Party Integrations**
*   **Google / Gmail:** OAuth integration allowing agents to connect their Google Workspace (for future email synching).
*   **Stripe Payments:** Built-in subscription handling for agents to pay for the software.
*   **Clerk Authentication:** Secure, enterprise-grade login and identity management for Agents.

---
