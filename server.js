// index.js

import express from 'express';
import { YouTube } from 'youtubei.js';

const app = express();
// Renderの環境変数からポートを取得するか、デフォルトで3000を使用
const PORT = process.env.PORT || 3000; 

// YouTubeインスタンスの初期化
// 'youtubei.js'は非同期で初期化される可能性があるため、IIFEを使用
let youtube;
(async () => {
    try {
        youtube = await new YouTube({
            // オプションがあれば追加
        });
        console.log('YouTube client initialized.');
    } catch (error) {
        console.error('Failed to initialize YouTube client:', error);
    }
})();


/**
 * GET /get/:videoid
 * 関連動画のリストを返します。
 */
app.get('/get/:videoid', async (req, res) => {
    const { videoid } = req.params;

    if (!youtube) {
        return res.status(503).json({ error: 'Server not ready. YouTube client is still initializing.' });
    }

    if (!videoid) {
        return res.status(400).json({ error: 'Video ID is required.' });
    }

    try {
        console.log(`Fetching related for video: ${videoid}`);
        
        // 関連動画を取得するためのロジック
        // youtubei.jsのメソッドはバージョンによって異なる場合があるため、
        // 公式ドキュメント(e.g., youtube.getRelated, youtube.getInfo)を参照してください。
        
        // 例: 動画情報全体を取得し、その中の関連動画セクションを利用
        const videoInfo = await youtube.getInfo(videoid);
        
        // 'videoInfo.related' や 'videoInfo.data.contents' などの場所に関連動画のリストがあるはずです。
        // ライブラリのバージョンによって構造が異なるため、適切なパスを確認してください。
        const relatedVideos = videoInfo?.related; // 関連動画セクションを抽出する例

        if (!relatedVideos) {
             return res.status(404).json({ error: 'Related videos not found or API structure changed.' });
        }
        
        // 取得したデータをクライアントに返します
        res.json({
            video_id: videoid,
            related_videos_count: relatedVideos.length,
            related: relatedVideos
        });

    } catch (error) {
        console.error(`Error fetching related videos for ${videoid}:`, error);
        res.status(500).json({ 
            error: 'Failed to retrieve related videos from YouTube.', 
            details: error.message 
        });
    }
});

// サーバーの起動
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Access endpoint: http://localhost:${PORT}/get/dQw4w9WgXcQ (Example)`);
});
