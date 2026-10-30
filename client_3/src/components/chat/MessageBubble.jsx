import { ArrowUpRight, Ban, Info } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";
import { cn } from "../../utils/cn";

const markdownComponents = {
  h1: ({ children, ...props }) => (
    <h1 className="mt-3 mb-1.5 text-[15px] font-bold text-white tracking-tight first:mt-0" {...props}>
      {children}
    </h1>
  ),
  h2: ({ children, ...props }) => (
    <h2 className="mt-2.5 mb-1.5 text-[14px] font-semibold text-white tracking-tight first:mt-0" {...props}>
      {children}
    </h2>
  ),
  h3: ({ children, ...props }) => (
    <h3 className="mt-2 mb-1 text-[13.5px] font-semibold text-ember-300 first:mt-0" {...props}>
      {children}
    </h3>
  ),
  h4: ({ children, ...props }) => (
    <h4 className="mt-2 mb-1 text-[13px] font-medium text-white/95 first:mt-0" {...props}>
      {children}
    </h4>
  ),
  p: ({ children, ...props }) => (
    <p className="mb-2 last:mb-0 leading-relaxed text-[13.5px] text-[#e7e1da]" {...props}>
      {children}
    </p>
  ),
  ul: ({ children, ...props }) => (
    <ul className="mb-2 list-disc list-outside pl-4 space-y-1 text-[13.5px] leading-relaxed text-[#e7e1da] marker:text-ember-400 last:mb-0" {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, ...props }) => (
    <ol className="mb-2 list-decimal list-outside pl-4 space-y-1 text-[13.5px] leading-relaxed text-[#e7e1da] marker:text-ember-400 marker:font-medium last:mb-0" {...props}>
      {children}
    </ol>
  ),
  li: ({ children, ...props }) => (
    <li className="pl-0.5 leading-relaxed" {...props}>
      {children}
    </li>
  ),
  strong: ({ children, ...props }) => (
    <strong className="font-semibold text-white" {...props}>
      {children}
    </strong>
  ),
  em: ({ children, ...props }) => (
    <em className="italic text-white/90" {...props}>
      {children}
    </em>
  ),
  a: ({ href, children, ...props }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-ember-400 underline underline-offset-2 hover:text-ember-300 transition-colors break-words font-medium"
      {...props}
    >
      {children}
    </a>
  ),
  blockquote: ({ children, ...props }) => (
    <blockquote className="my-2 border-l-2 border-ember-400/70 pl-3 italic text-white/75" {...props}>
      {children}
    </blockquote>
  ),
  pre: ({ children, ...props }) => (
    <pre className="my-2.5 overflow-x-auto rounded-xl border border-white/10 bg-[#0c0d14] p-3 text-[12px] font-mono leading-normal text-white/90 shadow-inner" {...props}>
      {children}
    </pre>
  ),
  code: ({ node, className, children, ...props }) => {
    const isBlock = /language-/.test(className || "") || String(children).includes("\n");
    if (isBlock) {
      return (
        <code className={cn("font-mono text-[12px]", className)} {...props}>
          {children}
        </code>
      );
    }
    return (
      <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[11.5px] text-ember-300" {...props}>
        {children}
      </code>
    );
  },
  hr: ({ ...props }) => (
    <hr className="my-2.5 border-t border-white/10" {...props} />
  ),
  table: ({ children, ...props }) => (
    <div className="my-2.5 w-full overflow-x-auto rounded-lg border border-white/10">
      <table className="w-full border-collapse text-left text-[12px]" {...props}>
        {children}
      </table>
    </div>
  ),
  thead: ({ children, ...props }) => (
    <thead className="border-b border-white/10 bg-white/[0.04] text-white font-medium" {...props}>
      {children}
    </thead>
  ),
  th: ({ children, ...props }) => (
    <th className="px-2.5 py-1.5 font-semibold text-white/90" {...props}>
      {children}
    </th>
  ),
  td: ({ children, ...props }) => (
    <td className="border-t border-white/[0.06] px-2.5 py-1.5 text-white/80" {...props}>
      {children}
    </td>
  ),
};

export function MessageBubble({ message, onNavigate }) {
  const isUser = message.role === "user";
  const kind = message.kind;

  if (isUser) {
    return (
      <div className="flex justify-end animate-fade-up">
        <div className="max-w-[82%] rounded-2xl rounded-br-md bg-ember-gradient px-3.5 py-2.5 text-[13.5px] leading-relaxed text-ink-950 shadow-[0_8px_24px_-8px_rgba(224,124,56,0.6)]">
          {message.content}
        </div>
      </div>
    );
  }

  const tone =
    kind === "rejected"
      ? "border-red-400/20 bg-red-500/[0.06]"
      : kind === "unavailable"
        ? "border-amber-300/20 bg-amber-400/[0.06]"
        : kind === "error"
          ? "border-red-400/20 bg-red-500/[0.06]"
          : "border-white/[0.07] bg-white/[0.04]";

  return (
    <div className="flex items-end gap-2 animate-fade-up">
      <div className="mb-0.5 flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-[#08080d]">
        <img
          src="/chatbot.png"
          alt=""
          aria-hidden="true"
          className="max-w-none shrink-0"
          style={{ width: 96, height: 72 }}
        />
      </div>
      <div className="max-w-[86%] space-y-2">
        <div
          className={cn(
            "rounded-2xl rounded-bl-md border px-3.5 py-2.5 text-[13.5px] leading-relaxed text-[#e7e1da]",
            tone,
          )}
        >
          {(kind === "rejected" || kind === "unavailable") && (
            <div
              className={cn(
                "mb-1.5 flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em]",
                kind === "rejected" ? "text-red-300/90" : "text-amber-300/90",
              )}
            >
              {kind === "rejected" ? <Ban className="h-3 w-3" /> : <Info className="h-3 w-3" />}
              {kind === "rejected" ? "Out of scope" : "Not in my sources"}
            </div>
          )}
          <div className="markdown-content">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
              components={markdownComponents}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        </div>

        {message.links && message.links.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {message.links.map((l) => (
              <button
                key={l.href}
                type="button"
                onClick={() => onNavigate?.(l.href)}
                className="group inline-flex items-center gap-1 rounded-full border border-ember-500/35 bg-ember-500/10 px-3 py-1.5 text-[12px] font-medium text-ember-300 transition hover:border-ember-400/60 hover:bg-ember-500/20"
              >
                {l.label}
                <ArrowUpRight className="h-3 w-3 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
