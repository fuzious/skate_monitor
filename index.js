const { ethers } = require('ethers');

const axios = require('axios'); // Axios is used to make HTTP requests

// Replace with your Ethereum RPC URL and Slack Webhook URL
const provider = new ethers.providers.JsonRpcProvider("https://nollie-rpc.skatechain.org/");
const slackWebhookUrl = "https://hooks.slack.com/services/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";

async function sendToSlack(message) {
    try {
        await axios.post(slackWebhookUrl, { text: message });
    } catch (error) {
        console.error("Error sending message to Slack:", error);
    }
}

async function checkBlockAndExplorer() {
    try {
        // Fetching the latest block
        const latestBlock = await provider.getBlock('latest');
        const currentTimestamp = Math.floor(Date.now() / 1000); // Current timestamp in seconds

        // Check RPC block production
        if (currentTimestamp - latestBlock.timestamp > 60) {
            await sendToSlack("ALERT_RPC: No new block in the last minute!");
        } else {
            console.log(latestBlock.number +" is fetched from RPC");
        }

        // Calculate block number for 10 minutes ago
        const tenMinutesAgoBlock = latestBlock.number - 200; // Assuming a block time of 3 seconds

        // Check block on Explorer
        await checkBlockOnExplorer(tenMinutesAgoBlock);
    } catch (error) {
        await sendToSlack(`Error in checkBlockAndExplorer: ${error.message}`);
    }
}

// Check if a specific block number is present on the explorer
async function checkBlockOnExplorer(blockNumber) {
    try {
        const response = await axios.get(`https://nolliescan.skatechain.org/_next/data/7vMpbD-4IZPkUKCoFusKU/block/${blockNumber}.json?height_or_hash=${blockNumber}`);

        if (response.data && response.data.pageProps && response.data.pageProps.height_or_hash === blockNumber.toString()) {
            await sendToSlack(`Block number ${blockNumber} is present on the explorer.`);
        } else {
            await sendToSlack(`ALERT_EXPLORER: Block number ${blockNumber} is not present on the explorer. The explorer might be down!`);
        }
    } catch (error) {
        await sendToSlack(`ALERT_EXPLORER: Error checking block number ${blockNumber} on the explorer: ${error.message}`);
    }
}

function scheduleChecks() {
    try {
        setInterval(checkBlockAndExplorer, 15 * 1000);
    } catch(error) {
        sendToSlack(`Some error occurred ${error}`);
    }
}


scheduleChecks();

