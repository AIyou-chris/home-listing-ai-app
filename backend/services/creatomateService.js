const fetch = require('node-fetch');

class CreatomateService {
    constructor() {
        this.apiKey = process.env.CREATOMATE_API_KEY;
        this.apiUrl = 'https://api.creatomate.com/v2/renders';
    }

    /**
     * Generates a video from a Creatomate template.
     * @param {string} templateId - The ID of the Creatomate template
     * @param {Object} modifications - The keys/values to override in the template (e.g. Photo-1.source)
     * @returns {Promise<Object>} Formatted API response containing video URL and status
     */
    async generateVideo(templateId, modifications = {}) {
        if (!this.apiKey) {
            console.error('❌ Creatomate API key is missing. Ensure CREATOMATE_API_KEY is in .env');
            throw new Error('Creatomate API key not configured.');
        }

        try {
            console.log(`🎬 Sending render request to Creatomate for template: ${templateId}`);

            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    template_id: templateId,
                    modifications: modifications
                })
            });

            if (!response.ok) {
                const errorData = await response.text();
                console.error(`❌ Creatomate API Error [${response.status}]:`, errorData);
                throw new Error(`Creatomate API request failed: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('✅ Creatomate Render Initiated:', data);

            // Returns an array of render objects. Grab the first one.
            const render = Array.isArray(data) ? data[0] : data;

            return {
                id: render.id,
                status: render.status, // "planned", "rendering", "succeeded", "failed"
                url: render.url, // The final mp4 link (might not be ready instantly depending on sync/async)
                template_id: render.template_id
            };

        } catch (error) {
            console.error('❌ Error generating Creatomate video:', error);
            throw error;
        }
    }
}

module.exports = new CreatomateService();
