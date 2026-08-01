"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { useToast } from "../../lib/toast";

export default function CopyButton({
  value,
  label = "Copy",
  className = "btn btn-ghost",
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  async function handleCopy() {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(value);
      } else {
        // No Clipboard API (e.g. insecure origin) -- fall back to a
        // temporary selectable textarea so copy still works.
        const textarea = document.createElement("textarea");
        textarea.value = value;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy automatically -- select the text and copy manually");
    }
  }

  return (
    <button type="button" onClick={handleCopy} className={className} style={{ padding: "6px 12px", fontSize: 12 }}>
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? "Copied" : label}
    </button>
  );
}
