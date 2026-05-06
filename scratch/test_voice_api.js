async function testVoiceGen() {
    try {
        console.log('Testing Voice Generation API...');
        const res = await fetch('http://localhost:3000/api/voice/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: 'Hello, this is a test of the voice generation system.',
                patient_name: 'Test Patient'
            })
        });
        const data = await res.json();
        console.log('Result:', data);
    } catch (e) { console.error(e); }
}
testVoiceGen();
