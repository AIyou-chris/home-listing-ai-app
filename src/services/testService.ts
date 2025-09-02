// Replaced Firebase callable with direct REST call to emulator Functions
export const callTestFunction = async (data: any): Promise<string> => {
  try {
    const url =
      import.meta.env?.VITE_FUNCTIONS_URL ||
      'http://127.0.0.1:5001/home-listing-ai/us-central1/testFunction'
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const result = await res.json()
    if (result && typeof result.text === 'string') return result.text
    throw new Error('Invalid response format from test function')
  } catch (error) {
    console.error('Error calling test function:', error)
    throw error
  }
}