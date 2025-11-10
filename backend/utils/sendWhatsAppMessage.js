// utils/sendWhatsAppMessage.js
const axios = require('axios');

const instanceId = process.env.ULTRA_INSTANCE_ID;
const token = process.env.ULTRA_TOKEN;

async function sendWhatsAppMessage(phone, message) {
  try {
    const payload = {
      chatId: `${phone}@c.us`, // format for WhatsApp
      message
    };

    const response = await axios.post(
      `https://api.green-api.com/waInstance${instanceId}/sendMessage/${token}`,
      payload
    );

    console.log('WhatsApp API Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error sending WhatsApp message:', error.message);
    throw error;
  }
}

module.exports = sendWhatsAppMessage;
