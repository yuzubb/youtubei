const express = require('express');
const youtubei = require('youtubei.js');
const app = express();
const PORT = process.env.PORT || 3000;

// =========================================================
// 💡 修正箇所: Clientコンストラクタを確実に取得するロジック
// =========================================================
let Client = youtubei.Client || youtubei; 

// もし上記で取得できず、かつ youtubei.default がコンストラクタならそれを Client として使用する
if (typeof Client !== 'function' && youtubei.default && typeof youtubei.default === 'function') {
    Client = youtubei.default;
}

// ClientがFunction（コンストラクタ）として取得できていない場合は致命的なエラー
if (typeof Client !== 'function') {
    console.error("Critical Error: The imported 'youtubei.js' object is not a valid constructor. Please check the library's documentation for the correct import method.");
    process.exit(1); 
}
// =========================================================

const client = new Client(); 

// 🚨 重要なチェック: Clientインスタンスに getWatch メソッドが存在するか確認
if (typeof client.getWatch !== 'function') {
    console.error("Critical Error: The Client instance does not have a 'getWatch' method. Please check your youtubei.js version.");
    process.exit(1);
}

app.use(express.json());

// CORS設定
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*'); 
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// 📌 修正後のエンドポイント: 関連動画を取得する
app.get('/get/:videoid', async (req, res) => {
    const videoId = req.params.videoid;

    try {
        // 1. getWatch() を使用して視聴ページ全体のデータを取得
        // 関連動画はこのデータに含まれています
        const watchPage = await client.getWatch(videoId); 

        // 2. 関連動画のデータを抽出
        // youtubei.js のバージョンによって、このパスは異なる場合があります。
        const relatedVideos = watchPage.secondary_results.results || [];

        // 3. 必要な情報に整形する
        const simplifiedRelatedVideos = relatedVideos
            // フィルタリング: リスト内で動画として認識できるアイテムのみを対象とする
            .filter(item => item.constructor.name === 'Video') 
            .map(video => ({
                videoId: video.id,
                title: video.title.text,
                author: video.author.name,
                // duration: video.duration.text, // 必要に応じて追加
                // viewCount: video.view_count.text, // 必要に応じて追加
                isLive: video.is_live,
            }));
        
        res.status(200).json({
            videoId: videoId,
            videoTitle: watchPage.video_details.title,
            relatedVideosCount: simplifiedRelatedVideos.length,
            relatedVideos: simplifiedRelatedVideos
        });

    } catch (error) {
        // 関連動画の取得に失敗した場合
        res.status(500).json({ 
            error: 'Failed to fetch related videos using youtubei.js.',
            detail: error.message,
            note: "The internal structure of YouTube's response may have changed. Check the 'secondary_results' path."
        });
    }
});

// ルートパス
app.get('/', (req, res) => {
    res.send('API is running. Use /get/:videoid to fetch related videos.');
});

// サーバー起動
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
