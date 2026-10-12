import { ArrowUpRight, Ban, Info, Sparkles } from "lucide-react";
import { cn } from "../../utils/cn";

/** Renders **bold** and line breaks without pulling a markdown lib. */
function renderInline(text) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={i} className="rounded bg-white/10 px-1 py-0.5 font-mono text-[11px] text-ember-300">
          {part.slice(1, -1)}
        </code>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

function renderContent(text) {
  return text.split("\n").map((line, i) => {
    const isBullet = line.trimStart().startsWith("• ");
    return (
      <p key={i} className={cn("min-h-[1em]", isBullet && "pl-3 -indent-3 mt-1")}>
        {renderInline(line)}
      </p>
    );
  });
}

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
      <div className="mb-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-ember-500/30 bg-ember-500/10">
        <Sparkles className="h-3 w-3 text-ember-400" strokeWidth={2.2} />
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
          {renderContent(message.content)}
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

        {message.sources && message.sources.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pl-1">
            {message.sources.map((s) => (
              <span
                key={s}
                className="rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-white/35 ring-1 ring-white/[0.08]"
              >
                {s}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
