import { useState } from 'react';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent } from '../components/ui/card';
import { MessageSquare, SendHorizonal, Heart } from 'lucide-react';
import ToolShell from '../components/ToolShell';
import EmptyState from '../components/EmptyState';

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
    <ToolShell
      icon={MessageSquare}
      eyebrow="The Commons"
      title="Community"
      description="Share tips, ask questions, and show off what you have built. Your next breakthrough might come from a conversation."
      width="narrow"
    >
      <div className="space-y-10">
        <Card variant="panel" className="overflow-hidden">
          <div className="border-b border-border px-5 py-3.5 sm:px-6">
            <p className="text-eyebrow text-subtle-foreground">Start a thread</p>
          </div>
          <CardContent className="pt-5">
            <Textarea
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              placeholder="Got something to share? Drop it here..."
              rows={3}
              className="resize-none"
            />
            <div className="mt-4 flex justify-end">
              <Button onClick={handlePost} disabled={!newPost.trim()} size="sm">
                <SendHorizonal className="size-3.5" />
                Post
              </Button>
            </div>
          </CardContent>
        </Card>

        {posts.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="No posts yet"
            description="Be the first to share something with the community."
          />
        ) : (
          <div className="space-y-5">
            {posts.map((post, i) => (
              <Card
                key={post.id}
                variant="interactive"
                className="animate-reveal overflow-hidden"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <CardContent className="p-6">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="grid size-9 shrink-0 place-items-center rounded-full border border-primary/25 bg-primary/10 font-display text-sm text-primary">
                      {post.author[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{post.author}</p>
                      <p className="text-meta">{post.time}</p>
                    </div>
                  </div>
                  <p className="text-[15px] leading-relaxed text-foreground/90">{post.content}</p>
                  <div className="mt-4 flex items-center gap-5 border-t border-border pt-4 text-xs text-subtle-foreground">
                    <button className="flex items-center gap-1.5 transition-colors hover:text-primary">
                      <Heart className="size-3.5" /> {post.likes}
                    </button>
                    <button className="transition-colors hover:text-foreground">Reply</button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </ToolShell>
  );
};

export default Community;
