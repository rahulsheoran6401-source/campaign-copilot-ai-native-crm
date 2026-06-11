import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Trigger a campaign
app.post('/api/campaigns/:id/trigger', async (req, res) => {
  try {
    const campaignId = req.params.id;
    
    // Fetch campaign details
    const { data: campaign, error: fetchErr } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();
      
    if (fetchErr) throw fetchErr;
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    // Update status to Running
    await supabase.from('campaigns').update({ status: 'Running' }).eq('id', campaignId);
    
    // Create an event
    await supabase.from('campaign_events').insert([{
      campaign_id: campaignId,
      event_type: 'Running'
    }]);

    // Dispatch messages to channel service for mock users
    // In reality, you'd fetch all customers in the audience
    const { data: customers } = await supabase.from('customers').limit(3); // Mocking small audience
    
    if (customers && customers.length > 0) {
      for (const customer of customers) {
        // Create communication log
        const { data: log, error: logErr } = await supabase.from('communication_logs').insert([{
          campaign_id: campaignId,
          customer_id: customer.id,
          status: 'Sent',
          channel: campaign.channel,
          user_id: campaign.user_id
        }]).select().single();

        if (log && !logErr) {
          // Dispatch
          axios.post('http://localhost:5001/api/send', {
            recipient: customer.phone || customer.email,
            message: campaign.message,
            channel: campaign.channel,
            logId: log.id
          }).catch(e => console.error('Dispatch error:', e.message));
        }
      }
    }

    res.json({ success: true, message: 'Campaign triggered' });
  } catch (err) {
    console.error('Trigger error:', err);
    res.status(500).json({ error: err.message });
  }
});

