import { FileText, Search, UploadCloud, File as FileIcon, X, Copy } from 'lucide-react';
import { useState, useRef } from 'react';
import api from '../lib/api';
import { useAuth } from '@clerk/clerk-react';
import toast from 'react-hot-toast';
import Markdown from 'react-markdown';
import DemoBanner from '../components/DemoBanner';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import ToolShell, { ResultRegion } from '../components/ToolShell';
import EmptyState from '../components/EmptyState';
import LoadingState from '../components/LoadingState';
import CopyBlock from '../components/CopyBlock';
import HistorySection from '../components/HistorySection';
import { cn } from '@/lib/utils';

const ReviewResume = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState('');
  const [isDemo, setIsDemo] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef(null);
  const { getToken } = useAuth();

  const onSubmitHandler = async (e) => {
    e.preventDefault();
    if (!file) return;
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('resume', file);
      const { data } = await api.post('/api/ai/resume-review', formData, {
        headers: { Authorization: `Bearer ${await getToken()}` },
      });
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

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) setFile(dropped);
  };

  return (
    <ToolShell
      icon={FileText}
      eyebrow="Career Tools"
      title="Resume Review"
      description="Get blunt, actionable feedback on your resume before you send it out. We analyze strengths, weaknesses, and ATS issues."
      width="wide"
    >
      <div className="mb-12 grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
        <Card>
          <CardContent className="p-6 sm:p-8">
            <form onSubmit={onSubmitHandler} className="space-y-6">
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground" htmlFor="resume-file">
                  Upload your resume
                </label>
                <input
                  ref={inputRef}
                  id="resume-file"
                  onChange={(e) => setFile(e.target.files[0])}
                  type="file"
                  accept=".pdf"
                  required
                  className="sr-only"
                />
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => inputRef.current?.click()}
                  onKeyDown={(e) =>
                    (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()
                  }
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={cn(
                    'group relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-6 py-10 text-center transition-[border-color,background-color] duration-250',
                    dragActive
                      ? 'border-primary/60 bg-primary/[0.06]'
                      : 'border-border-strong bg-surface-1/25 hover:border-primary/40 hover:bg-primary/[0.03]',
                  )}
                >
                  {file ? (
                    <>
                      <div className="grid size-12 place-items-center rounded-full border border-primary/25 bg-primary/10 text-primary">
                        <FileIcon className="size-5" />
                      </div>
                      <p className="max-w-full truncate text-sm font-medium text-foreground">
                        {file.name}
                      </p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFile(null);
                          if (inputRef.current) inputRef.current.value = '';
                        }}
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                      >
                        <X className="size-3" /> Remove
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="grid size-12 place-items-center rounded-full border border-border bg-surface-2/80 text-subtle-foreground transition-colors group-hover:text-primary">
                        <UploadCloud className="size-5" />
                      </div>
                      <p className="text-sm font-medium text-foreground">
                        Drag &amp; drop your resume here
                      </p>
                      <p className="text-xs text-muted-foreground">
                        or click to browse &middot; PDF format only
                      </p>
                    </>
                  )}
                </div>
              </div>

              <Button
                type="submit"
                disabled={!file}
                loading={loading}
                size="lg"
                className="w-full sm:w-auto"
              >
                <Search className="size-4" />
                {loading ? 'Analyzing resume...' : 'Review Resume'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <ResultRegion label="Resume analysis result" className="min-w-0">
          {loading ? (
            <LoadingState
              title="Analyzing resume…"
              description="Reading your document and scoring it for clarity and impact."
            />
          ) : content ? (
            <CopyBlock
              label="Analysis Result"
              eyebrow="Resume Review"
              content={content}
              footer={<DemoBanner visible={isDemo} />}
              bodyClassName={isDemo ? 'pt-0' : undefined}
            />
          ) : (
            <EmptyState
              icon={FileText}
              title="No analysis yet"
              description="Upload a PDF resume and run a review to see detailed feedback here."
            />
          )}
        </ResultRegion>
      </div>

      <HistorySection
        type="resume-review"
        title="Review History"
        renderItem={(item, { handleCopy, format }) => (
          <div className="p-6">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="mb-1 line-clamp-1 text-sm font-medium text-foreground">
                  Resume Analysis
                </p>
                <p className="text-xs text-muted-foreground">{format(item.created_at)}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Copy result"
                onClick={() => handleCopy(item.content)}
              >
                <Copy className="size-4" />
              </Button>
            </div>
            <div className="relative max-h-32 min-w-0 overflow-hidden rounded-lg border border-border bg-surface-2 p-4">
              <div className="prose prose-invert prose-sm max-w-none min-w-0 break-words text-muted-foreground">
                <Markdown>{item.content}</Markdown>
              </div>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-linear-to-t from-surface-2 to-transparent"></div>
            </div>
          </div>
        )}
      />
    </ToolShell>
  );
};

export default ReviewResume;
