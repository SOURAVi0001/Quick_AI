import { Mail, Send } from 'lucide-react';
import { useState } from 'react';
import api from '../lib/api';
import { useAuth } from '@clerk/clerk-react';
import toast from 'react-hot-toast';
import Markdown from 'react-markdown';
import DemoBanner from '../components/DemoBanner';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import ToolShell, { ResultRegion, Zone } from '../components/ToolShell';
import OptionGroup from '../components/OptionGroup';
import EmptyState from '../components/EmptyState';
import LoadingState from '../components/LoadingState';
import CopyBlock from '../components/CopyBlock';
import CopyButton from '../components/CopyButton';
import HistorySection from '../components/HistorySection';
import StatusBadge from '../components/StatusBadge';

const emailTones = [
  { tone: 'Professional', text: 'Professional', hint: 'Formal and precise' },
  { tone: 'Friendly', text: 'Friendly', hint: 'Warm and casual' },
  { tone: 'Persuasive', text: 'Persuasive', hint: 'Sales-oriented' },
  { tone: 'Urgent', text: 'Urgent', hint: 'Time-sensitive' },
];

// Robust conversion from simple Markdown to HTML for clipboard styling
function markdownToHtml(markdown) {
  if (!markdown) return '';

  // Escape HTML characters
  let html = markdown.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // Parse bold **text**
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // Parse links [text](url)
  html = html.replace(
    /\[(.*?)\]\((.*?)\)/g,
    '<a href="$2" style="color: #3b82f6; text-decoration: underline;">$1</a>',
  );

  // Parse line breaks and paragraphs/lists
  const lines = html.split('\n');
  let result = [];
  let inList = false;

  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (inList) {
        result.push('</ul>');
        inList = false;
      }
      result.push('<br/>');
      continue;
    }

    if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
      if (!inList) {
        result.push(
          '<ul style="list-style-type: disc; padding-left: 20px; margin-top: 8px; margin-bottom: 8px;">',
        );
        inList = true;
      }
      result.push(`<li style="margin-bottom: 6px;">${trimmed.substring(2)}</li>`);
    } else {
      if (inList) {
        result.push('</ul>');
        inList = false;
      }
      result.push(`<p style="margin: 0 0 12px 0; line-height: 1.6;">${line}</p>`);
    }
  }

  if (inList) {
    result.push('</ul>');
  }

  return result.join('\n');
}

// Convert markdown to clean plain text for clipboard fallback
function stripMarkdown(markdown) {
  if (!markdown) return '';
  return markdown
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1 ($2)')
    .replace(/^[-\*]\s+/gm, '• ');
}

