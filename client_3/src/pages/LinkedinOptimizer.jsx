import { Linkedin, Sparkles, Plus, Trash2, Target } from 'lucide-react';
import { useState } from 'react';
import api from '../lib/api';
import { useAuth } from '@clerk/clerk-react';
import toast from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { CopyButton } from '../components/CopyButton';
import ToolShell, { ResultRegion } from '../components/ToolShell';
import EmptyState from '../components/EmptyState';
import HistorySection from '../components/HistorySection';

const LinkedinOptimizer = () => {
  const [formData, setFormData] = useState({
    targetRole: '',
    optimizationGoal: '',
    headline: '',
    about: '',
    experience: '',
    projects: '',
    skills: '',
    education: '',
    achievements: '',
  });
  const [posts, setPosts] = useState([]);

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const { getToken } = useAuth();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const addPost = () => {
    if (posts.length < 10) {
      setPosts([...posts, '']);
    } else {
      toast.error('You can only add up to 10 posts');
    }
  };

  const updatePost = (index, value) => {
    const newPosts = [...posts];
    newPosts[index] = value;
    setPosts(newPosts);
  };

  const removePost = (index) => {
    const newPosts = [...posts];
    newPosts.splice(index, 1);
    setPosts(newPosts);
  };

  const clearPosts = () => {
    setPosts([]);
  };

  const onSubmitHandler = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const payload = { ...formData, posts: posts.filter(p => p.trim() !== '') };

      const { data } = await api.post('/api/ai/linkedin/analyze', payload, {
        headers: { Authorization: `Bearer ${await getToken()}` },
      });

      if (data.success) {
        setResults(data.content);
        toast.success('Analysis complete!');
      } else {
        toast.error(data.message || 'Failed to analyze profile');
      }
    } catch (error) {
      toast.error(error.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const ResultBlock = ({ title, original, recommended, alternatives }) => {
    if (!recommended) return null;

    return (
      <Card className="mb-6 overflow-hidden">
        <div className="border-b border-border bg-surface-2 p-5">
          <h3 className="text-h3 mb-4 min-w-0 break-words text-foreground">{title}</h3>

          <div className="mb-2">
            <h4 className="text-eyebrow mb-3 text-subtle-foreground">Current</h4>
            <div className="min-w-0 rounded-md bg-surface-1 p-4 text-sm leading-relaxed whitespace-pre-wrap break-words text-muted-foreground">
              {original || <span className="italic">Not provided</span>}
            </div>
          </div>
        </div>

        <div className="bg-primary/5 p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h4 className="text-eyebrow flex items-center gap-1.5 text-primary">
              <Sparkles className="size-3.5" /> AI Recommendation
            </h4>
            <CopyButton text={recommended} className="h-8" />
          </div>
          <div className="min-w-0 rounded-md border border-border bg-card p-4 text-sm leading-relaxed whitespace-pre-wrap break-words text-foreground">
            {recommended}
          </div>

          {alternatives && alternatives.length > 0 && (
            <div className="mt-5 space-y-3">
              <h4 className="text-eyebrow text-subtle-foreground">Alternatives</h4>
              {alternatives.map((alt, idx) => (
                <div key={idx} className="flex items-center justify-between gap-4 rounded-md border border-border bg-surface-1 p-4">
                  <div className="min-w-0 break-words text-sm leading-relaxed text-foreground/80">{alt}</div>
                  <CopyButton text={alt} className="h-8 shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    );
  };

  const PostResultBlock = ({ original, analysis, recommended }) => {
    if (!recommended) return null;
    return (
      <Card className="mb-6 overflow-hidden">
        <div className="border-b border-border bg-surface-2 p-5">
          <h4 className="text-eyebrow mb-3 text-subtle-foreground">Original Post</h4>
          <div className="mb-4 min-w-0 rounded-md bg-surface-1 p-4 text-sm leading-relaxed whitespace-pre-wrap break-words text-muted-foreground">
            {original}
          </div>
          {analysis && (
            <div className="min-w-0 border-l-2 border-primary py-1 pl-4 text-sm break-words text-foreground/70 italic">
              "{analysis}"
            </div>
          )}
        </div>
        <div className="bg-primary/5 p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h4 className="text-eyebrow flex items-center gap-1.5 text-primary">
              <Sparkles className="size-3.5" /> Recommended Version
            </h4>
            <CopyButton text={recommended} className="h-8" />
          </div>
          <div className="min-w-0 rounded-md border border-border bg-card p-4 text-sm leading-relaxed whitespace-pre-wrap break-words text-foreground">
            {recommended}
          </div>
        </div>
      </Card>
    );
  };

  const IdeaBlock = ({ title, topic, reason, suggestedPost }) => {
    return (
      <Card className="mb-6 p-5">
        <h4 className="text-h3 mb-2 min-w-0 break-words text-foreground">{title}</h4>
        <div className="mb-4 flex gap-2">
          <Badge variant="neutral">Topic: {topic}</Badge>
        </div>
        <p className="mb-5 min-w-0 break-words text-sm leading-relaxed text-muted-foreground">{reason}</p>

        <div className="rounded-md border border-border bg-primary/5 p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h5 className="text-eyebrow text-primary">Suggested Post</h5>
            <CopyButton text={suggestedPost} className="h-8" />
          </div>
          <div className="min-w-0 break-words text-sm leading-relaxed whitespace-pre-wrap text-foreground">
            {suggestedPost}
          </div>
        </div>
      </Card>
    );
  };

  return (
    <ToolShell
      icon={Linkedin}
      title="LinkedIn Optimizer"
      description="Optimize your profile and posts for your target role to increase visibility and recruiter outreach."
      width="wide"
    >
      <div className="mb-12 grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* LEFT: FORM */}
        <div className="min-w-0 space-y-6 lg:col-span-5">
          <Card className="lg:sticky lg:top-6">
            <CardHeader className="border-b border-border pb-4">
              <CardTitle>Profile Information</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={onSubmitHandler} className="space-y-4">
                <div className="space-y-5 border-b border-border pb-6">
                  <div className="space-y-2.5">
                    <label className="text-sm font-medium text-foreground">Target Role <span className="text-destructive">*</span></label>
                    <Input name="targetRole" value={formData.targetRole} onChange={handleInputChange} placeholder="e.g., Senior Frontend Engineer" required />
                  </div>
                  <div className="space-y-2.5">
                    <label className="text-sm font-medium text-foreground">Optimization Goal <span className="text-destructive">*</span></label>
                    <Input name="optimizationGoal" value={formData.optimizationGoal} onChange={handleInputChange} placeholder="e.g., Get more recruiter messages" required />
                  </div>
                  <div className="space-y-2.5">
                    <label className="text-sm font-medium text-foreground">Current Headline <span className="text-destructive">*</span></label>
                    <Textarea name="headline" value={formData.headline} onChange={handleInputChange} placeholder="Your current LinkedIn headline" required className="resize-none" rows={2} />
                  </div>
                </div>

                <div className="space-y-5 border-b border-border pt-4 pb-6">
                  <h3 className="text-sm font-semibold tracking-wide text-foreground">Optional Sections</h3>

                  <div className="space-y-2.5">
                    <label className="text-sm font-medium text-muted-foreground">About / Summary</label>
                    <Textarea name="about" value={formData.about} onChange={handleInputChange} rows={3} placeholder="Paste your current about section" className="resize-y" />
                  </div>
                  <div className="space-y-2.5">
                    <label className="text-sm font-medium text-muted-foreground">Experience</label>
                    <Textarea name="experience" value={formData.experience} onChange={handleInputChange} rows={3} placeholder="Paste your experience entries" className="resize-y" />
                  </div>
                  <div className="space-y-2.5">
                    <label className="text-sm font-medium text-muted-foreground">Projects</label>
                    <Textarea name="projects" value={formData.projects} onChange={handleInputChange} rows={2} placeholder="Paste key projects" className="resize-y" />
                  </div>
                  <div className="space-y-2.5">
                    <label className="text-sm font-medium text-muted-foreground">Skills</label>
                    <Input name="skills" value={formData.skills} onChange={handleInputChange} placeholder="e.g., React, Node.js, AWS" />
                  </div>
                </div>

                <div className="space-y-5 pt-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold tracking-wide text-foreground">Recent Posts</h3>
                      <p className="mt-1 text-xs text-subtle-foreground">Add up to 10 recent posts for analysis</p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      {posts.length > 0 && (
                        <Button type="button" variant="ghost" size="sm" onClick={clearPosts} className="h-8 text-xs">Clear</Button>
                      )}
                      <Button type="button" variant="outline" size="sm" onClick={addPost} disabled={posts.length >= 10} className="h-8 gap-1.5 text-xs">
                        <Plus className="size-3.5" /> Add Post
                      </Button>
                    </div>
                  </div>

                  {posts.length > 0 && (
                    <div className="mt-4 space-y-3">
                      {posts.map((post, idx) => (
                        <div key={idx} className="flex items-start gap-3">
                          <span className="w-4 pt-3 font-mono text-xs text-subtle-foreground">{idx + 1}.</span>
                          <Textarea
                            value={post}
                            onChange={(e) => updatePost(idx, e.target.value)}
                            rows={2}
                            placeholder="Paste post content here..."
                            className="resize-y"
                          />
                          <Button type="button" variant="ghost" size="icon" onClick={() => removePost(idx)} aria-label={`Remove post ${idx + 1}`} className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive">
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Button type="submit" loading={loading} className="mt-8 h-12 w-full">
                  {!loading && <Sparkles className="size-5" />}
                  {loading ? 'Analyzing Profile...' : 'Analyze Profile'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT: RESULTS */}
        <div className="min-w-0 lg:col-span-7">
          <ResultRegion label="LinkedIn profile analysis">
            {!results ? (
              <EmptyState
                icon={Linkedin}
                title="Awaiting Analysis"
                description="Fill out your LinkedIn profile information on the left and click Analyze Profile to get AI-powered recommendations ready to copy and paste."
                className="min-h-[400px]"
              />
            ) : (
              <div className="animate-rise space-y-8">

                {/* Score & Summary */}
                <div className="grid grid-cols-2 gap-4">
                  <Card className="relative overflow-hidden p-6">
                    <div className="absolute top-0 right-0 p-4 text-primary opacity-10">
                      <Sparkles className="size-12" />
                    </div>
                    <p className="text-eyebrow mb-2 text-subtle-foreground">Overall Score</p>
                    <div className="flex items-baseline gap-1">
                      <div className="text-3xl font-bold text-foreground">{results.overallScore || 0}</div>
                      <div className="text-sm font-medium text-muted-foreground">/100</div>
                    </div>
                  </Card>
                  <Card className="relative overflow-hidden p-6">
                    <div className="absolute top-0 right-0 p-4 text-primary opacity-10">
                      <Target className="size-12" />
                    </div>
                    <p className="text-eyebrow mb-2 text-subtle-foreground">Role Alignment</p>
                    <div className="flex items-baseline gap-1">
                      <div className="text-3xl font-bold text-foreground">{results.roleAlignmentScore || 0}</div>
                      <div className="text-sm font-medium text-muted-foreground">/100</div>
                    </div>
                  </Card>
                </div>

                {results.summary && (
                  <Card variant="result">
                    <CardContent className="min-w-0 p-6 pt-6 text-sm leading-relaxed break-words text-foreground/90">
                      {results.summary}
                    </CardContent>
                  </Card>
                )}

                <div className="space-y-4 pt-4">
                  <h2 className="text-h2 mb-6 flex items-center gap-2 text-foreground">
                    <Sparkles className="size-5 text-primary" />
                    Profile Optimizations
                  </h2>

                  {results.headline && (
                    <ResultBlock
                      title="Headline"
                      original={results.headline.current}
                      recommended={results.headline.recommended}
                      alternatives={results.headline.alternatives}
                    />
                  )}

                  {results.about && (
                    <ResultBlock
                      title="About / Summary"
                      original={results.about.current}
                      recommended={results.about.recommended}
                    />
                  )}

                  {results.experience && results.experience.map((exp, idx) => (
                    <ResultBlock
                      key={idx}
                      title={`Experience Entry ${idx + 1}`}
                      original={exp.current}
                      recommended={exp.recommended}
                    />
                  ))}

                  {results.projects && results.projects.map((proj, idx) => (
                    <ResultBlock
                      key={idx}
                      title={`Project Entry ${idx + 1}`}
                      original={proj.current}
                      recommended={proj.recommended}
                    />
                  ))}

                  {results.skills && (
                    <Card>
                      <CardHeader className="border-b border-border pb-4">
                        <CardTitle className="text-base">Skills Optimization</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-6 pt-6">
                        <div>
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <h4 className="text-eyebrow text-subtle-foreground">Recommended Order</h4>
                            <CopyButton text={(results.skills.recommendedOrder || []).join(', ')} className="h-8" />
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {results.skills.recommendedOrder && results.skills.recommendedOrder.map((s, i) => (
                              <Badge key={i} variant="accent">{s}</Badge>
                            ))}
                          </div>
                        </div>

                        {results.skills.missingSkills && results.skills.missingSkills.length > 0 && (
                          <div>
                            <div className="mb-3 flex items-center justify-between gap-3">
                              <h4 className="text-eyebrow text-subtle-foreground">Missing Skills to Add</h4>
                              <CopyButton text={results.skills.missingSkills.join(', ')} className="h-8" />
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {results.skills.missingSkills.map((s, i) => (
                                <Badge key={i} variant="warning">{s}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </div>

                {results.posts && results.posts.length > 0 && (
                  <div className="space-y-4 pt-8">
                    <h2 className="text-h2 mb-6 flex items-center gap-2 text-foreground">
                      <Sparkles className="size-5 text-primary" />
                      Post Improvements
                    </h2>
                    {results.posts.map((post, idx) => (
                      <PostResultBlock
                        key={idx}
                        original={post.original}
                        analysis={post.analysis}
                        recommended={post.recommended}
                      />
                    ))}
                  </div>
                )}

                {results.postIdeas && results.postIdeas.length > 0 && (
                  <div className="space-y-4 pt-8">
                    <div className="mb-6">
                      <h2 className="text-h2 mb-2 flex items-center gap-2 text-foreground">
                        <Sparkles className="size-5 text-primary" />
                        Content Ideas
                      </h2>
                      <p className="text-sm text-muted-foreground">Future post ideas based on your profile and optimization goals.</p>
                    </div>
                    {results.postIdeas.map((idea, idx) => (
                      <IdeaBlock
                        key={idx}
                        title={idea.title}
                        topic={idea.topic}
                        reason={idea.reason}
                        suggestedPost={idea.suggestedPost}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </ResultRegion>
        </div>
      </div>

      <HistorySection
        type="linkedin-optimizer"
        title="Optimization History"
        renderItem={(item, { handleCopy, format }) => {
          const content = typeof item.content === 'string' ? JSON.parse(item.content) : item.content;
          return (
            <div className="p-6">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="mb-1 line-clamp-1 text-sm font-medium text-foreground">
                    {item.prompt || 'Profile Optimization'}
                  </p>
                  <p className="text-xs text-subtle-foreground">{format(item.created_at)}</p>
                </div>
                <Badge variant="accent" className="shrink-0">{content.overallScore || 0}/100 Score</Badge>
              </div>
              <div className="min-w-0 rounded-md border border-border bg-surface-1 p-4">
                <p className="mb-2 min-w-0 break-words text-sm font-medium text-foreground">Target Role: {content.targetRole || 'Not specified'}</p>
                <p className="line-clamp-2 min-w-0 break-words text-xs leading-relaxed text-muted-foreground">
                  {content.summary}
                </p>
              </div>
            </div>
          );
        }}
      />
    </ToolShell>
  );
};

export default LinkedinOptimizer;
