
import { google } from 'googleapis';
import dotenv from 'dotenv';
dotenv.config();

const youtube = google.youtube('v3');
const API_KEY = process.env.YOUTUBE_API_KEY;

if (!API_KEY) {
    console.error("❌ YOUTUBE_API_KEY is missing in .env");
    process.exit(1);
}

// The exact search term that failed in the app
const query = "műszaki rajzok alapjai hegesztőknek";

async function testYouTubeSearch() {
    console.log(`🔍 Testing YouTube search for: "${query}"`);
    console.log(`🔑 Using API Key: ${API_KEY.substring(0, 5)}...`);

    try {
        const response = await youtube.search.list({
            key: API_KEY,
            part: ['snippet'],
            q: query,
            type: ['video'],
            maxResults: 3,
            relevanceLanguage: 'hu',
            regionCode: 'HU'
        });

        console.log("✅ API Response status:", response.status);

        if (response.data.items && response.data.items.length > 0) {
            console.log(`✅ Found ${response.data.items.length} videos:`);
            response.data.items.forEach((item, index) => {
                console.log(`\n--- Video ${index + 1} ---`);
                console.log(`Title: ${item.snippet?.title}`);
                console.log(`ID: ${item.id?.videoId}`);
                console.log(`Link: https://www.youtube.com/watch?v=${item.id?.videoId}`);
            });
        } else {
            console.log("⚠️ No videos found with strict filtering (relevanceLanguage: 'hu', regionCode: 'HU').");

            // Retry without strict filtering
            console.log("\n🔄 Retrying without region/language filters...");
            const broaderResponse = await youtube.search.list({
                key: API_KEY,
                part: ['snippet'],
                q: query,
                type: ['video'],
                maxResults: 3
            });

            if (broaderResponse.data.items && broaderResponse.data.items.length > 0) {
                console.log(`✅ Found ${broaderResponse.data.items.length} videos with broader search:`);
                broaderResponse.data.items.forEach((item, index) => {
                    console.log(`\n--- Video ${index + 1} ---`);
                    console.log(`Title: ${item.snippet?.title}`);
                    console.log(`ID: ${item.id?.videoId}`);
                });
            } else {
                console.log("❌ Still no videos found.");
            }
        }

    } catch (error: any) {
        console.error("❌ API Error details:");
        console.error(`Status: ${error.code || error.response?.status}`);
        console.error(`Message: ${error.message}`);
        if (error.response?.data?.error?.errors) {
            console.error("Errors:", JSON.stringify(error.response.data.error.errors, null, 2));
        }
    }
}

testYouTubeSearch();
