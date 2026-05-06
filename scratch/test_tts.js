const apiKey = 'sk_aa479d32befc28d61bd7dd8cb0965d0ae52947b5e4db3284';

async function testTTS() {
    try {
        const voiceId = '21m00Tcm4TlvDq8ikWAM'; // Rachel
        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
            method: 'POST',
            headers: {
                'xi-api-key': apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: 'Testing',
                model_id: 'eleven_monolingual_v1'
            })
        });
        const data = await response.json();
        console.log('Response:', JSON.stringify(data, null, 2));
    } catch (err) {
        console.error(err);
    }
}

testTTS();
