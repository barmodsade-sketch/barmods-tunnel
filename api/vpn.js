const axios = require('axios');

module.exports = async (req, res) => {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const { action, protocol, username, password, exp, quota, iplimit, dev_pin } = req.body;

    // =======================================================
    // ⚙️ SEMUA PENGATURAN DIAMBIL DARI .ENV VERCEL
    // =======================================================
    const domain = process.env.VPS_DOMAIN;
    const auth = process.env.VPS_AUTH;
    const adminPin = process.env.ADMIN_PIN; 

    // =======================================================
    // FITUR 1: REAL-TIME SERVER MONITORING (VPS SENSOR) 📊
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
    // FITUR 2: CORE AI BARMODS ASSISTANT (BYPASS 402) 🤖🔥
    // =======================================================
    if (action === 'ai_chat') {
        const systemPrompt = "Kamu adalah AI Barmods, asisten pintar berbasis kecerdasan buatan untuk Barmods Tunnel VIP Data Center. Jawab dengan keren, ramah, logis, dan pro.";
        
        try {
            // SERVER UTAMA: Menggunakan API AI Cloudflare Worker (Kebal Blokir Vercel)
            const url = `https://darkness.ashlynn.workers.dev/chat/?prompt=${encodeURIComponent(username)}&system=${encodeURIComponent(systemPrompt)}`;
            let response = await axios.get(url, { timeout: 15000 });
            
            // Ekstrak jawaban dari server
            let aiReply = response.data.response || response.data.answer || response.data.message || response.data;
            if (typeof aiReply === 'object') aiReply = JSON.stringify(aiReply);
            
            return res.status(200).json({ status: "success", reply: aiReply });
        } catch (error) {
            try {
                // SERVER CADANGAN (FALLBACK): Berjalan otomatis jika server utama down
                const fallbackUrl = `https://api.ryzendesu.vip/api/ai/chatgpt?text=${encodeURIComponent(username)}`;
                let resFallback = await axios.get(fallbackUrl, { timeout: 15000 });
                
                let replyFb = resFallback.data.response || resFallback.data.reply || "Halo Bos! Sistem AI sedang dalam mode pemulihan ringan. Ada yang bisa dibantu?";
                return res.status(200).json({ status: "success", reply: replyFb });
            } catch (fallbackErr) {
                return res.status(500).json({ status: "error", message: `Jaringan AI down (402 Bypass Failed).` });
            }
        }
    }

    // =======================================================
    // FITUR 3: PROXY TOOLS XL & AXIS (API HASIL HACKING VIP) 🕵️‍♂️
    // =======================================================
    if (action && action.startsWith('xl_')) {
        try {
            let url = '';
            
            if (action === 'xl_kuota' || action === 'xl_circle') {
                url = `https://xl-ku.my.id/check/all-info/${username}`;
            }
            else if (action === 'xl_akrab') {
                url = `https://xl-ku.my.id/check/area-akrab`; 
            }
            else if (action === 'xl_bepu') {
                url = `https://xl-ku.my.id/check/area-bepu`;
            }

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
    // FITUR 4: VPN PANEL DEPLOYMENT (KHUSUS DEVELOPER)
    // =======================================================
    if (!domain || !auth) return res.status(500).json({ status: "error", message: "FATAL ERROR: Variabel .env (VPS_DOMAIN/AUTH) belum disetting!" });
    
    if (!adminPin) return res.status(500).json({ status: "error", message: "FATAL ERROR: Variabel .env (ADMIN_PIN) belum dibuat di Vercel!" });
    if (dev_pin !== adminPin) {
        return res.status(403).json({ status: "error", message: "AKSES DITOLAK! Developer PIN salah. Anda tidak memiliki izin membuat/menghapus VPN." });
    }

    if (!action || !protocol || !username) return res.status(400).json({ status: "error", message: "Data form tidak lengkap!" });

    let url = '';
    let endpoint = '';

    try {
        if (action === 'create' || action === 'trial') {
            endpoint = `${action}${protocol}`; 
            if (protocol === 'ssh') url = `http://${domain}:5888/${endpoint}?user=${username}&password=${password}&exp=${exp}&iplimit=${iplimit}&auth=${auth}`;
            else url = `http://${domain}:5888/${endpoint}?user=${username}&exp=${exp}&quota=${quota}&iplimit=${iplimit}&auth=${auth}`;
        } 
        else if (action === 'renew') {
            endpoint = `renew${protocol}`;
            if (protocol === 'ssh') url = `http://${domain}:5888/${endpoint}?user=${username}&exp=${exp}&iplimit=${iplimit}&auth=${auth}`;
            else url = `http://${domain}:5888/${endpoint}?user=${username}&exp=${exp}&quota=${quota}&iplimit=${iplimit}&auth=${auth}`;
        } 
        else if (action === 'delete') {
            endpoint = `del${protocol}`;
            url = `http://${domain}:5888/${endpoint}?user=${username}&auth=${auth}`;
        }

        let response = await axios.get(url, { validateStatus: () => true, timeout: 15000 });
        if (action === 'delete' && response.status === 404) {
             let fallbackUrl = `http://${domain}:5888/delete${protocol}?user=${username}&auth=${auth}`;
             response = await axios.get(fallbackUrl, { validateStatus: () => true, timeout: 15000 });
        }
        return res.status(200).json(response.data);
    } catch (error) {
        return res.status(500).json({ status: "error", message: `Server Down: ${error.message}` });
    }
};
