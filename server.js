const express = require('express');
const youtubei = require('youtubei.js');

// 💡 修正箇所: youtubei.jsのデフォルトエクスポートからClientクラスを取得
// Node.js (CommonJS) 環境でESMライブラリを扱うための最も確実な方法の一つ
const Client = youtubei.default || youtubei.Client; 

// ClientがFunction（コンストラクタ）として取得できているか最終確認
if (typeof Client !== 'function') {
    // 取得できなかった場合は、フォールバックとしてパッケージ全体から探すなどするが、
    // ここでは最も確実な Client = youtubei.default に固定します。
    // エラーが続く場合は、Client=youtubei.Client を試してください。
    
    // 念のため、Clientがclassとして取得できない場合の最終手段として、以前のコードを使用します
    // (ただし、これはデバッグ用です)
    const YoutubeIClient = youtubei.Client || youtubei.default; 
    
    if (typeof YoutubeIClient !== 'function' || !/^\s*class\s+/.test(YoutubeIClient.toString())) {
        console.error("Critical Error: Cannot find the Client constructor in youtubei.js export.");
        process.exit(1); 
    }
}

const app = express();
const PORT = process.env.PORT || 3000;

// Clientのインスタンス化
// Client = youtubei.default が成功することを期待
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
