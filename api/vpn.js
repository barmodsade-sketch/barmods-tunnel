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
    // FITUR 2: TO-FIGURE AI (UBAH FOTO JADI BONEKA/3D) 🤖🖼️
    // =======================================================
    if (action === 'tofigure') {
        if (!btcKey) return res.status(200).json({ status: "error", message: "⚠️ VARIABEL `BOTCAHX_APIKEY` BELUM DITAMBAHKAN DI VERCEL!" });
        
        try {
            let targetUrl = req.body.imageUrl;
            const imageBase64 = req.body.imageBase64;
            const version = req.body.version || 'v1';

            // Tahap 1: Jika User Upload Foto dari Galeri (Base64), kita bypass upload ke Telegraph
            if (imageBase64) {
                const buffer = Buffer.from(imageBase64.replace(/^data:image\/\w+;base64,/, ""), 'base64');
                const boundary = '----BarmodsFormBoundaryVIP';
                const payload = Buffer.concat([
                    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="image.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`),
                    buffer,
                    Buffer.from(`\r\n--${boundary}--\r\n`)
                ]);

                const upRes = await axios.post('https://telegra.ph/upload', payload, {
                    headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}`, 'Content-Length': payload.length }
                });
                if (!upRes.data || !upRes.data[0] || !upRes.data[0].src) throw new Error("Upload ke server sementara gagal.");
                targetUrl = 'https://telegra.ph' + upRes.data[0].src;
            }

            if (!targetUrl) return res.status(400).json({ status: "error", message: "Foto / URL tidak valid!" });

            // Tahap 2: Tentukan Engine Versi ToFigure
            let endpoint = '/api/maker/tofigure';
            if (version === 'v2') endpoint = '/api/maker/tofigure-v2';
            else if (version === 'v3') endpoint = '/api/maker/tofigure-v3';

            const apiUrl = `https://api.botcahx.eu.org${endpoint}?url=${targetUrl}&apikey=${btcKey}`;
            
            // Tahap 3: Tarik Gambar dari API Botcahx
            let btcRes = await axios.get(apiUrl, { responseType: 'arraybuffer', timeout: 60000 });
            const contentType = btcRes.headers['content-type'];
            
            if (!contentType || !contentType.includes('image')) {
                const jsonError = JSON.parse(Buffer.from(btcRes.data).toString('utf-8'));
                return res.status(400).json({ status: "error", message: jsonError.message || jsonError.error || "Gagal memproses AI Gambar. Mungkin wajah tidak terdeteksi." });
            }

            // Tahap 4: Convert hasil kembali ke Base64 agar web Frontend bisa menampilkannya
            const finalBase64 = Buffer.from(btcRes.data).toString('base64');
            return res.status(200).json({ status: "success", data: `data:${contentType};base64,${finalBase64}` });

        } catch (error) {
            return res.status(500).json({ status: "error", message: `AI ToFigure Error: ${error.message}` });
        }
    }

    // =======================================================
    // FITUR 3: SOSMED DOWNLOADER (TIKTOK & YOUTUBE URL) 📥
    // =======================================================
    if (action === 'tiktok' || action === 'youtube') {
        if (!btcKey) return res.status(200).json({ status: "error", message: "⚠️ APIKEY BOTCAHX BELUM DISYNC!" });
        try {
            let endpoint = action === 'youtube' ? '/api/dowloader/yt' : '/api/dowloader/tiktok';
            let response = await axios.get(`https://api.botcahx.eu.org${endpoint}?url=${encodeURIComponent(username)}&apikey=${btcKey}`, { timeout: 20000 });
            if (!response.data || response.data.status === false) return res.status(400).json({ status: "error", message: response.data?.message || "Gagal mengambil data." });
            return res.status(200).json({ status: "success", data: response.data.result });
        } catch (error) { return res.status(500).json({ status: "error", message: "Koneksi ke API Gagal/Timeout." }); }
    }

    // =======================================================
    // FITUR 4: YOUTUBE PLAY VIP (PENCARIAN JUDUL LAGU) 🎵
    // =======================================================
    if (action === 'yt_play') {
        if (!btcKey) return res.status(200).json({ status: "error", message: "⚠️ APIKEY BOTCAHX KOSONG!" });
        try {
            let searchRes = await axios.get(`https://api.botcahx.eu.org/api/search/yts?query=${encodeURIComponent(username)}&apikey=${btcKey}`, { timeout: 15000 });
            if (!searchRes.data || !searchRes.data.result || searchRes.data.result.length === 0) return res.status(400).json({ status: "error", message: "Lagu tidak ditemukan." });
            let video = searchRes.data.result[0];
            let dlRes = await axios.get(`https://api.botcahx.eu.org/api/dowloader/yt?url=${encodeURIComponent(video.url)}&apikey=${btcKey}`, { timeout: 25000 });
            if (!dlRes.data || dlRes.data.status === false) return res.status(400).json({ status: "error", message: "Gagal mengekstrak audio." });
            return res.status(200).json({ status: "success", data: { type: 'yt_play', title: video.title || dlRes.data.result.title, thumbnail: video.image || video.thumbnail || dlRes.data.result.thumb, duration: video.timestamp || video.duration || "-", views: video.views || "-", url: video.url, audio: dlRes.data.result.mp3 || dlRes.data.result.audio || dlRes.data.result.url_audio || dlRes.data.result.url } });
        } catch (error) { return res.status(500).json({ status: "error", message: "Pencarian lagu gagal." }); }
    }

    // =======================================================
    // FITUR 5: PINTEREST SEARCH (DIRECT SCRAPER VIP) 🖼️⚡
    // =======================================================
    if (action === 'pinterest') {
        try {
            let queryData = JSON.stringify({ options: { query: encodeURIComponent(username) } });
            let scrapeUrl = "https://www.pinterest.com/resource/BaseSearchResource/get/?data=" + encodeURIComponent(queryData);
            let resPinterest = await axios.head(scrapeUrl, { headers: { "screen-dpr": "4", "x-pinterest-pws-handler": "www/search/[scope].js" }, validateStatus: () => true });
            let linkHeader = resPinterest.headers.link || resPinterest.headers['link'];
            if (!linkHeader) {
                resPinterest = await axios.get(scrapeUrl, { headers: { "screen-dpr": "4", "x-pinterest-pws-handler": "www/search/[scope].js" }, validateStatus: () => true });
                linkHeader = resPinterest.headers.link || resPinterest.headers['link'];
            }
            if (!linkHeader) return res.status(400).json({ status: "error", message: "Data Kosong." });
            let urls = [...linkHeader.matchAll(/<(.*?)>/gm)].map(a => a[1]);
            let validUrls = [...new Set(urls.filter(u => u.includes('pinimg.com') && (u.endsWith('.jpg') || u.endsWith('.png'))))]; 
            if (validUrls.length === 0) return res.status(400).json({ status: "error", message: "Gambar tidak ditemukan." });
            return res.status(200).json({ status: "success", data: validUrls.slice(0, 8), query: username });
        } catch (error) { return res.status(500).json({ status: "error", message: "Pinterest Error." }); }
    }

    // =======================================================
    // FITUR 6: CORE AI BARMODS ASSISTANT
    // =======================================================
    if (action === 'ai_chat') {
        if (!groqKey) return res.status(200).json({ status: "success", reply: "API Key Groq Kosong." });
        try {
            const systemPrompt = "Kamu adalah AI Barmods VIP Data Center. Jawab dengan logis, ringkas dan pro.";
            const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', { model: "llama-3.1-8b-instant", messages: [ { role: "system", content: systemPrompt }, { role: "user", content: username } ], temperature: 0.7 }, { headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' }, timeout: 15000 });
            return res.status(200).json({ status: "success", reply: response.data.choices[0].message.content });
        } catch (error) { return res.status(500).json({ status: "error", message: "Koneksi Groq Gagal." }); }
    }

    // =======================================================
    // FITUR 7: VPN PANEL DEPLOYMENT
    // =======================================================
    if (!domain || !auth || !adminPin) return res.status(500).json({ status: "error", message: "FATAL ERROR: Variabel .env belum lengkap!" });
    if (dev_pin !== adminPin) return res.status(403).json({ status: "error", message: "AKSES DITOLAK! Developer PIN salah." });
    if (!action || !protocol || !username) return res.status(400).json({ status: "error", message: "Data tidak lengkap!" });

    let url = ''; let endpoint = '';
    try {
        if (action === 'create' || action === 'trial') { endpoint = `${action}${protocol}`; url = `http://${domain}:5888/${endpoint}?user=${username}&exp=${exp}&iplimit=${iplimit}&auth=${auth}` + (protocol === 'ssh' ? `&password=${password}` : `&quota=${quota}`); } 
        else if (action === 'renew') { endpoint = `renew${protocol}`; url = `http://${domain}:5888/${endpoint}?user=${username}&exp=${exp}&iplimit=${iplimit}&auth=${auth}` + (protocol !== 'ssh' ? `&quota=${quota}` : ''); } 
        else if (action === 'delete') { endpoint = `del${protocol}`; url = `http://${domain}:5888/${endpoint}?user=${username}&auth=${auth}`; }

        let response = await axios.get(url, { validateStatus: () => true, timeout: 15000 });
        if (action === 'delete' && response.status === 404) response = await axios.get(`http://${domain}:5888/delete${protocol}?user=${username}&auth=${auth}`, { validateStatus: () => true, timeout: 15000 });
        return res.status(200).json(response.data);
    } catch (error) { return res.status(500).json({ status: "error", message: `Server Down: ${error.message}` }); }
};
