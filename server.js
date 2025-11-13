const express = require('express');
// 💡 修正箇所1: youtubei.jsのエクスポート全体を取得
const youtubei = require('youtubei.js');
// 💡 修正箇所2: 取得したオブジェクトからClientクラスを取り出す
const { Client } = youtubei; 
const app = express();
const PORT = process.env.PORT || 3000;

// 修正されたClientの初期化
const client = new Client(); 

app.use(express.json());

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*'); 
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

app.get('/get/:videoid', async (req, res) => {
    const videoId = req.params.videoid;

    try {
        const videoInfo = await client.getVideo(videoId);

        const formats = videoInfo.formats; 

        const encryptedFormats = formats.map(format => {
            let streamUrl = format.url;
            let cipherInfo = null;

            if (!streamUrl && format.signature_cipher) {
                cipherInfo = format.signature_cipher; 
            }

            return {
                quality: format.quality_label || 'unknown',
                mimeType: format.mime_type,
                url: streamUrl, 
                encryptedSignature: format.signature_cipher ? 'REQUIRED_DECRYPTION' : null, 
                rawCipherInfo: cipherInfo 
            };
        });
        
        res.status(200).json({
            videoId: videoId,
            title: videoInfo.title,
            warning: "The 'url' may be encrypted. Signature decryption logic is missing.",
            formats: encryptedFormats
        });

    } catch (error) {
        res.status(500).json({ 
            error: 'Failed to fetch video stream information using youtubei.js.',
            detail: error.message 
        });
    }
});

app.get('/', (req, res) => {
    res.send('API is running. Use /get/:videoid.');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
