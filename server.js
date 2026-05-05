const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the current directory
app.use(express.static(path.join(__dirname)));

// Serve index.html for the root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// AiSensy WhatsApp Webhook Endpoint
app.post('/api/webhooks/aisensy', express.json(), (req, res) => {
    const incomingMessage = req.body;
    console.log('Incoming WhatsApp Message from AiSensy:', incomingMessage);
    
    // LOGIC: 
    // 1. Send to OpenAI (Digital Brain)
    // 2. Classify (Urgent/Lead/Query)
    // 3. Send response back via AiSensy API
    // 4. Update Dashboard
    
    res.status(200).send('Webhook Received');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
