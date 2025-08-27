export const getApiBase = (): string => {
    const local = 'http://localhost:5001/home-listing-ai/us-central1/api';
    const deployed = 'https://us-central1-home-listing-ai.cloudfunctions.net/api';
    // Use local if running on localhost
    return location.hostname === 'localhost' || location.hostname === '127.0.0.1'
        ? local
        : deployed;
};





