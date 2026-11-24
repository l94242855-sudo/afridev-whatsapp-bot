// server.js - AFRIDEV WhatsApp Bot 30-Day Free Trial Engine
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

// In-memory or database mock for active trials
const trialDatabase = new Map();

// Webhook endpoint to receive incoming WhatsApp messages (e.g., "TRIAL" or "START")
app.post('/whatsapp-webhook', async (req, res) => {
    try {
        const incomingMessage = req.body;
        
        // Extract sender phone number and message body from webhook payload
        const phoneNumber = incomingMessage?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.from;
        const messageBody = incomingMessage?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.text?.body?.trim().toUpperCase();

        if (!phoneNumber || !messageBody) {
            return res.sendStatus(200);
        }

        let replyText = "";

        if (messageBody === "TRIAL" || messageBody === "START") {
            // Check if user already has an active or expired trial
            if (trialDatabase.has(phoneNumber)) {
                const trial = trialDatabase.get(phoneNumber);
                const daysLeft = getDaysRemaining(trial.expiresAt);
                
                if (daysLeft > 0) {
                    replyText = `Karibu tena! You already have an active AFRIDEV Trial. You have *${daysLeft} days remaining* on your 30-day free trial. Need help connecting M-Pesa or eTIMS? Reply HELP.`;
                } else {
                    replyText = `Your 30-day free trial has ended. To continue enjoying automated payments and tax compliance, upgrade to our Growth Plan for KES 450,000 setup + KES 65,000/mo. Reply UPGRADE to talk to sales.`;
                }
            } else {
                // Provision new 30-Day Free Trial
                const startDate = new Date();
                const expiresAt = new Date();
                expiresAt.setDate(startDate.getDate() + 30);

                trialDatabase.set(phoneNumber, {
                    startDate,
                    expiresAt,
                    plan: "30-Day Free Trial",
                    status: "ACTIVE"
                });

                replyText = `🎉 *Welcome to AFRIDEV!* Your 30-day free trial is now active.\n\n` +
                            `You have full access to:\n` +
                            `• M-Pesa Daraja STK Push & Webhooks\n` +
                            `• KRA eTIMS Auto-Invoicing Connector\n` +
                            `• SACCO / Field Sales WhatsApp Bot\n\n` +
                            `Your trial expires in 30 days. Reply MENU to get started!`;
                
                // Optional: Trigger Day 1 onboarding message via WhatsApp Cloud API
                // await sendWhatsAppMessage(phoneNumber, replyText);
            }
        } else if (messageBody === "MENU") {
            replyText = `📌 *AFRIDEV WhatsApp Assistant Menu*\n\n` +
                        `1. Test M-Pesa STK Push\n` +
                        `2. Generate eTIMS Invoice\n` +
                        `3. Check Trial Status\n` +
                        `4. Contact Support (0706606816)`;
        } else {
            replyText = `Welcome to AFRIDEV! Type *TRIAL* to instantly activate your 30-day free trial, or *MENU* to view available features.`;
        }

        // Send reply back via WhatsApp Cloud API
        await sendWhatsAppMessage(phoneNumber, replyText);
        
        res.sendStatus(200);
    } catch (error) {
        console.error("Webhook Error:", error);
        res.sendStatus(500);
    }
});

// Helper function to send messages via Meta WhatsApp Cloud API
async function sendWhatsAppMessage(recipientPhone, message) {
    const accessToken = process.env.WHATSAPP_TOKEN; // Your Meta permanent access token
    const phoneNumberId = process.env.WHATSAPP_PHONE_ID; // Your WhatsApp Business Phone ID

    try {
        await axios.post(
            `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
            {
                messaging_product: "whatsapp",
                to: recipientPhone,
                type: "text",
                text: { body: message }
            },
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json"
                }
            }
        );
    } catch (err) {
        console.error("Failed to send WhatsApp message:", err.response?.data || err.message);
    }
}

// Helper to calculate days remaining
function getDaysRemaining(expiryDate) {
    const now = new Date();
    const diffTime = expiryDate - now;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`AFRIDEV Trial Webhook Server running on port ${PORT}`);
});
