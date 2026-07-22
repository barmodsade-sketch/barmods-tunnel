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
    const groqKey = process.env.GROQ_API_KEY; 
    const btcKey = process.env.BOTCAHX_APIKEY; 

    // =======================================================
    // FITUR 1: REAL-TIME SERVER MONITORING (VPS SENSOR)
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
    // FITUR 2: SOSMED DOWNLOADER (TIKTOK & YOUTUBE URL) 📥
    // =======================================================
    if (action === 'tiktok' || action === 'youtube') {
        if (!btcKey) return res.status(200).json({ status: "error", message: "⚠️ VARIABEL `BOTCAHX_APIKEY` BELUM DITAMBAHKAN DI VERCEL!" });
        if (!username) return res.status(400).json({ status: "error", message: "URL tidak boleh kosong!" });
        try {
            let endpoint = action === 'youtube' ? '/api/dowloader/yt' : '/api/dowloader/tiktok';
            const apiUrl = `https://api.botcahx.eu.org${endpoint}?url=${encodeURIComponent(username)}&apikey=${btcKey}`;
            let response = await axios.get(apiUrl, { timeout: 20000 });
            if (!response.data || response.data.status === false) return res.status(400).json({ status: "error", message: response.data?.message || "Gagal mengambil data dari Server Botcahx." });
            return res.status(200).json({ status: "success", data: response.data.result });
        } catch (error) {
            return res.status(500).json({ status: "error", message: "Koneksi ke API Botcahx Gagal/Timeout." });
        }
    }

    // =======================================================
    // FITUR 3: YOUTUBE PLAY VIP (PENCARIAN JUDUL LAGU) 🎵
    // =======================================================
    if (action === 'yt_play') {
        if (!btcKey) return res.status(200).json({ status: "error", message: "⚠️ VARIABEL `BOTCAHX_APIKEY` BELUM DITAMBAHKAN DI VERCEL!" });
        try {
            let searchUrl = `https://api.botcahx.eu.org/api/search/yts?query=${encodeURIComponent(username)}&apikey=${btcKey}`;
            let searchRes = await axios.get(searchUrl, { timeout: 15000 });
            if (!searchRes.data || !searchRes.data.result || searchRes.data.result.length === 0) return res.status(400).json({ status: "error", message: "Lagu tidak ditemukan di YouTube." });
            let video = searchRes.data.result[0];
            let dlUrl = `https://api.botcahx.eu.org/api/dowloader/yt?url=${encodeURIComponent(video.url)}&apikey=${btcKey}`;
            let dlRes = await axios.get(dlUrl, { timeout: 25000 });
            if (!dlRes.data || dlRes.data.status === false) return res.status(400).json({ status: "error", message: "Gagal mengekstrak audio dari lagu tersebut." });
            
            return res.status(200).json({ status: "success", data: { type: 'yt_play', title: video.title || dlRes.data.result.title, thumbnail: video.image || video.thumbnail || dlRes.data.result.thumb, duration: video.timestamp || video.duration || "Unknown", views: video.views || "-", url: video.url, audio: dlRes.data.result.mp3 || dlRes.data.result.audio || dlRes.data.result.url_audio || dlRes.data.result.url } });
        } catch (error) {
            return res.status(500).json({ status: "error", message: "Pencarian lagu gagal / Server API Timeout." });
        }
    }

    // =======================================================
    // FITUR 4: PINTEREST SEARCH (DIRECT SCRAPER VIP) 🖼️⚡
    // =======================================================
    if (action === 'pinterest') {
        try {
            let queryData = JSON.stringify({ options: { query: encodeURIComponent(username) } });
            let scrapeUrl = "https://www.pinterest.com/resource/BaseSearchResource/get/?data=" + encodeURIComponent(queryData);

            let resPinterest = await axios.head(scrapeUrl, {
                headers: { "screen-dpr": "4", "x-pinterest-pws-handler": "www/search/[scope].js" },
                validateStatus: () => true
            });

            let linkHeader = resPinterest.headers.link || resPinterest.headers['link'];
            if (!linkHeader) {
                // Fallback method jika HEAD diblokir
                resPinterest = await axios.get(scrapeUrl, { headers: { "screen-dpr": "4", "x-pinterest-pws-handler": "www/search/[scope].js" }, validateStatus: () => true });
                linkHeader = resPinterest.headers.link || resPinterest.headers['link'];
            }

            if (!linkHeader) return res.status(400).json({ status: "error", message: "Scraper gagal menemboos sistem Pinterest (Data Kosong)." });

            let urls = [...linkHeader.matchAll(/<(.*?)>/gm)].map(a => a[1]);
            let validUrls = urls.filter(u => u.includes('pinimg.com') && (u.endsWith('.jpg') || u.endsWith('.png')));
            validUrls = [...new Set(validUrls)]; 

            if (validUrls.length === 0) return res.status(400).json({ status: "error", message: `Gambar tidak ditemukan untuk kata kunci: ${username}` });

            // Ambil maksimal 8 gambar agar grid di tampilan rapi
            return res.status(200).json({ status: "success", data: validUrls.slice(0, 8), query: username });
        } catch (error) {
            return res.status(500).json({ status: "error", message: "Pencarian Pinterest Error / Timeout." });
        }
    }

    // =======================================================
    // FITUR 5: CORE AI BARMODS ASSISTANT (POWERED BY GROQ)
    // =======================================================
    if (action === 'ai_chat') {
        if (!groqKey) return res.status(200).json({ status: "success", reply: "Bos, API Key Groq belum dipasang di Vercel (.env)." });
        try {
            const systemPrompt = "Kamu adalah AI Barmods, asisten pintar berbasis kecerdasan buatan untuk Barmods Tunnel VIP Data Center. Jawab dengan keren, ramah, logis, ringkas dan pro.";
            const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
                model: "llama-3.1-8b-instant", messages: [ { role: "system", content: systemPrompt }, { role: "user", content: username } ], temperature: 0.7
            }, { headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' }, timeout: 15000 });
            return res.status(200).json({ status: "success", reply: response.data.choices[0].message.content });
        } catch (error) { return res.status(500).json({ status: "error", message: `Koneksi ke Server Groq Gagal: ${error.message}` }); }
    }

    // =======================================================
    // FITUR 6: VPN PANEL DEPLOYMENT
    // =======================================================
    if (!domain || !auth) return res.status(500).json({ status: "error", message: "FATAL ERROR: Variabel .env (VPS_DOMAIN/AUTH) belum disetting!" });
    if (!adminPin) return res.status(500).json({ status: "error", message: "FATAL ERROR: Variabel .env (ADMIN_PIN) belum dibuat di Vercel!" });
    if (dev_pin !== adminPin) return res.status(403).json({ status: "error", message: "AKSES DITOLAK! Developer PIN salah." });
    if (!action || !protocol || !username) return res.status(400).json({ status: "error", message: "Data form tidak lengkap!" });

    let url = ''; let endpoint = '';
    try {
        if (action === 'create' || action === 'trial') {
            endpoint = `${action}${protocol}`; 
            if (protocol === 'ssh') url = `http://${domain}:5888/${endpoint}?user=${username}&password=${password}&exp=${exp}&iplimit=${iplimit}&auth=${auth}`;
            else url = `http://${domain}:5888/${endpoint}?user=${username}&exp=${exp}&quota=${quota}&iplimit=${iplimit}&auth=${auth}`;
        } else if (action === 'renew') {
            endpoint = `renew${protocol}`;
            if (protocol === 'ssh') url = `http://${domain}:5888/${endpoint}?user=${username}&exp=${exp}&iplimit=${iplimit}&auth=${auth}`;
            else url = `http://${domain}:5888/${endpoint}?user=${username}&exp=${exp}&quota=${quota}&iplimit=${iplimit}&auth=${auth}`;
        } else if (action === 'delete') { endpoint = `del${protocol}`; url = `http://${domain}:5888/${endpoint}?user=${username}&auth=${auth}`; }

        let response = await axios.get(url, { validateStatus: () => true, timeout: 15000 });
        if (action === 'delete' && response.status === 404) response = await axios.get(`http://${domain}:5888/delete${protocol}?user=${username}&auth=${auth}`, { validateStatus: () => true, timeout: 15000 });
        return res.status(200).json(response.data);
    } catch (error) { return res.status(500).json({ status: "error", message: `Server Down: ${error.message}` }); }
};
