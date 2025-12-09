export interface ScrapedData {
    title: string;
    content: string;
}

/**
 * Calls the backend to scrape the given URL.
 * @param url The website URL to scrape.
 * @returns Promise resolving to the scraped title and text content.
 */
export const scrapeWebsite = async (url: string): Promise<ScrapedData> => {
    try {
        const response = await fetch('/api/scrape', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ url })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to scrape website');
        }

        return {
            title: data.title,
            content: data.content
        };
    } catch (error) {
        console.error('Error in scrapeWebsite:', error);
        throw error;
    }
};
