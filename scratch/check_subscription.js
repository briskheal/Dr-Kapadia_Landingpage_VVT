const apiKey = 'sk_aa479d32befc28d61bd7dd8cb0965d0ae52947b5e4db3284';

async function checkAccount() {
    try {
        const response = await fetch('https://api.elevenlabs.io/v1/user/subscription', {
            headers: { 'xi-api-key': apiKey }
        });
        const data = await response.json();
        console.log('Subscription:', JSON.stringify(data, null, 2));
    } catch (err) {
        console.error(err);
    }
}

checkAccount();
