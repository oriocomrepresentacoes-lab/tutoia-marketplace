const fs = require('fs');
const FormData = require('form-data');
const fetch = require('node-fetch');

async function main() {
    try {
        const loginRes = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@marketplace.com', password: 'admin123' })
        });
        const loginData = await loginRes.json();
        console.log('Login:', loginData.token ? 'Success' : loginData);

        const token = loginData.token;
        if (!token) return;

        fs.writeFileSync('dummy.jpg', 'dummy image content');

        const formData = new FormData();
        formData.append('title', 'Admin Test Banner');
        formData.append('link', 'https://example.com');
        formData.append('position', 'home_topo');
        formData.append('image', fs.createReadStream('dummy.jpg'));

        const uploadRes = await fetch('http://localhost:5000/api/banners', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        const text = await uploadRes.text();
        console.log('Upload Status:', uploadRes.status);
        console.log('Upload Result:', text);
    } catch (e) {
        console.error(e);
    }
}
main();
