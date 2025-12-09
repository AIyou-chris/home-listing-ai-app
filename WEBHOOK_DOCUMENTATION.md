# Export to HomeListingAI Webhook Integration

You can export leads from your external application directly into HomeListingAI using the incoming lead webhook.

## Webhook URL
**URL:** `http://localhost:3002/api/webhooks/incoming-lead`
*(Replace `http://localhost:3002` with your production domain if deployed)*

## Method
`POST`

## Headers
`Content-Type: application/json`

## Payload Format
The webhook accepts a JSON payload with the following fields (all optional except Name + Email/Phone):

```json
{
  "name": "John Doe",               // Required (or firstName + lastName)
  "email": "john@example.com",      // Recommended
  "phone": "+15551234567",
  "source": "MyApp Export",         // Defaults to 'External Webhook'
  "notes": "Interested in downtown listing",
  "propertyInterest": "123 Main St",
  "userId": "optional-user-uuid"    // If you want to assign to a specific agent
}
```

### Alternative Field Names
The webhook is flexible and also accepts:
- `firstName` / `first_name` + `lastName` / `last_name` -> combines to `name`
- `fullName` / `full_name` -> `name`
- `emailAddress` / `email_address` -> `email`
- `phoneNumber` / `phone_number` -> `phone`
- `message` / `description` -> `notes`
- `listingId` / `address` -> `propertyInterest`

## Example cURL
```bash
curl -X POST http://localhost:3002/api/webhooks/incoming-lead \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Alice",
    "lastName": "Smith",
    "email": "alice@example.com",
    "source": "LeadScraper App",
    "message": "Looking for a 3bd house"
  }'
```

## Response
**Success (200 OK):**
```json
{
  "success": true,
  "leadId": "generated-uuid"
}
```

**Error (400/500):**
```json
{
  "success": false,
  "error": "Error message details"
}
```
