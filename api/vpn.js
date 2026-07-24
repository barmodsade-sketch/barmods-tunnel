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
    // FITUR 3: CEK KUOTA (BENDITH & KMSP DOUBLE ENGINE) 📶
    // =======================================================
    if (action === 'cekkuota') {
        if (!username) return res.status(400).json({ status: "error", message: "Nomor tidak boleh kosong!" });

        function normalizeNumber(input) {
            let s = String(input).trim().replace(/[\s().\-]/g, "");
            if (s.startsWith("+")) s = s.slice(1);
            if (/^0\d+$/i.test(s)) s = "62" + s.slice(1);
            else if (/^8\d+$/i.test(s)) s = "62" + s;
            if (s.length < 10 || s.length > 15) return null;
            return s;
        }

        const msisdn = normalizeNumber(username);
        if (!msisdn) return res.status(400).json({ status: "error", message: "Format nomor tidak valid!" });

        function parseSize(sizeStr) {
            if (!sizeStr || typeof sizeStr !== "string") return 0;
            const cleanStr = sizeStr.replace(/,/g, "").trim();
            const match = cleanStr.match(/^([\d.]+)\s*(GB|MB|KB|TB)?/i);
            if (!match) return 0;
            const value = parseFloat(match[1]);
            const unit = (match[2] || "MB").toUpperCase();
            switch (unit) {
                case "TB": return value * 1024 ** 4; case "GB": return value * 1024 ** 3;
                case "MB": return value * 1024 ** 2; case "KB": return value * 1024;
                default: return value;
            }
        }

        function progressBar(remaining, total) {
            try {
                if (!total || total === 0) return "▫▫▫▫▫▫▫▫▫▫";
                const pct = Math.max(0, Math.min(1, remaining / total));
                const filled = Math.round(pct * 10);
                return "▓".repeat(filled) + "░".repeat(10 - filled) + ` ${(pct * 100).toFixed(0)}%`;
            } catch { return "▫▫▫▫▫▫▫▫▫▫"; }
        }

        try {
            // TAHAP 1: API BENDITH
            let bendSuccess = false; let bendData = null;
            try {
                const bendRes = await axios.get(`https://bendith.my.id/end.php?check=package&number=${msisdn}&version=2`, { timeout: 15000 });
                if (bendRes.data && bendRes.data.success && bendRes.data.data && bendRes.data.data.subs_info) { bendSuccess = true; bendData = bendRes.data; }
            } catch (e) {}

            let htmlOut = `<div class="text-[#00ff41]">════════════════════════════════════════════════\n        [ 📡 CEK KUOTA CELLULAR ]\n════════════════════════════════════════════════\n\n`;

            if (bendSuccess) {
                const info = bendData.data.subs_info || {};
                const pkgs = bendData.data.package_info?.packages || [];
                
                htmlOut += `📱 <b>Nomor</b>      : ${msisdn}\n`;
                htmlOut += `💳 <b>Operator</b>   : ${info.operator || "XL/Axis"}\n`;
                htmlOut += `📶 <b>Jaringan</b>   : ${info.net_type || "-"}\n`;
                htmlOut += `📅 <b>Masa Aktif</b> : ${info.exp_date || "-"}\n`;
                htmlOut += `⚠️ <b>Tenggang</b>   : ${info.grace_until || "-"}\n`;
                htmlOut += `⏳ <b>Umur Kartu</b> : ${info.tenure || "-"}\n\n`;

                if (pkgs.length === 0) { htmlOut += `❌ <i>Tidak ada info paket.</i>\n`; } 
                else {
                    htmlOut += `<b>📊 DETAIL PAKET:</b>\n`;
                    for (const p of pkgs) {
                        htmlOut += `\n📦 <b>${p.name || "-"}</b>\n<i>Exp: ${p.expiry || "-"}</i>\n`;
                        const quotas = p.quotas || [];
                        for (const q of quotas) {
                            const totalBytes = parseSize(q.total); const remainBytes = parseSize(q.remaining);
                            let bar = ""; if (totalBytes && remainBytes) bar = progressBar(remainBytes, totalBytes);
                            
                            htmlOut += `  • <b>${q.name || "-"}</b>\n`;
                            htmlOut += `    ${q.remaining || "-"} / ${q.total || "-"}\n`;
                            if (bar) htmlOut += `    <span class="text-cyan-400">[${bar}]</span>\n`;
                            else if (q.percent != null) htmlOut += `    ⏳ ${q.percent}%\n`;
                        }
                    }
                }
                htmlOut += `\n════════════════════════════════════════════════\n[OK] SOURCE: BENDITH API</div>`;
                return res.status(200).json({ status: "success", data: htmlOut });
            }

            // TAHAP 2: FALLBACK API KMSP
            const kmspRes = await axios.get("https://apigw.kmsp-store.com/sidompul/v4/cek_kuota", {
                params: { msisdn, isJSON: true },
                headers: { Authorization: "Basic c2lkb21wdWxhcGk6YXBpZ3drbXNw", "X-API-Key": "60ef29aa-a648-4668-90ae-20951ef90c55", "X-App-Version": "4.0.0" },
                timeout: 20000
            });

            if (!kmspRes.data || !kmspRes.data.status) return res.status(400).json({ status: "error", message: "Gagal cek kuota atau nomor tidak ditemukan (KMSP & Bendith Down)." });

            const resData = kmspRes.data; const sp = resData.data?.data_sp || {};
            
            htmlOut += `📱 <b>Nomor</b>      : ${msisdn}\n`;
            htmlOut += `💳 <b>Operator</b>   : ${sp.prefix?.value || "-"}\n`;
            htmlOut += `📶 <b>Status 4G</b>  : ${sp.status_4g?.value || "-"}\n`;
            htmlOut += `📅 <b>Umur Kartu</b> : ${sp.active_card?.value || "-"}\n`;
            htmlOut += `⏰ <b>Masa Aktif</b> : ${sp.active_period?.value || "-"}\n`;
            htmlOut += `⚠️ <b>Tenggang</b>   : ${sp.grace_period?.value || "-"}\n\n`;

            if (resData.data?.hasil) {
                const raw = String(resData.data.hasil).replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/=+/g, "");
                const sections = raw.split(/(?=🎁 Quota:|🎁 Benefit:)/g);
                htmlOut += `<b>📊 DETAIL KUOTA:</b>\n`;
                for (const sec of sections) {
                    const lines = sec.split(/\r?\n/).map(v => v.trim()).filter(Boolean);
                    let name = "", total = "", sisa = "", exp = "";
                    for (const ln of lines) {
                        if (ln.includes("🎁 Quota:") || ln.includes("🎁 Benefit:")) name = ln.replace(/🎁 (Quota|Benefit):\s*/, "");
                        if (ln.includes("🎁 Kuota:")) total = ln.replace(/🎁 Kuota:\s*/, "");
                        if (ln.includes("🌲 Sisa Kuota:")) sisa = ln.replace(/🌲 Sisa Kuota:\s*/, "");
                        if (ln.includes("🍂 Aktif Hingga:")) exp = ln.replace(/🍂 Aktif Hingga:\s*/, "");
                    }
                    if (!name) continue;
                    const totalBytes = parseSize(total); const sisaBytes = parseSize(sisa);
                    htmlOut += `\n📦 <b>${name}</b>\n`;
                    if (exp) htmlOut += `<i>Exp: ${exp}</i>\n`;
                    if (total && sisa) {
                        const bar = progressBar(sisaBytes, totalBytes);
                        htmlOut += `  • <b>Kuota:</b> ${sisa} / ${total}\n  • <span class="text-cyan-400">[${bar}]</span>\n`;
                    } else if (total) { htmlOut += `  • <b>Kuota:</b> ${total}\n`; }
                }
            } else { htmlOut += `❌ <i>Tidak ada info kuota.</i>\n`; }
            
            htmlOut += `\n════════════════════════════════════════════════\n[OK] SOURCE: KMSP API</div>`;
            return res.status(200).json({ status: "success", data: htmlOut });

        } catch (error) { return res.status(500).json({ status: "error", message: `Sistem Error: ${error.message}` }); }
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
                return res.status(400).json({ status: "error", message: `SSWeb Gagal. Web target mungkin down. Balasan: ${textResponse.substring(0, 50)}...` });
            }
            const finalBase64 = Buffer.from(btcRes.data).toString('base64');
            return res.status(200).json({ status: "success", data: `data:${contentType};base64,${finalBase64}`, device, url: targetUrl });
        } catch (error) { return res.status(500).json({ status: "error", message: `SSWeb Error: ${error.message}` }); }
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
