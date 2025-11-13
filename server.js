import YouTube from 'youtubei.js'; 
import express from 'express';

const app = express();
// Renderは環境変数PORTを設定します
const PORT = process.env.PORT || 3000; 

// YouTubeインスタンスの初期化を、アプリの起動前に行う
let youtube;
(async () => {
    try {
        // YouTubeクラスのインスタンス化
        youtube = await new YouTube();
        console.log('✅ YouTube client initialized.');
    } catch (error) {
        console.error('❌ Failed to initialize YouTube client:', error);
    }
})();

// CORSエラーを避けるため、全オリジンからのアクセスを許可
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    next();
});

// ヘルスチェック用エンドポイント (Renderがサーバーの生存確認に使用)
app.get('/', (req, res) => {
    res.status(200).send('API Server is running!');
});


/**
 * GET /get/:videoid
 * 関連動画のリストを返します。
 */
app.get('/get/:videoid', async (req, res) => {
    const { videoid } = req.params;

    if (!youtube) {
        // 初期化が完了していない場合は503を返す
        return res.status(503).json({ error: 'Server not ready. YouTube client is still initializing.' });
    }

    if (!videoid || videoid.length !== 11) {
        return res.status(400).json({ error: 'Invalid Video ID format.' });
    }

    try {
        console.log(`Fetching related for video: ${videoid}`);
        
        // youtubei.jsで動画情報を取得
        const videoInfo = await youtube.getInfo(videoid);
        
        // 関連動画は 'related' プロパティにあるはずです
        const relatedVideos = videoInfo?.related || []; 

        res.json({
            video_id: videoid,
            related_videos_count: relatedVideos.length,
            related: relatedVideos
        });

    } catch (error) {
        console.error(`Error fetching related videos for ${videoid}:`, error);
        
        // YouTube APIから見つからないなどのエラーの場合は404を返す
        if (error.message.includes('No video found') || error.message.includes('404')) {
             return res.status(404).json({ error: 'Video not found or is private/deleted.' });
        }
        
        res.status(500).json({ 
            error: 'Failed to retrieve data from YouTube.', 
            details: error.message 
        });
    }
});

// サーバーの起動
app.listen(PORT, () => {
    console.log(`🚀 Server listening on port ${PORT}`);
});
