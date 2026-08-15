import React from 'react';

export default function PageHeader({ icon: Icon, title, description }) {
  return (
    <div className="mb-8 border-b border-border/40 pb-6">
      <div className="flex items-center gap-3 mb-2">
        {Icon && (
          <div className="p-2 rounded-lg bg-accent/10 text-accent ring-1 ring-accent/20">
            <Icon className="w-5 h-5" />
          </div>
        )}
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
      </div>
      {description && (
        <p className="text-muted-foreground text-sm max-w-2xl mt-1">
          {description}
        </p>
      )}
    </div>
  );
}
