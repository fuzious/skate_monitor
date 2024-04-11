const { ethers } = require('ethers');

const axios = require('axios'); // Axios is used to make HTTP requests
require('dotenv').config();

// Replace with your Ethereum RPC URL and Slack Webhook URL
const provider = new ethers.providers.JsonRpcProvider(process.env.NOLLIE_RPC_URL);
const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;

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
            await sendToSlack("ALERT_RPC: @engineering No new block in the last minute!");
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
            console.log(`Block number ${blockNumber} is present on the explorer.`);
        } else {
            await sendToSlack(`ALERT_EXPLORER: @engineering Block number ${blockNumber} is not present on the explorer. The explorer might be down!`);
        }
    } catch (error) {
        await sendToSlack(`ALERT_EXPLORER: @engineering Error checking block number ${blockNumber} on the explorer: ${error.message}`);
    }
}

const addressThresholdMap = {
    "0x73C076b1008323C76F8aa7ACD82CdBD0e854Fd23": { threshold: ethers.utils.parseEther("2.0"), rpcUrl: process.env.ETH_RPC_URL },
    "0x4d592Ec49dAd1c13839c4Fb2010b8ba3EFF5e613": { threshold: ethers.utils.parseEther("2.0"), rpcUrl: process.env.ETH_RPC_URL },
    "0x077775f83553FbCDF589Ee3A62f81a39bA0fA65E": { threshold: ethers.utils.parseEther("2.0"), rpcUrl: process.env.NOLLIE_RPC_URL },
};


async function checkAddressBalances() {
    for (const [address, { threshold, rpcUrl }] of Object.entries(addressThresholdMap)) {
        try {
            const rpcProvider = new ethers.providers.JsonRpcProvider(rpcUrl);
            const balance = await rpcProvider.getBalance(address);
            if (balance.lt(threshold)) { // Checks if balance is less than the threshold
                await sendToSlack(`ALERT_BALANCE: <@user_group_id> Address ${address} has a balance below the threshold!`);
            } else {
                console.log(`Address ${address} balance is above the threshold.`);
            }
        } catch (error) {
            await sendToSlack(`Error checking balance for address ${address} <@user_group_id>: ${error.message}`);
        }
    }
}


function scheduleChecks() {
    try {
        setInterval(async () => {
            await checkBlockAndExplorer();
            await checkAddressBalances();
        }, 30 * 1000);
    } catch(error) {
        sendToSlack(`Some error occurred ${error}`);
    }
}


scheduleChecks();

