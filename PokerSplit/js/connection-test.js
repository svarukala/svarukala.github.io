// Connection Test Script
// This file tests the Supabase connection

import { testConnection, supabase } from './supabase.js';

async function runConnectionTest() {
    const resultDiv = document.getElementById('connection-result');

    resultDiv.innerHTML = '<p>Testing connection...</p>';

    try {
        // Check if environment variables are set
        const url = import.meta.env.VITE_SUPABASE_URL;
        const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

        if (!url || !key) {
            resultDiv.innerHTML = `
                <p style="color: #dc3545;">Missing environment variables!</p>
                <p>Make sure you have created <code>.env.local</code> with:</p>
                <pre>VITE_SUPABASE_URL=your-url
VITE_SUPABASE_ANON_KEY=your-key</pre>
            `;
            return;
        }

        resultDiv.innerHTML += `<p>URL: ${url.substring(0, 30)}...</p>`;
        resultDiv.innerHTML += `<p>Key: ${key.substring(0, 20)}...</p>`;

        // Test the connection
        const connected = await testConnection();

        if (connected) {
            resultDiv.innerHTML += `
                <p style="color: #28a745; font-weight: bold;">
                    Connection successful!
                </p>
                <p>Your Supabase database is ready.</p>
            `;
        } else {
            resultDiv.innerHTML += `
                <p style="color: #dc3545; font-weight: bold;">
                    Connection failed!
                </p>
                <p>Check that:</p>
                <ul>
                    <li>Your Supabase project is active</li>
                    <li>The URL and key are correct</li>
                    <li>You've run the SQL schema</li>
                </ul>
            `;
        }
    } catch (error) {
        resultDiv.innerHTML = `
            <p style="color: #dc3545;">Error: ${error.message}</p>
        `;
    }
}

// Run test when page loads
document.addEventListener('DOMContentLoaded', runConnectionTest);

// Export for manual testing
window.runConnectionTest = runConnectionTest;
