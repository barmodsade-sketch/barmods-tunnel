const axios = require('axios');
const crypto = require('crypto');

module.exports = async (req, res) => {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const { action, protocol, username, password, exp, quota, iplimit, dev_pin } = req.body;

    const domain = process.env.VPS_DOMAIN;
    const auth = process.env.VPS_AUTH;
    const adminPin = process.env.ADMIN_PIN; 
    const groqKey = process.env.GROQ_API_KEY; 
    const btcKey = process.env.BOTCAHX_APIKEY; 

    // =======================================================
    // FITUR 1: REAL-TIME SERVER MONITORING
    // =======================================================
    if (action === 'server_stats') {
        try {
            if (!domain) throw new Error("Domain VPS belum disetting.");
            let response = await axios.get(`http://${domain}:5889/stats`, { timeout: 5000 });
            return res.status(200).json({ status: "success", data: response.data });
        } catch (error) { return res.status(500).json({ status: "error", message: "Gagal terhubung ke sensor VPS." }); }
    }

    // =======================================================
    // FITUR 2: MULTI-CLOUD UPLOADER 🚀
    // =======================================================
    if (action === 'tourl') {
        try {
            const { fileBase64, fileName, mimeType } = req.body;
            if (!fileBase64) return res.status(400).json({ status: "error", message: "File kosong!" });
            const buffer = Buffer.from(fileBase64.replace(/^data:.*?;base64,/, ""), 'base64');
            if (buffer.length > 4 * 1024 * 1024) return res.status(400).json({ status: "error", message: "Ukuran file melebihi batas (Maksimal 4 MB)!" });

            const REAL_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
            const randomHex = crypto.randomBytes(5).toString("hex");
            const buildMultipart = (fields, fileField, fName) => {
                const boundary = '----BarmodsFormBoundary' + randomHex; let data = [];
                for (let [key, value] of Object.entries(fields)) { data.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`)); }
                data.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${fileField}"; filename="${fName}"\r\nContent-Type: ${mimeType}\r\n\r\n`)); data.push(buffer); data.push(Buffer.from(`\r\n--${boundary}--\r\n`));
                return { payload: Buffer.concat(data), headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}`, 'User-Agent': REAL_UA } };
            };

            const uploadYupra = async () => { let form = buildMultipart({}, 'files', fileName); let { data } = await axios.post('https://cdn.yupra.my.id/upload', form.payload, { headers: form.headers, timeout: 15000 }); if (!data.success) throw new Error(); return `https://cdn.yupra.my.id${data.files[0].url}`; };
            const uploadCatbox = async () => { let form = buildMultipart({ reqtype: 'fileupload' }, 'fileToUpload', fileName); let { data } = await axios.post('https://catbox.moe/user/api.php', form.payload, { headers: form.headers, timeout: 15000 }); return data; };
            const uploadQuax = async () => { let form = buildMultipart({ expiry: '-1' }, 'files[]', fileName); let { data } = await axios.post('https://qu.ax/upload.php', form.payload, { headers: form.headers, timeout: 15000 }); return data.files[0].url; };
            const uploadPomf2 = async () => { let form = buildMultipart({}, 'files[]', `${randomHex}_${fileName}`); let { data } = await axios.post('https://pomf2.lain.la/upload.php', form.payload, { headers: form.headers, timeout: 15000 }); return data.files[0].url; };
            const uploadGoFile = async () => { let form = buildMultipart({}, 'file', fileName); let { data } = await axios.post('https://upload.gofile.io/uploadFile', form.payload, { headers: form.headers, timeout: 15000 }); return `https://${data.data.servers[0]}.gofile.io/download/web/${data.data.parentFolder}/${data.data.name}`; };
            const uploadFadzzz = async () => { let form = buildMultipart({}, 'file', fileName); let { data } = await axios.post('https://fadzzzcloud.my.id/upload', form.payload, { headers: form.headers, timeout: 15000 }); return data.url; };

            const results = await Promise.allSettled([ uploadYupra(), uploadCatbox(), uploadQuax(), uploadPomf2(), uploadGoFile(), uploadFadzzz() ]);
            const finalData = results.map(r => ({ status: r.status === 'fulfilled' ? 'success' : 'failed', url: r.status === 'fulfilled' ? r.value : null }));
            return res.status(200).json({ status: "success", data: finalData });
        } catch (error) { return res.status(500).json({ status: "error", message: `Uploader Gagal: ${error.message}` }); }
    }

    // =======================================================
    // FITUR 3: TO-FIGURE AI
    // =======================================================
    if (action === 'tofigure') {
        if (!btcKey) return res.status(200).json({ status: "error", message: "⚠️ VARIABEL `BOTCAHX_APIKEY` BELUM DITAMBAHKAN!" });
        try {
            let targetUrl = req.body.imageUrl; const imageBase64 = req.body.imageBase64; const version = req.body.version || 'v1';
            if (imageBase64) {
                const buffer = Buffer.from(imageBase64.replace(/^data:image\/\w+;base64,/, ""), 'base64');
                const boundary = '----BarmodsFormBoundaryVIP';
                try {
                    const payloadTmp = Buffer.concat([ Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="image.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`), buffer, Buffer.from(`\r\n--${boundary}--\r\n`) ]);
                    const upRes = await axios.post('https://tmpfiles.org/api/v1/upload', payloadTmp, { headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` }, validateStatus: () => true });
                    if (upRes.data?.data?.url) targetUrl = upRes.data.data.url.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
                } catch (e) {}
                if (!targetUrl) {
                    try {
                        const payloadCatbox = Buffer.concat([ Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="reqtype"\r\n\r\nfileupload\r\n`), Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="fileToUpload"; filename="image.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`), buffer, Buffer.from(`\r\n--${boundary}--\r\n`) ]);
                        const catRes = await axios.post('https://catbox.moe/user/api.php', payloadCatbox, { headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` }, validateStatus: () => true });
                        if (typeof catRes.data === 'string' && catRes.data.startsWith('http')) targetUrl = catRes.data.trim();
                    } catch (e) {}
                }
                if (!targetUrl) throw new Error("Semua server uploader sementara diblokir.");
            }
            if (!targetUrl) return res.status(400).json({ status: "error", message: "Foto / URL tidak valid!" });

            let endpoint = version === 'v2' ? '/api/maker/tofigure-v2' : version === 'v3' ? '/api/maker/tofigure-v3' : '/api/maker/tofigure';
            const apiUrl = `https://api.botcahx.eu.org${endpoint}?url=${encodeURIComponent(targetUrl)}&apikey=${btcKey}`;
            
            let btcRes = await axios.get(apiUrl, { responseType: 'arraybuffer', timeout: 60000, validateStatus: () => true });
            const contentType = btcRes.headers['content-type'] || '';
            
            if (contentType.includes('application/json') || !contentType.includes('image')) {
                const textResponse = Buffer.from(btcRes.data).toString('utf-8'); let jsonResponse;
                try { jsonResponse = JSON.parse(textResponse); } catch(e) { return res.status(400).json({ status: "error", message: `Server API Botcahx Down: ${textResponse.substring(0, 50)}` }); }
                if (jsonResponse.status && jsonResponse.result) {
                    let finalUrl = jsonResponse.result.url || jsonResponse.result; let imgDownload = await axios.get(finalUrl, { responseType: 'arraybuffer' });
                    return res.status(200).json({ status: "success", data: `data:${imgDownload.headers['content-type']};base64,${Buffer.from(imgDownload.data).toString('base64')}` });
                }
                return res.status(400).json({ status: "error", message: jsonResponse.message || jsonResponse.error || "Ditolak API Botcahx. Pastikan ada wajah di foto!" });
            }
            return res.status(200).json({ status: "success", data: `data:${contentType};base64,${Buffer.from(btcRes.data).toString('base64')}` });
        } catch (error) { return res.status(500).json({ status: "error", message: `Gagal: ${error.message}` }); }
    }

    // =======================================================
    // FITUR 4: WEBSITE SCREENSHOT (SSWEB) 📸
    // =======================================================
    if (action === 'ssweb') {
        if (!btcKey) return res.status(200).json({ status: "error", message: "⚠️ APIKEY BOTCAHX KOSONG!" });
        try {
            let targetUrl = username.trim();
            if (!/^https?:\/\//i.test(targetUrl)) targetUrl = 'https://' + targetUrl;
            const device = req.body.device || 'desktop';
            const width = device === 'desktop' ? 1920 : 390;
            const height = device === 'desktop' ? 1080 : 844;

            const apiUrl = `https://api.botcahx.eu.org/api/tools/ssweb?url=${encodeURIComponent(targetUrl)}&device=${device}&width=${width}&height=${height}&apikey=${btcKey}`;
            
            let btcRes = await axios.get(apiUrl, { responseType: 'arraybuffer', timeout: 35000, validateStatus: () => true });
            const contentType = btcRes.headers['content-type'] || '';
            
            if (!contentType.includes('image')) {
                const textResponse = Buffer.from(btcRes.data).toString('utf-8');
                return res.status(400).json({ status: "error", message: `SSWeb Gagal. Web target mungkin down/memblokir bot. Balasan: ${textResponse.substring(0, 50)}...` });
            }

            const finalBase64 = Buffer.from(btcRes.data).toString('base64');
            return res.status(200).json({ status: "success", data: `data:${contentType};base64,${finalBase64}`, device, url: targetUrl });
        } catch (error) {
            return res.status(500).json({ status: "error", message: `SSWeb Error: ${error.message}` });
        }
    }

    // =======================================================
    // FITUR 5: SOSMED DOWNLOADER, YT PLAY & PINTEREST
    // =======================================================
    if (action === 'tiktok' || action === 'youtube' || action === 'yt_play' || action === 'pinterest') {
        if (!btcKey) return res.status(200).json({ status: "error", message: "⚠️ APIKEY BOTCAHX BELUM DISYNC!" });
        try {
            if (action === 'pinterest') {
                let queryData = JSON.stringify({ options: { query: encodeURIComponent(username) } }); let scrapeUrl = "https://www.pinterest.com/resource/BaseSearchResource/get/?data=" + encodeURIComponent(queryData);
                let resPinterest = await axios.head(scrapeUrl, { headers: { "screen-dpr": "4", "x-pinterest-pws-handler": "www/search/[scope].js" }, validateStatus: () => true }); let linkHeader = resPinterest.headers.link || resPinterest.headers['link'];
                if (!linkHeader) { resPinterest = await axios.get(scrapeUrl, { headers: { "screen-dpr": "4", "x-pinterest-pws-handler": "www/search/[scope].js" }, validateStatus: () => true }); linkHeader = resPinterest.headers.link || resPinterest.headers['link']; }
                if (!linkHeader) return res.status(400).json({ status: "error", message: "Data Kosong." });
                let urls = [...linkHeader.matchAll(/<(.*?)>/gm)].map(a => a[1]); let validUrls = [...new Set(urls.filter(u => u.includes('pinimg.com') && (u.endsWith('.jpg') || u.endsWith('.png'))))]; 
                if (validUrls.length === 0) return res.status(400).json({ status: "error", message: "Gambar tidak ditemukan." }); return res.status(200).json({ status: "success", data: validUrls.slice(0, 8), query: username });
            }
            if (action === 'yt_play') {
                let searchRes = await axios.get(`https://api.botcahx.eu.org/api/search/yts?query=${encodeURIComponent(username)}&apikey=${btcKey}`, { timeout: 15000 });
                if (!searchRes.data || !searchRes.data.result || searchRes.data.result.length === 0) return res.status(400).json({ status: "error", message: "Lagu tidak ditemukan." });
                let video = searchRes.data.result[0]; let dlRes = await axios.get(`https://api.botcahx.eu.org/api/dowloader/yt?url=${encodeURIComponent(video.url)}&apikey=${btcKey}`, { timeout: 25000 });
                if (!dlRes.data || dlRes.data.status === false) return res.status(400).json({ status: "error", message: "Gagal mengekstrak audio." });
                return res.status(200).json({ status: "success", data: { type: 'yt_play', title: video.title || dlRes.data.result.title, thumbnail: video.image || video.thumbnail || dlRes.data.result.thumb, duration: video.timestamp || video.duration || "-", views: video.views || "-", url: video.url, audio: dlRes.data.result.mp3 || dlRes.data.result.audio || dlRes.data.result.url_audio || dlRes.data.result.url } });
            }
            let endpoint = action === 'youtube' ? '/api/dowloader/yt' : '/api/dowloader/tiktok';
            let response = await axios.get(`https://api.botcahx.eu.org${endpoint}?url=${encodeURIComponent(username)}&apikey=${btcKey}`, { timeout: 20000 });
            if (!response.data || response.data.status === false) return res.status(400).json({ status: "error", message: response.data?.message || "Gagal mengambil data." });
            return res.status(200).json({ status: "success", data: response.data.result });
        } catch (error) { return res.status(500).json({ status: "error", message: "Pencarian Gagal / Timeout." }); }
    }

    // =======================================================
    // FITUR 6: CORE AI BARMODS ASSISTANT
    // =======================================================
    if (action === 'ai_chat') {
        if (!groqKey) return res.status(200).json({ status: "success", reply: "API Key Groq Kosong." });
        try {
            const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', { model: "llama-3.1-8b-instant", messages: [ { role: "system", content: "Kamu adalah AI Barmods VIP Data Center. Jawab dengan logis, ringkas dan pro." }, { role: "user", content: username } ], temperature: 0.7 }, { headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' }, timeout: 15000 });
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
