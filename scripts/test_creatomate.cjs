require('dotenv').config({ path: '.env' }); // Load the key you just sent
const creatomateService = require('../backend/services/creatomateService.js');

(async () => {
    try {
        console.log("Starting test render with your provided template...");

        const templateId = "cf51c046-8852-43db-a7c3-aa004c4978c1";
        const modifications = {
            "Photo-1.source": "https://creatomate.com/files/assets/353ba980-9f13-4613-a8c5-f3aca0c41324",
            "Photo-2.source": "https://creatomate.com/files/assets/f1cedfdd-eb93-4bda-a2f0-9171e3c71c41",
            "Photo-3.source": "https://creatomate.com/files/assets/a2fc1725-f761-4d68-a6e8-001aa890c126",
            "Photo-4.source": "https://creatomate.com/files/assets/cc72d7f3-ae1a-494e-af46-f080fa2c5d85",
            "Photo-5.source": "https://creatomate.com/files/assets/9fc100e8-cbb5-451d-8c5e-d9f75b190cb1",
            "Address.text": "Los Angeles,\nCA 90045",
            "Details-1.text": "2,500 sqft\n4 Bedrooms\n3 Bathrooms",
            "Details-2.text": "Built in 1995\n2 Garage Spaces\n$1,595,000",
            "Picture.source": "https://creatomate.com/files/assets/08322d05-9717-402a-b267-5f49fb511f95",
            "Email.text": "elisabeth@mybrand.com",
            "Phone-Number.text": "(123) 555-1234",
            "Brand-Name.text": "My Brand Realtors",
            "Name.text": "Elisabeth Parker"
        };

        const result = await creatomateService.generateVideo(templateId, modifications);

        console.log("\n======================");
        console.log("✅ Success! Creatomate API accepted the job.");
        console.log("Job ID:", result.id);
        console.log("Status:", result.status);
        console.log("Watch URL (takes a minute to generate):", result.url);
        console.log("======================\n");

    } catch (e) {
        console.error("Test failed:", e);
    }
})();
