# Miamo Content Service

**Port:** 3205  
**Role:** Feed, stories, videos, creativity hub  
**Tech:** Express 4.21, Prisma 5.22

---

## What It Does

The Content Service manages all user-generated content:

1. **Feed** — Timeline posts with likes, comments, sharing
2. **Stories** — Ephemeral 24h content with views and reactions
3. **Videos** — Short-form video content with engagement tracking
4. **Creativity** — Creative categories, items, trends, community features

This is the **largest service** with 27 endpoints.

## API Endpoints

### Feed (Social Timeline)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/feed` | Required | Get feed posts |
| `POST` | `/api/v1/feed` | Required | Create a post |
| `GET` | `/api/v1/feed/:id` | Required | Get single post |
| `PUT` | `/api/v1/feed/:id` | Required | Edit a post |
| `DELETE` | `/api/v1/feed/:id` | Required | Delete a post |
| `POST` | `/api/v1/feed/:id/react` | Required | React to a post |
| `GET` | `/api/v1/feed/:id/comments` | Required | Get post comments |
| `POST` | `/api/v1/feed/:id/comments` | Required | Add a comment |

### Stories (Ephemeral Content)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/stories` | Required | Get active stories |
| `POST` | `/api/v1/stories` | Required | Create a story |
| `GET` | `/api/v1/stories/:id` | Required | Get a story |
| `DELETE` | `/api/v1/stories/:id` | Required | Delete a story |
| `POST` | `/api/v1/stories/:id/view` | Required | Record a view |
| `POST` | `/api/v1/stories/:id/react` | Required | React to a story |
| `GET` | `/api/v1/stories/:id/viewers` | Required | See who viewed |

### Videos (Short-Form)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/videos` | Required | List videos |
| `POST` | `/api/v1/videos` | Required | Upload a video |
| `GET` | `/api/v1/videos/:id` | Required | Get a video |
| `DELETE` | `/api/v1/videos/:id` | Required | Delete a video |
| `POST` | `/api/v1/videos/:id/react` | Required | React to video |
| `GET` | `/api/v1/videos/:id/comments` | Required | Get video comments |
| `POST` | `/api/v1/videos/:id/comments` | Required | Add video comment |
| `POST` | `/api/v1/videos/:id/view` | Required | Record video view |

### Creativity Hub

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/creativity/categories` | Required | List creative categories |
| `GET` | `/api/v1/creativity` | Required | List creative items |
| `POST` | `/api/v1/creativity` | Required | Create creative item |
| `GET` | `/api/v1/creativity/:id` | Required | Get creative item |
| `POST` | `/api/v1/creativity/:id/react` | Required | React to item |
| `GET` | `/api/v1/creativity/:id/comments` | Required | Get item comments |
| `POST` | `/api/v1/creativity/:id/comments` | Required | Add item comment |
| `POST` | `/api/v1/creativity/:id/view` | Required | Record item view |
| `GET` | `/api/v1/creativity/trends` | Required | Get trending items |

## Feed System

### Post Object

```json
{
  "id": "uuid",
  "authorId": "uuid",
  "content": "Enjoying a beautiful sunset! 🌅",
  "mediaUrls": ["https://cdn.miamo.app/photos/abc.jpg"],
  "type": "photo",
  "reactions": { "❤️": 12, "🔥": 5, "😍": 3 },
  "commentCount": 8,
  "createdAt": "2026-05-02T...",
  "author": {
    "displayName": "Sarah",
    "profile": { "photos": [...] }
  }
}
```

### Feed Algorithm

```
1. Fetch posts from matched users + followed users
2. Sort by recency (newest first)
3. Boost posts from active matches
4. Include own posts
5. Paginate (default: 20 per page)
```

## Stories System

### Story Lifecycle

```
Create Story → Active (24 hours) → Automatically expires
                  ↓
         Views tracked per user
         Reactions tracked per user
         Viewers list visible to author
```

### Key Behaviors

- Stories are visible for **24 hours** from creation
- Each user can view a story once (tracked)
- Author can see who viewed their stories
- Stories appear in a horizontal carousel in the UI
- Expired stories are soft-deleted (kept for analytics)

## Videos System

### Video Features

- **Upload** — Videos stored with URL reference, thumbnail, duration metadata
- **View tracking** — Each view recorded with viewer ID
- **Reactions** — Emoji-based reactions (same system as feed)
- **Comments** — Threaded comments on videos
- **Feed integration** — Videos appear in the main feed

## Creativity Hub

### What It Is

A TikTok-style creative space where users share:
- Photo edits and filters
- Art and illustrations
- Music/audio creations
- Writing and poetry
- Date ideas and experiences

### Category System

```
GET /api/v1/creativity/categories
→ Returns: Photography, Art, Music, Writing, Date Ideas, Cooking, Travel, etc.
```

### Trending Algorithm

```
GET /api/v1/creativity/trends
                ↓
Score = (reactions × 2) + (comments × 3) + (views × 1)
        ───────────────────────────────────────────────
                    hours_since_posted
                ↓
Top 20 items returned, refreshed hourly
```

## Database Models Used

- **Post** — `id, authorId, content, mediaUrls, type (text/photo/video), isActive`
- **PostReaction** — `id, postId, userId, emoji`
- **Comment** — `id, postId/storyId/videoId, authorId, content, parentId (threading)`
- **Story** — `id, authorId, mediaUrl, type, expiresAt, isActive`
- **StoryView** — `id, storyId, viewerId, viewedAt`
- **StoryReaction** — `id, storyId, userId, emoji`
- **Video** — `id, authorId, url, thumbnailUrl, duration, title, description`
- **VideoView** — `id, videoId, viewerId, viewedAt`
- **VideoReaction** — `id, videoId, userId, emoji`
- **CreativeItem** — `id, authorId, categoryId, title, content, mediaUrls, viewCount`
- **CreativeCategory** — `id, name, description, icon`

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3205` | Service port |
| `DATABASE_URL` | — | PostgreSQL connection string |
| `INTERNAL_SERVICE_KEY` | dev key | Validates internal requests |

## Run Standalone

```bash
cd services/content
npm install
npx prisma generate
DATABASE_URL=postgresql://miamo:miamo@localhost:5432/miamo npx tsx src/server.ts
```

## Files

```
services/content/
├── src/server.ts      ← Routes, feed/stories/videos/creativity logic
├── package.json
├── tsconfig.json
├── Dockerfile
└── .dockerignore
```
