require('dotenv').config({ path: '.env' });
const fetch = require('node-fetch');

(async () => {
    try {
        const apiKey = process.env.CREATOMATE_API_KEY;

        const luxurySource = {
            "name": "Luxury Reel",
            "width": 1080,
            "height": 1920,
            "duration": 15,
            "elements": [
                { "type": "shape", "fill_color": "#000000" },
                { "name": "Photo-1", "type": "image", "source": "https://creatomate-static.s3.amazonaws.com/demo/interiors-1.jpg", "time": 0, "duration": 3.5, "animations": [{ "type": "scale", "start_scale": "100%", "end_scale": "105%", "easing": "linear" }, { "time": "out", "type": "fade", "duration": 0.5, "transition": true }] },
                { "name": "Photo-2", "type": "image", "source": "https://creatomate-static.s3.amazonaws.com/demo/interiors-2.jpg", "time": 3, "duration": 2, "animations": [{ "type": "scale", "start_scale": "100%", "end_scale": "105%", "easing": "linear" }, { "time": "in", "type": "fade", "duration": 0.5, "transition": true }, { "time": "out", "type": "fade", "duration": 0.5, "transition": true }] },
                { "name": "Photo-3", "type": "image", "source": "https://creatomate-static.s3.amazonaws.com/demo/interiors-3.jpg", "time": 4.5, "duration": 2, "animations": [{ "type": "scale", "start_scale": "100%", "end_scale": "105%", "easing": "linear" }, { "time": "in", "type": "fade", "duration": 0.5, "transition": true }, { "time": "out", "type": "fade", "duration": 0.5, "transition": true }] },
                { "name": "Photo-4", "type": "image", "source": "https://creatomate-static.s3.amazonaws.com/demo/architecture-2.jpg", "time": 6, "duration": 2, "animations": [{ "type": "scale", "start_scale": "100%", "end_scale": "105%", "easing": "linear" }, { "time": "in", "type": "fade", "duration": 0.5, "transition": true }, { "time": "out", "type": "fade", "duration": 0.5, "transition": true }] },
                { "name": "Photo-5", "type": "image", "source": "https://creatomate-static.s3.amazonaws.com/demo/architecture-3.jpg", "time": 7.5, "duration": 2, "animations": [{ "type": "scale", "start_scale": "100%", "end_scale": "105%", "easing": "linear" }, { "time": "in", "type": "fade", "duration": 0.5, "transition": true }, { "time": "out", "type": "fade", "duration": 0.5, "transition": true }] },
                { "name": "Photo-6", "type": "image", "source": "https://creatomate-static.s3.amazonaws.com/demo/architecture-1.jpg", "time": 9, "duration": 4.5, "animations": [{ "type": "scale", "start_scale": "100%", "end_scale": "105%", "easing": "linear" }, { "time": "in", "type": "fade", "duration": 0.5, "transition": true }, { "time": "out", "type": "fade", "duration": 0.5, "transition": true }] },

                { "name": "Hero Overlay", "type": "shape", "fill_color": "rgba(0,0,0,0.6)", "time": 0, "duration": 3.5, "animations": [{ "time": "out", "type": "fade", "duration": 0.5, "transition": true }] },
                { "name": "Badge", "type": "text", "text": "Just Listed", "time": 0, "duration": 3.5, "y": "25%", "x": "50%", "font_family": "Inter", "font_weight": "700", "fill_color": "#d4af37", "font_size": "45 vmin", "animations": [{ "time": "in", "type": "fade", "duration": 0.5 }, { "time": "out", "type": "fade", "duration": 0.5 }] },
                { "name": "Price", "type": "text", "text": "$875,000", "time": 0, "duration": 3.5, "y": "50%", "font_family": "Playfair Display", "font_weight": "700", "fill_color": "#ffffff", "font_size": "150 vmin", "animations": [{ "time": "in", "type": "fade", "duration": 0.5 }, { "time": "out", "type": "fade", "duration": 0.5 }] },
                { "name": "Address", "type": "text", "text": "156 Maple Grove Ln, Austin, TX", "time": 0, "duration": 3.5, "y": "65%", "font_family": "Inter", "font_weight": "400", "fill_color": "#ffffff", "font_size": "50 vmin", "animations": [{ "time": "in", "type": "fade", "duration": 0.5 }, { "time": "out", "type": "fade", "duration": 0.5 }] },
                { "name": "Montage Overlay", "type": "shape", "fill_color": "rgba(0,0,0,0.1)", "time": 3, "duration": 6.5, "animations": [{ "time": "in", "type": "fade", "duration": 0.5, "transition": true }, { "time": "out", "type": "fade", "duration": 0.5, "transition": true }] },
                { "name": "Details Overlay", "type": "shape", "fill_color": "rgba(0,0,0,0.6)", "time": 9, "duration": 4.5, "animations": [{ "time": "in", "type": "fade", "duration": 0.5, "transition": true }, { "time": "out", "type": "fade", "duration": 0.5, "transition": true }] },
                { "name": "Details", "type": "text", "text": "4 Bed • 3 Bath • 2,650 Sq Ft", "time": 9, "duration": 4.5, "y": "50%", "font_family": "Playfair Display", "font_weight": "500", "fill_color": "#ffffff", "font_size": "65 vmin", "letter_spacing": "2%", "animations": [{ "time": "in", "type": "fade", "duration": 0.5 }, { "time": "out", "type": "fade", "duration": 0.5 }] },
                { "name": "Solid Outro Overlay", "type": "shape", "fill_color": "#111827", "time": 13, "duration": 2, "animations": [{ "time": "in", "type": "fade", "duration": 0.5, "transition": true }] },
                { "name": "CTA", "type": "text", "text": "Get the 1-page report", "time": 13, "duration": 2, "y": "45%", "font_family": "Inter", "font_weight": "700", "fill_color": "#d4af37", "font_size": "80 vmin", "animations": [{ "time": "in", "type": "fade", "duration": 0.5 }] },
                { "name": "Brand", "type": "text", "text": "HomeListingAI", "time": 13, "duration": 2, "y": "60%", "font_family": "Inter", "font_weight": "400", "fill_color": "#9ca3af", "font_size": "45 vmin", "animations": [{ "time": "in", "type": "fade", "duration": 0.5 }] }
            ]
        };

        const response = await fetch('https://api.creatomate.com/v2/renders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                source: luxurySource,
                modifications: {}
            })
        });

        const data = await response.json();
        console.log("Direct Render Result:", data);

    } catch (e) {
        console.error("Test failed:", e);
    }
})();
