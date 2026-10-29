import Javascript from "@thesvg/react/javascript";
import Nextdotjs from "@thesvg/react/nextdotjs";
import ReactIcon from "@thesvg/react/react";
import Typescript from "@thesvg/react/typescript";

// The language mark on a code block's tab: mono brand icons, black and white like the blocks.
export function FileIcon({ lang }: { lang: string }) {
  const props = { variant: "mono", className: "size-4", "aria-hidden": true } as const;
  switch (lang) {
    case "ts":
      return <Typescript {...props} />;
    case "tsx":
      return <Nextdotjs {...props} />;
    case "js":
      return <Javascript {...props} />;
    case "jsx":
      return <ReactIcon {...props} />;
    default:
      return null;
  }
}
