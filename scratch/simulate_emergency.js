async function simulateEmergency() {
    try {
        console.log('1. Verifying Auto-Pilot is ON...');
        // (Assuming it is still ON from the last test)

        console.log('2. Submitting EMERGENCY Query...');
        const res = await fetch('http://localhost:3000/api/enquiry', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                patient_name: 'Emergency Case (DVT Suspect)',
                phone: '9824000000',
                message: 'My leg is suddenly very swollen and I have sharp pain. It is warm to touch. Please help!',
                platform: 'Website Test'
            })
        });
        const data = await res.json();
        console.log('Result (Should NOT be auto-replied):', data);
    } catch (e) { console.error(e); }
}
simulateEmergency();
