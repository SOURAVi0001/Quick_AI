import { Mail, Send, Copy, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import api from '../lib/api';
import { useAuth } from '@clerk/clerk-react';
import toast from 'react-hot-toast';
import Markdown from 'react-markdown';
import DemoBanner from '../components/DemoBanner';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import PageHeader from '../components/PageHeader';
import HistorySection from '../components/HistorySection';

const emailTones = [
  { tone: 'Professional', text: 'Professional & Formal' },
  { tone: 'Friendly', text: 'Friendly & Casual' },
  { tone: 'Persuasive', text: 'Persuasive & Sales' },
  { tone: 'Urgent', text: 'Urgent & Important' },
];

const WriteEmail = () => {
  const [selectedTone, setSelectedTone] = useState(emailTones[0]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState('');
  const [isDemo, setIsDemo] = useState(false);
  const { getToken } = useAuth();
  const [copied, setCopied] = useState(false);

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const onSubmitHandler = async (e) => {
    e.preventDefault();
    if (!input) return;
    try {
      setLoading(true);
      const prompt = `Write an email about ${input} in a ${selectedTone.tone} tone`;
      const { data } = await api.post(
        '/api/ai/generate-email',
        { prompt, tone: selectedTone.tone },
        { headers: { Authorization: `Bearer ${await getToken()}` } },
      );
      if (data.success) {
        setContent(data.content);
        setIsDemo(!!data.demo);
      } else {
        toast.error(data.message || 'Something went wrong');
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pb-16 max-w-4xl mx-auto">
      <PageHeader 
        icon={Mail} 
        title="Write Email" 
        description="Generate professional, friendly, or persuasive emails instantly. Just provide a short topic and we'll handle the phrasing." 
      />

      <Card className="mb-12">
        <CardContent className="p-6 sm:p-8">
          <form onSubmit={onSubmitHandler} className="space-y-8">
            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground">What do you want to email about?</label>
              <Input
                onChange={(e) => setInput(e.target.value)}
                value={input}
                placeholder="Requesting time off next week..."
                required
                className="bg-background border-border/50 h-12 text-base focus-visible:ring-accent"
              />
            </div>
            
            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground">Select tone</label>
              <div className="flex gap-2 flex-wrap">
                {emailTones.map((item) => (
                  <Badge
                    key={item.text}
                    variant="outline"
                    className={`cursor-pointer px-4 py-2 text-sm transition-all duration-200 ${
                      selectedTone?.text === item.text 
                        ? 'bg-accent/10 border-accent/50 text-accent hover:bg-accent/20' 
                        : 'border-border/50 hover:bg-muted/50 hover:border-border'
                    }`}
                    onClick={() => setSelectedTone(item)}
                  >
                    {item.text}
                  </Badge>
                ))}
              </div>
            </div>

            <Button 
              type="submit" 
              disabled={loading || !input || !selectedTone} 
              className="w-full sm:w-auto h-12 px-8 bg-accent text-accent-foreground hover:bg-accent/90 shadow-md shadow-accent/20"
            >
              {loading ? (
                <span className="w-5 h-5 rounded-full border-2 border-accent-foreground/30 border-t-accent-foreground animate-spin mr-2" />
              ) : (
                <Send className="w-5 h-5 mr-2" />
              )}
              {loading ? 'Generating...' : 'Generate Email'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {content && (
        <div className="mb-16 animate-in slide-in-from-bottom-4 duration-500 fade-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-foreground">Generated Email</h3>
            <Button 
              variant="outline" 
              size="sm" 
              className="text-xs h-8 border-border/50"
              onClick={() => handleCopy(content)}
            >
              {copied ? <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
          
          <Card className="border-accent/20 bg-accent/5">
            <CardContent className="p-6 sm:p-8">
              <DemoBanner visible={isDemo} />
              <div className="prose prose-invert prose-p:leading-relaxed max-w-none">
                <Markdown>{content}</Markdown>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <HistorySection 
        type="email" 
        title="Email History" 
        renderItem={(item, { handleCopy, format }) => (
          <div className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-sm font-medium text-foreground mb-1 line-clamp-1">
                  {item.prompt.replace(/Write an email about | in a .* tone/gi, '')}
                </p>
                <p className="text-xs text-muted-foreground">{format(item.created_at)}</p>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 hover:bg-accent/10 hover:text-accent"
                onClick={() => handleCopy(item.content)}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            <div className="bg-background/50 rounded-lg p-4 border border-border/30 max-h-32 overflow-hidden relative">
              <div className="prose prose-invert prose-sm max-w-none text-muted-foreground">
                <Markdown>{item.content}</Markdown>
              </div>
              <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-background/50 to-transparent pointer-events-none"></div>
            </div>
          </div>
        )}
      />
    </div>
  );
};

export default WriteEmail;
