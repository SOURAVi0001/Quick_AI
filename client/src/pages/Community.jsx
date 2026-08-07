import { useState } from 'react';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Sparkles, MessageSquare, SendHorizonal } from 'lucide-react';

const Community = () => {
  const [posts, setPosts] = useState([
    { id: 1, author: 'You', content: 'Just discovered the blog title generator — it is seriously good. Anyone else tried it?', likes: 3, time: '2h ago' },
    { id: 2, author: 'Priya K.', content: 'The image generator saved me hours of design work for my newsletter. Huge time-saver.', likes: 7, time: '5h ago' },
    { id: 3, author: 'Jordan M.', content: 'Feature request: could we get a tone customiser for the article writer? Loving it so far.', likes: 12, time: '1d ago' },
  ]);
  const [newPost, setNewPost] = useState('');

  const handlePost = () => {
    if (!newPost.trim()) return;
    setPosts([
      {
        id: Date.now(),
        author: 'You',
        content: newPost,
        likes: 0,
        time: 'Just now',
      },
      ...posts,
    ]);
    setNewPost('');
  };

  return (
    <div className="min-h-screen bg-background dot-grid bg-noise">
      <div className="max-w-4xl mx-auto px-6 sm:px-10 py-12">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Community</span>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Community
        </h1>
        <p className="mt-2 text-muted-foreground max-w-lg">
          Share tips, ask questions, and show off what you have built. Your next breakthrough
          might come from a conversation.
        </p>

        <div className="mt-10 space-y-6">
          <div className="p-5 rounded-2xl border border-border/50 bg-foreground/[0.02]">
            <Textarea
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              placeholder="Got something to share? Drop it here..."
              rows={3}
              className="w-full bg-transparent border-0 text-foreground placeholder:text-muted-foreground/50 resize-none focus-visible:ring-0 px-0"
            />
            <div className="flex justify-end mt-3">
              <Button
                onClick={handlePost}
                disabled={!newPost.trim()}
                className="h-9 px-4 bg-foreground text-background hover:bg-foreground/90 text-xs"
              >
                <SendHorizonal className="w-3.5 h-3.5 mr-1.5" />
                Post
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            {posts.map((post) => (
              <Card
                key={post.id}
                className="border-border/40 bg-foreground/[0.015] shadow-card"
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-foreground/10 flex items-center justify-center text-[10px] font-medium text-muted-foreground">
                        {post.author[0]}
                      </div>
                      <span className="text-xs font-medium text-foreground/70">
                        {post.author}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{post.time}</span>
                    </div>
                  </div>
                  <p className="text-sm text-foreground/80 leading-relaxed">{post.content}</p>
                  <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                    <button className="hover:text-foreground transition-colors">
                      ♥ {post.likes}
                    </button>
                    <button className="hover:text-foreground transition-colors">Reply</button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Community;
