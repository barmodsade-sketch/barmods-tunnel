const axios = require('axios');

module.exports = async (req, res) => {
    // Hanya menerima method POST dari website kita sendiri
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const { action, protocol, username, password, exp, quota, iplimit } = req.body;
    
    // 🔴 MENGAMBIL DATA MURNI DARI .ENV VERCEL 🔴
    const domain = process.env.VPS_DOMAIN;
    const auth = process.env.VPS_AUTH;

    // Proteksi jika .env lupa dipasang di Vercel
    if (!domain || !auth) {
        return res.status(500).json({ 
            status: "error", 
            message: "FATAL ERROR: Variabel .env (VPS_DOMAIN / VPS_AUTH) belum disetting di Vercel!" 
        });
    }

    if (!action || !protocol || !username) {
        return res.status(400).json({ status: "error", message: "Data form tidak lengkap!" });
    }

    let url = '';
    let endpoint = '';

    try {
        if (action === 'create' || action === 'trial') {
            endpoint = `${action}${protocol}`; 
            if (protocol === 'ssh') {
                url = `http://${domain}:5888/${endpoint}?user=${username}&password=${password}&exp=${exp}&iplimit=${iplimit}&auth=${auth}`;
            } else {
                url = `http://${domain}:5888/${endpoint}?user=${username}&exp=${exp}&quota=${quota}&iplimit=${iplimit}&auth=${auth}`;
            }
        } 
        else if (action === 'renew') {
            endpoint = `renew${protocol}`;
            if (protocol === 'ssh') {
                url = `http://${domain}:5888/${endpoint}?user=${username}&exp=${exp}&iplimit=${iplimit}&auth=${auth}`;
            } else {
                url = `http://${domain}:5888/${endpoint}?user=${username}&exp=${exp}&quota=${quota}&iplimit=${iplimit}&auth=${auth}`;
            }
        } 
        else if (action === 'delete') {
            endpoint = `del${protocol}`;
            url = `http://${domain}:5888/${endpoint}?user=${username}&auth=${auth}`;
        }

        // Tembak ke VPS Mas
        let response = await axios.get(url, { validateStatus: () => true, timeout: 15000 });

        // Auto-Fallback untuk fitur Delete (menyesuaikan versi script bash panel VPS)
        if (action === 'delete' && response.status === 404) {
             let fallbackUrl = `http://${domain}:5888/delete${protocol}?user=${username}&auth=${auth}`;
             response = await axios.get(fallbackUrl, { validateStatus: () => true, timeout: 15000 });
        }

        return res.status(200).json(response.data);

    } catch (error) {
        return res.status(500).json({ status: "error", message: `Server Down / Koneksi API Terputus: ${error.message}` });
    }
};
