"use client";

import { useState } from "react";

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        });
      }}
      className="text-xs font-medium text-green-700 hover:text-green-900 border border-green-200 rounded-lg px-3 py-1.5 transition-colors hover:bg-green-50"
    >
      {copied ? "Copied!" : "Copy to clipboard"}
    </button>
  );
}
