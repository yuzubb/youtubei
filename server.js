import express from 'express';
import { Innertube } from 'youtubei.js';

const app = express();
// 環境変数またはデフォルトのポートを使用
const port = process.env.PORT || 3000; 

/**
 * 動画IDから必要な情報を取得する関数
 * @param {string} videoId 
 */
async function getVideoDetails(videoId) {
  // youtubei.js クライアントの初期化
  const youtube = await Innertube.create();
  
  // 動画情報の取得
  const info = await youtube.getInfo(videoId); 

  // コメントの取得 (youtubei.jsのコメント機能を使用)
  // コメントは別途メソッドを呼び出す必要がある場合があります
  let comments = [];
  try {
    const commentsContainer = await info.getComments();
    const commentThreads = commentsContainer?.comments;
    
    if (commentThreads?.length > 0) {
      comments = commentThreads.slice(0, 5).map(comment => ({ // 最初の5件を取得
        author: comment.author?.name || 'Unknown',
        text: comment.content,
        publishedAt: comment.published_time
      }));
    }
  } catch (commentError) {
    console.warn('Could not fetch comments:', commentError.message);
    // コメントがオフになっている場合やAPIエラーの場合
  }
  
  // チャンネルアイコンのURLを抽出
  // 基本的なデフォルトのURLを取得を試みる
  const channelThumbnails = info.basic_details.channel?.thumbnails;
  const channelIconUrl = channelThumbnails?.find(t => t.id === 'default')?.url || 
                         channelThumbnails?.[0]?.url || 
                         null;

  // 取得したデータ構造から必要な情報を抽出して整形
  const details = {
    title: info.basic_details.title,
    description: info.basic_details.short_description || info.basic_details.description,
    viewCount: info.basic_details.view_count,
    // いいね数は "is_liked" などしか情報がない場合があり、正確な数値が取れない可能性がある
    // 'like_count' フィールドが利用可能であればそれを使用
    likeCount: info.basic_details.likes, 
    channelName: info.basic_details.channel?.name || 'Unknown Channel',
    channelId: info.basic_details.channel_id,
    channelIcon: channelIconUrl,
    
    // 関連動画は info.related_videos から取得
    relatedVideos: info.related_videos.slice(0, 5).map(v => ({ // 最初の5件を取得
      id: v.id,
      title: v.title.text,
      channelTitle: v.author?.name,
    })),
    
    comments: comments,
  };

  return details;
}

// 🌐 /get/:videoid エンドポイント
app.get('/get/:videoid', async (req, res) => {
  const videoId = req.params.videoid;
  
  if (!videoId) {
    return res.status(400).json({ error: 'Video ID is required' });
  }

  try {
    const result = await getVideoDetails(videoId);
    res.json(result);
  } catch (error) {
    console.error(`Error processing video ID ${videoId}:`, error.message);
    // youtubei.jsのエラーは動画が見つからない、またはAPI仕様変更など
    res.status(500).json({ 
      error: 'Failed to fetch video details', 
      details: error.message,
      note: 'This server uses a community-maintained unofficial API, which can break due to YouTube specification changes.'
    });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log(`Test endpoint: http://localhost:${port}/get/[YOUR_VIDEO_ID]`);
});
