const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002';

export const scrapeWebsite = async (url: string): Promise<{ title?: string; content?: string }> => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/scrape`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        });

        if (!response.ok) {
            throw new Error(`Scraping failed: ${response.statusText}`);
        }

        const data = await response.json();
        return {
            title: data.title || url,
            content: data.content || ''
        };
    } catch (error) {
        console.error('Scraper service error:', error);
        throw error;
    }
};