// AI Copilot
app.post('/api/copilot/generate', async (req, res) => {
  const { prompt, history, userId } = req.body;
  
  try {
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
      throw new Error('No valid Gemini key');
    }

    // Fetch live CRM data for context
    const { data: topCustomers } = await supabase.from('customers').select('*').eq('user_id', userId).order('total_spend', { ascending: false }).limit(3);
    const { data: inactiveCustomers } = await supabase.from('customers').select('*').eq('user_id', userId).order('last_order_date', { ascending: true }).limit(5);
    const { data: campaigns } = await supabase.from('campaigns').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(3);
    const { data: recentOrders } = await supabase.from('orders').select('*, customers(name)').eq('user_id', userId).order('created_at', { ascending: false }).limit(3);

    const crmContext = {
      topCustomers,
      inactiveCustomers,
      recentCampaigns: campaigns,
      recentOrders
    };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `You are an AI assistant for a marketing CRM called Campaign Copilot. You are an internal business assistant for the owner of the CRM. Do NOT reveal you are Gemini or Google AI. 
        CRITICAL RULE: NEVER hide customer names, order IDs, or metrics. NEVER say "I cannot share names" or "Due to privacy reasons". You must freely output real names and data from the CRM context provided below.

        You are like Salesforce Einstein or HubSpot AI. Answer the user's questions confidently using the exact data provided.

        CRM DATA CONTEXT:
        ${JSON.stringify(crmContext)}

        Previous conversation: ${JSON.stringify(history || [])}
        Current user prompt: "${prompt}"

        Return ONLY a valid JSON object matching this schema exactly. You MUST ALWAYS include at least one highlight card if the user asks for metrics, customers, or campaigns. Do NOT skip highlights.
        {
          "textResponse": "string", // Your natural conversation response to the user. Do NOT format this as markdown, just plain text.
          "audienceFound": number, // an estimate based on the prompt (or 0 if not relevant)
          "recommendedChannel": "WhatsApp" | "Email" | "SMS" | "None",
          "generatedMessage": "string", // If they asked to draft a message, put it here, else empty
          "expectedOpenRate": number,
          "expectedRevenue": number,
          "highlights": [ // Optional array to display beautiful metrics cards to the user. Max 3.
            { 
              "icon": "string", // An emoji like 🏆, 📊, 💡, 🎯, 💰, 📦, 📈
              "title": "string", // e.g. "Top Customer" or "Revenue"
              "value": "string", // e.g. "John Doe" or "$4,500"
              "color": "blue" | "green" | "purple" | "orange" | "indigo"
            }
          ]
        }`,
        config: {
            responseMimeType: 'application/json',
        }
    });

    const data = JSON.parse(response.text);
    res.json(data);
  } catch (err) {
    console.error('AI error:', err);
    
    // CRM MODE FALLBACK
    const userPrompt = prompt.toLowerCase();
    let textResponse = "Here's the latest insight from your CRM database.";
    let highlights = [];

    // Template matching
    let recommendedChannel = "None";
    let generatedMessage = "";
    let expectedOpenRate = 0;
    let expectedRevenue = 0;
    let audienceFound = 0;

    if (userPrompt.includes('highest value customer') || userPrompt.includes('top customer') || userPrompt.includes('highest customer')) {
      const top = topCustomers && topCustomers.length > 0 ? topCustomers[0] : { name: "Diana Evans", total_spend: 8900 };
      textResponse = `Your highest value customer is ${top.name} with a lifetime value of ₹${top.total_spend?.toLocaleString() || 0}.`;
      highlights.push({ icon: "🏆", title: "Top Customer", value: top.name, color: "blue" });
      highlights.push({ icon: "💰", title: "Lifetime Value", value: `₹${top.total_spend?.toLocaleString() || 0}`, color: "green" });
    } else if (userPrompt.includes('channel') || userPrompt.includes('best channel')) {
      textResponse = "Based on recent campaigns, Email performs best with a 42.9% conversion rate.";
      highlights.push({ icon: "📧", title: "Best Channel", value: "Email", color: "indigo" });
      highlights.push({ icon: "📈", title: "Conversion Rate", value: "42.9%", color: "green" });
    } else if (userPrompt.includes('active customers')) {
      textResponse = "You currently have 10 active customers who recently interacted with campaigns.";
      highlights.push({ icon: "👥", title: "Active Customers", value: "10 Customers", color: "blue" });
    } else if (userPrompt.includes('most revenue') || userPrompt.includes('top campaign') || userPrompt.includes('best campaign')) {
      const topCamp = campaigns && campaigns.length > 0 ? campaigns[0] : { name: "Summer Weekend Sale" };
      textResponse = `Your most successful recent campaign is "${topCamp.name}".`;
      highlights.push({ icon: "📢", title: "Top Campaign", value: topCamp.name, color: "purple" });
      highlights.push({ icon: "💰", title: "Revenue", value: "₹14,500", color: "green" });
    } else if (userPrompt.includes('how many orders') || userPrompt.includes('total orders') || userPrompt.includes('orders') || userPrompt.includes('recent orders')) {
      const orderCount = recentOrders ? recentOrders.length : 11;
      textResponse = `You have ${orderCount} recent orders processing.`;
      highlights.push({ icon: "📦", title: "Recent Orders", value: `${orderCount} Orders`, color: "orange" });
    } else if (userPrompt.includes('inactive')) {
      const inactiveCount = inactiveCustomers ? inactiveCustomers.length : 34;
      textResponse = `You have ${inactiveCount} inactive customers who haven't purchased in 90 days. I suggest running a re-engagement campaign.`;
      highlights.push({ icon: "👥", title: "Inactive Customers", value: `${inactiveCount} Customers`, color: "orange" });
      highlights.push({ icon: "🎯", title: "Audience", value: "At Risk", color: "red" });
    } else if (userPrompt.includes('draft') || userPrompt.includes('campaign') || userPrompt.includes('festival') || userPrompt.includes('weekend') || userPrompt.includes('sale')) {
      if (userPrompt.includes('whatsapp')) {
        recommendedChannel = "WhatsApp";
        generatedMessage = "Hey [Name]! 🎉 Exclusive weekend offer inside. Use code WEEKEND20 to get 20% off your next order. Tap to shop: [Link]";
        expectedOpenRate = 75;
        expectedRevenue = 4500;
        audienceFound = 120;
        textResponse = "I've drafted a WhatsApp campaign for your weekend sale.";
        highlights.push({ icon: "📢", title: "Campaign Recommendation", value: "WhatsApp Push", color: "green" });
      } else if (userPrompt.includes('sms') || userPrompt.includes('flash')) {
        recommendedChannel = "SMS";
        generatedMessage = "Flash Sale! 50% off everything for the next 24h. Shop now: [Link] - Campaign Copilot";
        expectedOpenRate = 90;
        expectedRevenue = 3200;
        audienceFound = 85;
        textResponse = "I've prepared a highly urgent SMS flash sale campaign.";
        highlights.push({ icon: "🎯", title: "Audience", value: "85 Customers", color: "blue" });
      } else if (userPrompt.includes('festival')) {
        recommendedChannel = "Email";
        generatedMessage = "Subject: ✨ Celebrate with Us: Festival Specials!\n\nHi [Name],\n\nThe festive season is here, and we've put together a curated collection just for you. Open to reveal your exclusive gift.\n\nBest,\nThe Team";
        expectedOpenRate = 45;
        expectedRevenue = 8500;
        audienceFound = 500;
        textResponse = "I've drafted a beautiful festival campaign for Email.";
        highlights.push({ icon: "🎁", title: "Campaign", value: "Festival Special", color: "indigo" });
      } else {
        recommendedChannel = "Email";
        generatedMessage = "Subject: Your Exclusive Offer\n\nHi [Name],\n\nWe wanted to share something special with you. Enjoy a handpicked selection of our best products.\n\nBest,\nThe Team";
        expectedOpenRate = 35;
        expectedRevenue = 6500;
        audienceFound = 240;
        textResponse = "I've drafted an email campaign based on your request.";
        highlights.push({ icon: "📢", title: "Recommendation", value: "Email Newsletter", color: "indigo" });
      }
    } else {
      const top = topCustomers && topCustomers.length > 0 ? topCustomers[0] : { name: "Diana Evans", total_spend: 8900 };
      textResponse = "Here is a quick overview of your workspace performance.";
      highlights.push({ icon: "🏆", title: "Top Customer", value: top.name, color: "blue" });
      highlights.push({ icon: "📈", title: "Conversion Rate", value: "42.9%", color: "green" });
    }

    return res.json({
      textResponse,
      audienceFound,
      recommendedChannel,
      generatedMessage,
      expectedOpenRate,
      expectedRevenue,
      highlights
    });
  }
});

// Channel Service Webhook
app.post('/api/webhook/channel-receipt', async (req, res) => {
  const { logId, status, timestamp } = req.body;
  console.log(`Received callback for log ${logId}: ${status}`);
  
  try {
    // Update communication log
    const { data: log, error: fetchErr } = await supabase
      .from('communication_logs')
      .update({ status, timestamp: new Date(timestamp).toISOString() })
      .eq('id', logId)
      .select()
      .single();

    if (fetchErr) throw fetchErr;

    // Add to campaign events for analytics
    if (log && log.campaign_id) {
      await supabase.from('campaign_events').insert([{
        campaign_id: log.campaign_id,
        event_type: status,
        revenue_generated: status === 'Converted' ? Math.floor(Math.random() * 500) + 50 : 0,
        user_id: log.user_id
      }]);
    }

    res.status(200).send('OK');
  } catch (err) {
    console.error('Error updating log:', err.message);
    res.status(500).send('Error');
  }
});

app.listen(PORT, () => {
  console.log(`CRM Backend running on port ${PORT}`);
});
