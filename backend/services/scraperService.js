const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Scrapes a website and returns its title and text content.
 * @param {string} url - The URL to scrape.
 * @returns {Promise<{title: string, content: string}>} - The title and text content.
 */
const scrapeUrl = async (url) => {
    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            timeout: 15000 // 15 seconds timeout
        });

        const html = response.data;
        const $ = cheerio.load(html);

        // Get title
        const title = $('title').text().trim() || url;

        // Remove scripts, styles, and other non-content elements
        $('script').remove();
        $('style').remove();
        $('nav').remove();
        $('footer').remove();
        $('header').remove();
        $('iframe').remove();
        $('noscript').remove();

        // extract text from body
        // We can be smarter here by looking for p, h1, h2, h3, li, etc.
        // simpler approach: get all text
        let content = $('body').text();

        // Clean up whitespace
        content = content.replace(/\s+/g, ' ').trim();

        return {
            title,
            content
        };
    } catch (error) {
        console.error('Scraping error:', error.message);
        throw new Error(`Failed to scrape URL: ${error.message}`);
    }
};

module.exports = {
    scrapeUrl
};
