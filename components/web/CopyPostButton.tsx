"use client";

import { Link } from "lucide-react";
import { useEffect, useState } from "react";

export default function CopyPostButton() {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setIsCopied(true);
    } catch (err) {
      console.error("Clipboard error:", err);
    }
  };

  useEffect(() => {
    if (isCopied) {
      setTimeout(() => {
        setIsCopied(false);
      }, 1000);
    }
  }, [isCopied]);

  return (
    <button
      onClick={handleCopy}
      className="hidden sm:flex w-8 flex-col items-center gap-2 transition-opacity cursor-pointer text-primary"
    >
      <Link className="size-4 sm:size-5" />
      <p className="flex items-center gap-2">
        {isCopied ? <>Copied!</> : <>Copy</>}
      </p>
    </button>
  );
}