const WriteEmail = () => {
  const [selectedTone, setSelectedTone] = useState(emailTones[0]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState('');
  const [isDemo, setIsDemo] = useState(false);
  const [expandedItems, setExpandedItems] = useState({});
  const { getToken } = useAuth();

  const toggleExpand = (itemId) => {
    setExpandedItems((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  const onSubmitHandler = async (e) => {
    e.preventDefault();
    if (!input) return;
    try {
      setLoading(true);
      setContent('');
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

  // Parse content if it's a string containing JSON
  let emailData = null;
  if (content) {
    if (typeof content === 'object') {
      emailData = content;
    } else {
      try {
        emailData = JSON.parse(content);
      } catch (e) {
        emailData = { body: content };
      }
    }
  }

  const getCopyHtml = () => {
    if (!emailData) return '';
    if (emailData.subject && emailData.body) {
      return `<p><strong>Subject:</strong> ${emailData.subject}</p><br/>${markdownToHtml(emailData.body)}`;
    }
    return markdownToHtml(emailData.body || content || '');
  };

  const getCopyText = () => {
    if (!emailData) return '';
    if (emailData.subject && emailData.body) {
      return `Subject: ${emailData.subject}\n\n${stripMarkdown(emailData.body)}`;
    }
    return stripMarkdown(emailData.body) || content || '';
  };

  return (
    <ToolShell
      icon={Mail}
      eyebrow="Writing"
      title="Write Email"
      description="Describe the situation in a sentence. Choose a register. Get a draft you can send without rewriting it."
      width="wide"
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
        <Card variant="panel" className="grain min-w-0 overflow-hidden">
          <div className="border-b border-border px-6 py-4">
            <p className="text-eyebrow mb-1 text-subtle-foreground">Brief</p>
            <h2 className="font-display text-2xl text-foreground">The situation</h2>
          </div>
          <CardContent className="pt-6">
            <form onSubmit={onSubmitHandler} className="space-y-8">
              <div className="space-y-2.5">
                <label htmlFor="email-topic" className="block text-sm font-medium text-foreground">
                  What is the email about?
                </label>
                <Textarea
                  id="email-topic"
                  onChange={(e) => setInput(e.target.value)}
                  value={input}
                  rows={4}
                  placeholder="Following up with a recruiter after Tuesday's screening call…"
                  required
                />
                <p className="text-meta">
                  One or two lines is enough — say who it's for and the outcome you want.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <p className="text-eyebrow text-subtle-foreground">Tone</p>
                  <span className="h-px flex-1 bg-linear-to-r from-border to-transparent" />
                </div>
                <OptionGroup
                  label="Email tone"
                  options={emailTones}
                  value={selectedTone}
                  onChange={setSelectedTone}
                  getKey={(o) => o.tone}
                  getLabel={(o) => o.text}
                  getDescription={(o) => o.hint}
                  columns
                />
              </div>

              <Button
                type="submit"
                size="lg"
                loading={loading}
                disabled={loading || !input}
                className="w-full sm:w-auto"
              >
                {!loading && <Send className="size-4" />}
                {loading ? 'Drafting…' : 'Generate email'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <ResultRegion label="Generated email" className="lg:sticky lg:top-6">
          <Card
            variant={content ? 'result' : 'dashed'}
            className="grain relative flex flex-col min-h-[22rem] h-full overflow-hidden"
          >
            {/* Header section (shows only when content is ready) */}
            {content && !loading && (
              <div className="flex items-center justify-between border-b border-border px-5 py-3.5 sm:px-6">
                <div>
                  <p className="text-eyebrow mb-1 text-subtle-foreground">Ready to send</p>
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-h3 truncate text-foreground">Generated email</h3>
                    <StatusBadge tone="accent">{selectedTone.tone}</StatusBadge>
                  </div>
                </div>
                <CopyButton text={getCopyText()} html={getCopyHtml()} />
              </div>
            )}

            {/* Main content body */}
            <div className="relative flex-1 p-5 sm:p-6 flex flex-col justify-center min-h-0">
              {loading ? (
                <LoadingState
                  title="Drafting your email"
                  description={`${selectedTone.tone} register · shaping structure and close`}
                  lines={6}
                />
              ) : content ? (
                <div className="flex-1 flex flex-col min-h-0 space-y-4">
                  <DemoBanner visible={isDemo} className="mb-2" />

                  {/* Subject block */}
                  {emailData?.subject && (
                    <div className="rounded-md border border-border bg-surface-2/40 p-3.5 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-eyebrow text-accent mb-1">Subject</p>
                        <p className="text-sm font-medium text-foreground select-all">
                          {emailData.subject}
                        </p>
                      </div>
                      <CopyButton text={emailData.subject} variant="ghost" size="sm" iconOnly />
                    </div>
                  )}

                  {/* Body block */}
                  {emailData?.body && (
                    <div className="flex-1 rounded-md border border-border bg-surface-2/40 p-4 min-h-0 flex flex-col">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-eyebrow text-subtle-foreground">Message Body</p>
                        <CopyButton
                          text={stripMarkdown(emailData.body)}
                          html={markdownToHtml(emailData.body)}
                          variant="ghost"
                          size="sm"
                          iconOnly
                        />
                      </div>
                      <div className="flex-1 overflow-y-auto max-h-[16rem] pr-2 scrollbar-thin">
                        <div className="prose prose-invert prose-sm max-w-none break-words prose-p:leading-relaxed prose-strong:text-foreground">
                          <Markdown>{emailData.body}</Markdown>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center h-full">
                  <div
                    className="pointer-events-none absolute inset-x-0 top-0 h-40 opacity-70"
                    style={{
                      background:
                        'radial-gradient(60% 100% at 50% 0%, hsl(var(--primary) / 0.12) 0%, transparent 70%)',
                    }}
                    aria-hidden="true"
                  />
                  <div className="relative mb-6 grid size-14 place-items-center rounded-full border border-border bg-surface-2/80 text-subtle-foreground">
                    <span
                      className="absolute inset-0 rounded-full ring-1 ring-inset ring-foreground/5"
                      aria-hidden="true"
                    />
                    <Mail className="size-5" />
                  </div>
                  <h3 className="relative font-display text-2xl text-foreground">No draft yet</h3>
                  <p className="relative mt-2.5 max-w-sm text-sm leading-relaxed text-muted-foreground">
                    Add the situation, pick a tone, and the finished email appears here.
                  </p>
                </div>
              )}
            </div>
          </Card>
        </ResultRegion>
      </div>

      <Zone>
        <HistorySection
          type="email"
          title="Email history"
          renderItem={(item, { format }) => {
            let itemData = null;
            if (typeof item.content === 'object') {
              itemData = item.content;
            } else {
              try {
                itemData = JSON.parse(item.content);
              } catch (e) {
                itemData = { body: item.content };
              }
            }
            const copyHtml =
              itemData.subject && itemData.body
                ? `<p><strong>Subject:</strong> ${itemData.subject}</p><br/>${markdownToHtml(itemData.body)}`
                : markdownToHtml(itemData.body || item.content || '');

            const copyText =
              itemData.subject && itemData.body
                ? `Subject: ${itemData.subject}\n\n${stripMarkdown(itemData.body)}`
                : stripMarkdown(itemData.body) || item.content || '';

            const isExpanded = !!expandedItems[item.id];

            return (
              <div className="min-w-0 p-5 sm:p-6">
                <div className="mb-3.5 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-h3 line-clamp-1 text-foreground">
                      {item.prompt.replace(/Write an email about | in a .* tone/gi, '')}
                    </p>
                    <p className="text-meta mt-1">{format(item.created_at)}</p>
                  </div>
                  <CopyButton text={copyText} html={copyHtml} variant="ghost" iconOnly />
                </div>
                <div
                  className={`relative rounded-md border border-border bg-surface-2/60 p-4 space-y-3 transition-all duration-300 ${
                    isExpanded ? 'max-h-none pb-12' : 'max-h-48 overflow-hidden'
                  }`}
                >
                  {itemData.subject && (
                    <div className="flex items-start justify-between gap-3 bg-surface-1/40 rounded p-2">
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-accent mb-0.5">
                          Subject
                        </p>
                        <p className="text-xs font-medium text-foreground select-all">
                          {itemData.subject}
                        </p>
                      </div>
                      <CopyButton text={itemData.subject} variant="ghost" size="sm" iconOnly />
                    </div>
                  )}
                  {itemData.body && (
                    <div className="relative">
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Message
                        </p>
                        <CopyButton
                          text={stripMarkdown(itemData.body)}
                          html={markdownToHtml(itemData.body)}
                          variant="ghost"
                          size="sm"
                          iconOnly
                        />
                      </div>
                      <div className="prose prose-invert prose-xs max-w-none break-words text-muted-foreground leading-relaxed">
                        <Markdown>{itemData.body}</Markdown>
                      </div>
                    </div>
                  )}

                  {/* Fading overlay and expand/collapse button */}
                  {!isExpanded && (
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-surface-2 via-surface-2/80 to-transparent flex items-end justify-center pb-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleExpand(item.id)}
                        className="pointer-events-auto text-xs font-medium text-accent hover:text-accent/80 hover:bg-surface-1/50 gap-1 px-3 py-1.5 h-8 rounded-full border border-border bg-surface-2 shadow-sm"
                      >
                        See complete
                      </Button>
                    </div>
                  )}

                  {isExpanded && (
                    <div className="absolute inset-x-0 bottom-2 flex justify-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleExpand(item.id)}
                        className="text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-surface-1/50 gap-1 px-3 py-1.5 h-8 rounded-full border border-border bg-surface-2 shadow-sm"
                      >
                        Collapse
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          }}
        />
      </Zone>
    </ToolShell>
  );
};

export default WriteEmail;
