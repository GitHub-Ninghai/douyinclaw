# 视频分析器 (Video Analyzer)

## 描述
分析抖音视频内容，生成评论或总结。

## 触发条件
- 关键词: ["分析视频", "视频总结", "生成评论"]
- 意图: content_analysis
- 事件: 收到分享的视频时触发

## 依赖工具
- `screenshot`: 视频截图
- `web_search`: 搜索相关信息
- `vision_analyze`: 视觉分析

## 工作流程

### Step 1: 获取视频信息
```
动作: 提取视频 URL 和基本信息
输出:
  - video_url
  - video_title
  - author
  - likes
  - comments
```

### Step 2: 视频内容分析
```
动作: 多帧截图分析
工具: screenshot(frames=[1s, 3s, 5s, 10s])
工具: vision_analyze(任务="分析视频内容")
输出:
  - video_type: 搞笑/知识/美食/旅游/...
  - key_elements: []
  - sentiment: 积极/中性/消极
  - summary: 内容摘要
```

### Step 3: 生成评论 (可选)
```
动作: 根据分析生成评论
规则:
  - 评论要相关、真诚
  - 适当使用 emoji
  - 长度: 10-50 字
```

## 评论风格

### 搞笑类视频
```
"哈哈哈哈笑不活了 😂"
"这也太逗了吧！"
"每天的快乐源泉 🤣"
```

### 知识类视频
```
"学到了！感谢分享 📚"
"涨知识了~"
"这个解释太清晰了！"
```

### 美食类视频
```
"看着就好吃！饿了 🤤"
"做法看起来很简单！"
"周末试试~"
```

### 旅游类视频
```
"好美啊！在哪里？"
"下次也要去！"
"风景太赞了 🏔️"
```

## 配置选项

```yaml
video_analyzer:
  enabled: true
  auto_comment: false      # 是否自动评论
  analyze_frames: 4        # 分析帧数
  max_comments_per_day: 10 # 每日最大评论数

  comment_style: friendly
  use_emoji: true
```
