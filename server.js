const express = require('express');
const youtubei = require('youtubei.js');

// 💡 最終修正箇所: Clientを確実に取得するためのロジック
// パッケージの構造が Client, { Client }, または default.Client のいずれであっても対応を試みる
const Client = youtubei.Client || youtubei.default?.Client || youtubei;

// TypeError: Client is not a constructor を避けるため、Classであることを確認
if (typeof Client !== 'function' || !/^\s*class\s+/.test(Client.toString())) {
    console.error("Error: Could not find Client class in youtubei.js export. Check the package version.");
    process.exit(1); 
}

const app = express();
const PORT = process.env.PORT || 3000;

// Clientの初期化
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
