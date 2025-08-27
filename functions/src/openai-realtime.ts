import * as functions from 'firebase-functions'

// Create an ephemeral OpenAI Realtime session token
export const createRealtimeSession = functions.https.onCall(async (data: any, context: any) => {

	const model = (data && typeof data.model === 'string' && data.model.trim()) || 'gpt-4o-realtime-preview-2024-12-17'

	const apiKey = process.env.OPENAI_API_KEY
	if (!apiKey) {
		throw new functions.https.HttpsError('failed-precondition', 'AI service is not properly configured')
	}

	try {
		const resp = await fetch('https://api.openai.com/v1/realtime/sessions', {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${apiKey}`,
				'Content-Type': 'application/json',
				'OpenAI-Beta': 'realtime=v1'
			},
			body: JSON.stringify({
				model,
				voice: 'alloy',
				modalities: ['text', 'audio'],
				turn_detection: { type: 'server_vad' },
				// 5-minute expiry is default for ephemeral tokens
			})
		})

		if (!resp.ok) {
			const text = await resp.text()
			functions.logger.error('Realtime session create failed', { status: resp.status, text })
			throw new functions.https.HttpsError('internal', 'Failed to create realtime session')
		}

		const session = await resp.json() as { client_secret?: { value?: string } }
		const token = session?.client_secret?.value
		if (!token) {
			throw new functions.https.HttpsError('internal', 'Invalid realtime session response')
		}

		return { token, model }
	} catch (err: any) {
		functions.logger.error('Realtime session error', err)
		throw new functions.https.HttpsError('internal', 'Unable to create realtime session')
	}
})


