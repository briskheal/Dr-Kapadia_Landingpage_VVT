async function simulateAutoPilot() {
    try {
        console.log('1. Enabling Auto-Pilot...');
        await fetch('http://localhost:3000/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ autoPilot: true, clinicName: 'Dr. Kapadia Digital Brain' })
        });

        console.log('2. Submitting Routine Query...');
        const res = await fetch('http://localhost:3000/api/enquiry', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                patient_name: 'Simulated Patient',
                phone: '9999988888',
                message: 'What are your clinic timings?',
                platform: 'Website Test'
            })
        });
        const data = await res.json();
        console.log('Result:', data);
    } catch (e) { console.error(e); }
}
simulateAutoPilot();
