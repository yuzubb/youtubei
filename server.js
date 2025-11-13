const express = require('express');
const youtubei = require('youtubei.js');
const app = express();
const PORT = process.env.PORT || 3000;

// 💡 修正箇所: Clientコンストラクタを確実に取得。
// youtubei.js v7系では、requireの結果がそのままClientクラスであることが多いです。
const Client = youtubei.Client || youtubei; 

// ClientがFunction（コンストラクタ）として取得できていない場合は致命的なエラー
if (typeof Client !== 'function') {
    console.error("Critical Error: The imported 'youtubei.js' object is not a valid constructor.");
    process.exit(1); 
}

const client = new Client(); 

// 🚨 重要なチェック: Clientインスタンスに getVideo メソッドが存在するか確認
if (typeof client.getVideo !== 'function') {
    console.error("Critical Error: The Client instance does not have a 'getVideo' method. This means the wrong object was instantiated. Please ensure your youtubei.js version is correct.");
    process.exit(1);
}

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
        const videoInfo = await client.getVideo(videoId); // client.getVideo が実行される

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
