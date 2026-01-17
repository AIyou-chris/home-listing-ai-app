export const scrapeWebsite = async (url: string): Promise<{ title?: string; content?: string }> => {
    console.warn('Scraper service not implemented', url);
    return { title: url, content: '' };
};
