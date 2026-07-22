const axios = require('axios');

module.exports = async (req, res) => {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const { action, protocol, username, password, exp, quota, iplimit, dev_pin } = req.body;

    const domain = process.env.VPS_DOMAIN;
    const auth = process.env.VPS_AUTH;
    const adminPin = process.env.ADMIN_PIN; 
    const apiAiBase = process.env.API_AI_BASE || 'https://text.pollinations.ai/';

    // =======================================================
    // FITUR BARU: REAL-TIME SERVER MONITORING (VPS SENSOR) 📊
    // =======================================================
    if (action === 'server_stats') {
        try {
            if (!domain) throw new Error("Domain VPS belum disetting.");
            const url = `http://${domain}:5889/stats`;
            let response = await axios.get(url, { timeout: 5000 });
            return res.status(200).json({ status: "success", data: response.data });
        } catch (error) {
            return res.status(500).json({ status: "error", message: "Gagal terhubung ke sensor VPS." });
        }
    }

    // =======================================================
    // FITUR 1: CORE AI BARMODS ASSISTANT
    // =======================================================
    if (action === 'ai_chat') {
        try {
            const systemPrompt = "Kamu adalah AI Barmods, asisten pintar berbasis kecerdasan buatan untuk Barmods Tunnel VIP Data Center. Jawab dengan keren, ramah, dan pro.";
            const url = `${apiAiBase}${encodeURIComponent(username)}?system=${encodeURIComponent(systemPrompt)}&model=searchgpt`;
            let response = await axios.get(url, { timeout: 15000 });
            return res.status(200).json({ status: "success", reply: response.data });
        } catch (error) {
            return res.status(500).json({ status: "error", message: "Jaringan AI sedang sibuk." });
        }
    }

    // =======================================================
    // FITUR 2: PROXY TOOLS XL & AXIS
    // =======================================================
    if (action && action.startsWith('xl_')) {
        try {
            let url = '';
            if (action === 'xl_kuota' || action === 'xl_circle') url = `https://xl-ku.my.id/check/all-info/${username}`;
            else if (action === 'xl_akrab') url = `https://xl-ku.my.id/check/area-akrab`; 
            else if (action === 'xl_bepu') url = `https://xl-ku.my.id/check/area-bepu`;

            let response = await axios.get(url, { 
                validateStatus: () => true, 
                timeout: 15000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36',
                    'Accept': 'application/json',
                    'Referer': 'https://xl-ku.my.id/',
                    'Xl-Cd10e88edb': 'wwBPZDHZca7_-3OPhO1KYvr27lNMFHAQexl5kbv6lQgVqpsLtMTBrXW8z-vWiPM_HzbTwdqO1DbXZj8DjMzqbWFMKvluyIKUT2pOr-12K5zRrHTsCW_MpZk9-4EoRRij99vIn-5_h_QjRxxUnu_v06RyV69HvPnZ35bH1h3IttNqYiaBQ'
                }
            });
            return res.status(200).json(response.data);
        } catch (error) {
            return res.status(500).json({ status: false, message: "Server API XL sedang Down atau diblokir." });
        }
    }

    // =======================================================
    // FITUR 3: VPN PANEL DEPLOYMENT (KHUSUS DEVELOPER)
    // =======================================================
    if (!domain || !auth) return res.status(500).json({ status: "error", message: "FATAL ERROR: VPS_DOMAIN/AUTH belum disetting!" });
    if (!adminPin) return res.status(500).json({ status: "error", message: "FATAL ERROR: ADMIN_PIN belum dibuat di Vercel!" });
    if (dev_pin !== adminPin) return res.status(403).json({ status: "error", message: "AKSES DITOLAK! Developer PIN salah." });
    if (!action || !protocol || !username) return res.status(400).json({ status: "error", message: "Data form tidak lengkap!" });

    let url = ''; let endpoint = `${action}${protocol}`;

    try {
        if (action === 'create' || action === 'trial' || action === 'renew') {
            if (action === 'renew') endpoint = `renew${protocol}`;
            if (protocol === 'ssh') url = `http://${domain}:5888/${endpoint}?user=${username}&password=${password || ''}&exp=${exp}&iplimit=${iplimit}&auth=${auth}`;
            else url = `http://${domain}:5888/${endpoint}?user=${username}&exp=${exp}&quota=${quota}&iplimit=${iplimit}&auth=${auth}`;
        } else if (action === 'delete') {
            endpoint = `del${protocol}`;
            url = `http://${domain}:5888/${endpoint}?user=${username}&auth=${auth}`;
        }

        let response = await axios.get(url, { validateStatus: () => true, timeout: 15000 });
        if (action === 'delete' && response.status === 404) {
             response = await axios.get(`http://${domain}:5888/delete${protocol}?user=${username}&auth=${auth}`, { validateStatus: () => true, timeout: 15000 });
        }
        return res.status(200).json(response.data);
    } catch (error) {
        return res.status(500).json({ status: "error", message: `Server Down: ${error.message}` });
    }
};
