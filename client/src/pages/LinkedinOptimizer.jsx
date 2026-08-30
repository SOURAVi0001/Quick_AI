import { Linkedin, Sparkles, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import api from '../lib/api';
import { useAuth } from '@clerk/clerk-react';
import toast from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { CopyButton } from '../components/CopyButton';
import PageHeader from '../components/PageHeader';
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
    setFormData((prev) => ({ ...prev, [name]: value }));
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
      const payload = { ...formData, posts: posts.filter((p) => p.trim() !== '') };

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
      <div className="mb-6 border border-border/50 rounded-xl overflow-hidden bg-card">
        <div className="bg-muted/30 p-5 border-b border-border/50">
          <h3 className="font-semibold text-foreground mb-4">{title}</h3>

          <div className="mb-2">
            <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-3">
              Current
            </h4>
            <div className="bg-background/50 p-4 rounded-lg text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
              {original || <span className="italic">Not provided</span>}
            </div>
          </div>
        </div>

        <div className="p-5 bg-accent/5">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-[11px] font-bold text-accent uppercase tracking-widest flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> AI Recommendation
            </h4>
            <CopyButton text={recommended} className="h-8" />
          </div>
          <div className="bg-background p-4 rounded-lg text-sm text-foreground whitespace-pre-wrap leading-relaxed border border-border/30">
            {recommended}
          </div>

          {alternatives && alternatives.length > 0 && (
            <div className="mt-5 space-y-3">
              <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                Alternatives
              </h4>
              {alternatives.map((alt, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-center bg-background/50 p-4 rounded-lg border border-border/30"
                >
                  <div className="text-sm text-foreground/80 leading-relaxed">{alt}</div>
                  <CopyButton text={alt} className="ml-4 shrink-0 h-8" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const PostResultBlock = ({ original, analysis, recommended }) => {
    if (!recommended) return null;
    return (
      <div className="mb-6 border border-border/50 rounded-xl overflow-hidden bg-card">
        <div className="bg-muted/30 p-5 border-b border-border/50">
          <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-3">
            Original Post
          </h4>
          <div className="bg-background/50 p-4 rounded-lg text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed mb-4">
            {original}
          </div>
          {analysis && (
            <div className="text-sm text-foreground/70 italic border-l-2 border-accent pl-4 py-1">
              "{analysis}"
            </div>
          )}
        </div>
        <div className="p-5 bg-accent/5">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-[11px] font-bold text-accent uppercase tracking-widest flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Recommended Version
            </h4>
            <CopyButton text={recommended} className="h-8" />
          </div>
          <div className="bg-background p-4 rounded-lg text-sm text-foreground whitespace-pre-wrap leading-relaxed border border-border/30">
            {recommended}
          </div>
        </div>
      </div>
    );
  };

  const IdeaBlock = ({ title, topic, reason, suggestedPost }) => {
    return (
      <div className="mb-6 border border-border/50 rounded-xl p-5 bg-card">
        <h4 className="font-semibold text-foreground mb-2">{title}</h4>
        <div className="flex gap-2 mb-4">
          <span className="text-[11px] font-medium px-2.5 py-1 bg-muted/50 rounded text-muted-foreground">
            Topic: {topic}
          </span>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed mb-5">{reason}</p>

        <div className="bg-accent/5 border border-border/30 p-5 rounded-lg">
          <div className="flex justify-between items-center mb-3">
            <h5 className="text-[11px] font-bold text-accent uppercase tracking-widest">
              Suggested Post
            </h5>
            <CopyButton text={suggestedPost} className="h-8" />
          </div>
          <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
            {suggestedPost}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="pb-16 max-w-6xl mx-auto">
      <PageHeader
        icon={Linkedin}
        title="LinkedIn Optimizer"
        description="Optimize your profile and posts for your target role to increase visibility and recruiter outreach."
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
        {/* LEFT: FORM */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="sticky top-6">
            <CardHeader className="border-b border-border/50 pb-4">
              <CardTitle className="text-lg">Profile Information</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={onSubmitHandler} className="space-y-4">
                <div className="space-y-5 border-b border-border/50 pb-6">
                  <div className="space-y-2.5">
                    <label className="text-sm font-medium text-foreground">
                      Target Role <span className="text-destructive">*</span>
                    </label>
                    <Input
                      name="targetRole"
                      value={formData.targetRole}
                      onChange={handleInputChange}
                      placeholder="e.g., Senior Frontend Engineer"
                      required
                      className="bg-background border-border/50 focus-visible:ring-accent"
                    />
                  </div>
                  <div className="space-y-2.5">
                    <label className="text-sm font-medium text-foreground">
                      Optimization Goal <span className="text-destructive">*</span>
                    </label>
                    <Input
                      name="optimizationGoal"
                      value={formData.optimizationGoal}
                      onChange={handleInputChange}
                      placeholder="e.g., Get more recruiter messages"
                      required
                      className="bg-background border-border/50 focus-visible:ring-accent"
                    />
                  </div>
                  <div className="space-y-2.5">
                    <label className="text-sm font-medium text-foreground">
                      Current Headline <span className="text-destructive">*</span>
                    </label>
                    <Textarea
                      name="headline"
                      value={formData.headline}
                      onChange={handleInputChange}
                      placeholder="Your current LinkedIn headline"
                      required
                      className="bg-background border-border/50 focus-visible:ring-accent resize-none"
                      rows={2}
                    />
                  </div>
                </div>

                <div className="space-y-5 pt-4 pb-6 border-b border-border/50">
                  <h3 className="text-sm font-semibold text-foreground tracking-wide">
                    Optional Sections
                  </h3>

                  <div className="space-y-2.5">
                    <label className="text-sm font-medium text-muted-foreground">
                      About / Summary
                    </label>
                    <Textarea
                      name="about"
                      value={formData.about}
                      onChange={handleInputChange}
                      rows={3}
                      placeholder="Paste your current about section"
                      className="bg-background border-border/50 focus-visible:ring-accent resize-y"
                    />
                  </div>
                  <div className="space-y-2.5">
                    <label className="text-sm font-medium text-muted-foreground">Experience</label>
                    <Textarea
                      name="experience"
                      value={formData.experience}
                      onChange={handleInputChange}
                      rows={3}
                      placeholder="Paste your experience entries"
                      className="bg-background border-border/50 focus-visible:ring-accent resize-y"
                    />
                  </div>
                  <div className="space-y-2.5">
                    <label className="text-sm font-medium text-muted-foreground">Projects</label>
                    <Textarea
                      name="projects"
                      value={formData.projects}
                      onChange={handleInputChange}
                      rows={2}
                      placeholder="Paste key projects"
                      className="bg-background border-border/50 focus-visible:ring-accent resize-y"
                    />
                  </div>
                  <div className="space-y-2.5">
                    <label className="text-sm font-medium text-muted-foreground">Skills</label>
                    <Input
                      name="skills"
                      value={formData.skills}
                      onChange={handleInputChange}
                      placeholder="e.g., React, Node.js, AWS"
                      className="bg-background border-border/50 focus-visible:ring-accent"
                    />
                  </div>
                </div>

                <div className="space-y-5 pt-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground tracking-wide">
                        Recent Posts
                      </h3>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Add up to 10 recent posts for analysis
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {posts.length > 0 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={clearPosts}
                          className="h-8 text-xs"
                        >
                          Clear
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addPost}
                        disabled={posts.length >= 10}
                        className="h-8 gap-1.5 text-xs border-border/50"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Post
                      </Button>
                    </div>
                  </div>

                  {posts.length > 0 && (
                    <div className="space-y-3 mt-4">
                      {posts.map((post, idx) => (
                        <div key={idx} className="flex gap-3 items-start">
                          <span className="text-xs font-mono text-muted-foreground pt-3 w-4">
                            {idx + 1}.
                          </span>
                          <Textarea
                            value={post}
                            onChange={(e) => updatePost(idx, e.target.value)}
                            rows={2}
                            placeholder="Paste post content here..."
                            className="bg-background border-border/50 focus-visible:ring-accent resize-y"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removePost(idx)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-8 h-12 bg-accent text-accent-foreground hover:bg-accent/90 shadow-md shadow-accent/20"
                >
                  {loading ? (
                    <span className="w-5 h-5 rounded-full border-2 border-accent-foreground/30 border-t-accent-foreground animate-spin mr-2" />
                  ) : (
                    <Sparkles className="w-5 h-5 mr-2" />
                  )}
                  {loading ? 'Analyzing Profile...' : 'Analyze Profile'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT: RESULTS */}
        <div className="lg:col-span-7">
          {!results ? (
            <Card className="h-full border-dashed border-border/50 bg-transparent">
              <CardContent className="h-full flex flex-col items-center justify-center min-h-[400px] text-center p-8">
                <div className="w-16 h-16 bg-muted/30 rounded-full flex items-center justify-center mb-5 border border-border/50">
                  <Linkedin className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium text-foreground mb-2">Awaiting Analysis</h3>
                <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
                  Fill out your LinkedIn profile information on the left and click Analyze Profile
                  to get AI-powered recommendations ready to copy and paste.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Score & Summary */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-card border-border/50 overflow-hidden">
                  <div className="p-6 relative">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                      <Sparkles className="w-12 h-12" />
                    </div>
                    <p className="text-muted-foreground text-[11px] font-bold uppercase tracking-widest mb-2">
                      Overall Score
                    </p>
                    <div className="flex items-baseline gap-1">
                      <div className="text-4xl font-bold text-foreground">
                        {results.overallScore || 0}
                      </div>
                      <div className="text-sm font-medium text-muted-foreground">/100</div>
                    </div>
                  </div>
                </Card>
                <Card className="bg-card border-border/50 overflow-hidden">
                  <div className="p-6 relative">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                      <Target className="w-12 h-12" />
                    </div>
                    <p className="text-muted-foreground text-[11px] font-bold uppercase tracking-widest mb-2">
                      Role Alignment
                    </p>
                    <div className="flex items-baseline gap-1">
                      <div className="text-4xl font-bold text-foreground">
                        {results.roleAlignmentScore || 0}
                      </div>
                      <div className="text-sm font-medium text-muted-foreground">/100</div>
                    </div>
                  </div>
                </Card>
              </div>

              {results.summary && (
                <Card className="border-accent/20 bg-accent/5">
                  <CardContent className="p-6 text-sm text-foreground/90 leading-relaxed">
                    {results.summary}
                  </CardContent>
                </Card>
              )}

              <div className="space-y-4 pt-4">
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2 mb-6">
                  <Sparkles className="w-5 h-5 text-accent" />
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

                {results.experience &&
                  results.experience.map((exp, idx) => (
                    <ResultBlock
                      key={idx}
                      title={`Experience Entry ${idx + 1}`}
                      original={exp.current}
                      recommended={exp.recommended}
                    />
                  ))}

                {results.projects &&
                  results.projects.map((proj, idx) => (
                    <ResultBlock
                      key={idx}
                      title={`Project Entry ${idx + 1}`}
                      original={proj.current}
                      recommended={proj.recommended}
                    />
                  ))}

                {results.skills && (
                  <Card className="bg-card border-border/50">
                    <CardHeader className="border-b border-border/50 pb-4">
                      <CardTitle className="text-base font-semibold">Skills Optimization</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-6">
                      <div>
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                            Recommended Order
                          </h4>
                          <CopyButton
                            text={(results.skills.recommendedOrder || []).join(', ')}
                            className="h-8"
                          />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {results.skills.recommendedOrder &&
                            results.skills.recommendedOrder.map((s, i) => (
                              <span
                                key={i}
                                className="px-3 py-1 bg-accent/10 text-accent text-xs font-medium rounded-full border border-accent/20"
                              >
                                {s}
                              </span>
                            ))}
                        </div>
                      </div>

                      {results.skills.missingSkills && results.skills.missingSkills.length > 0 && (
                        <div>
                          <div className="flex justify-between items-center mb-3">
                            <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                              Missing Skills to Add
                            </h4>
                            <CopyButton
                              text={results.skills.missingSkills.join(', ')}
                              className="h-8"
                            />
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {results.skills.missingSkills.map((s, i) => (
                              <span
                                key={i}
                                className="px-3 py-1 bg-orange-500/10 text-orange-500 text-xs font-medium rounded-full border border-orange-500/20"
                              >
                                {s}
                              </span>
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
                  <h2 className="text-xl font-bold text-foreground flex items-center gap-2 mb-6">
                    <Sparkles className="w-5 h-5 text-accent" />
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
                    <h2 className="text-xl font-bold text-foreground flex items-center gap-2 mb-2">
                      <Sparkles className="w-5 h-5 text-accent" />
                      Content Ideas
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Future post ideas based on your profile and optimization goals.
                    </p>
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
        </div>
      </div>

      <HistorySection
        type="linkedin-optimizer"
        title="Optimization History"
        renderItem={(item, { handleCopy, format }) => {
          const content =
            typeof item.content === 'string' ? JSON.parse(item.content) : item.content;
          return (
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-sm font-medium text-foreground mb-1 line-clamp-1">
                    {item.prompt || 'Profile Optimization'}
                  </p>
                  <p className="text-xs text-muted-foreground">{format(item.created_at)}</p>
                </div>
                <div className="px-3 py-1 bg-accent/10 border border-accent/20 text-accent rounded-full text-xs font-bold">
                  {content.overallScore || 0}/100 Score
                </div>
              </div>
              <div className="bg-background/50 rounded-lg p-4 border border-border/30">
                <p className="text-sm text-foreground font-medium mb-2">
                  Target Role: {content.targetRole || 'Not specified'}
                </p>
                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                  {content.summary}
                </p>
              </div>
            </div>
          );
        }}
      />
    </div>
  );
};

export default LinkedinOptimizer;
