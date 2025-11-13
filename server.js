const express = require('express');
const { Innertube } = require('youtubei.js'); // ライブラリのインポート

const app = express();
const port = 3000;

app.get('/get/:videoid', async (req, res) => {
  const videoId = req.params.videoid;

  try {
    // Innertubeクライアントを初期化
    const youtube = await Innertube.create();

    // 動画情報の取得
    const info = await youtube.getInfo(videoId); 

    // 取得したデータ構造から必要な情報を抽出
    const result = {
      title: info.basic_details.title,
      description: info.basic_details.short_description,
      viewCount: info.basic_details.view_count,
      likeCount: info.basic_details.likes, // 좋아요 수는 APIで取得できるか確認が必要
      channelName: info.basic_details.channel.name,
      channelId: info.basic_details.channel_id,
      // channelIconはinfo.basic_details.channel.thumbnailsから取得
      channelIcon: info.basic_details.channel.thumbnails.find(t => t.id === 'default')?.url, 

      // 関連動画はinfo.related_videosから取得
      relatedVideos: info.related_videos.slice(0, 5).map(v => ({
        id: v.id,
        title: v.title.text
      })),

      // コメントはinfo.getComments() メソッドなどで取得
      // 非同期操作が必要な場合があるため、実装を確認してください
      comments: [] // ここにコメント取得ロジックを追加
    };

    res.json(result);

  } catch (error) {
    console.error('Error with youtubei.js:', error.message);
    return res.status(500).json({ error: 'Failed to fetch video details using youtubei.js', details: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
