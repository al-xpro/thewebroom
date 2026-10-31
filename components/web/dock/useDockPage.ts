import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

const noSubscribe = () => () => {};

// False on the server and while hydrating, true after: the dock renders only in the browser.
export function useIsClient() {
  return useSyncExternalStore(
    noSubscribe,
    () => true,
    () => false
  );
}

// Which page the dock is on: posts and legal pages get the minimap, the editor keeps the dock.
export function dockPage(pathname: string) {
  const isEditorRoute = pathname.startsWith("/create") || pathname.startsWith("/edit/");
  const isPostRoute = (pathname.startsWith("/posts/") && pathname !== "/posts") || pathname.startsWith("/post/");
  const isPostPage =
    isPostRoute || isEditorRoute || pathname.includes("privacy-policy") || pathname.includes("terms-and-conditions");
  return { isEditorRoute, isPostPage };
}

// Whether the page's reading surface (an article, or the editor) is in the DOM yet: the
// minimap waits for it, so it never measures an empty page. Each page subscribes again,
// as the next post may still be loading.
export function usePostSurface(pathname: string, isPostPage: boolean, isEditorRoute: boolean) {
  const selector = isEditorRoute ? ".ProseMirror" : "article";

  const subscribe = useCallback(
    (notify: () => void) => {
      if (!isPostPage || document.querySelector(selector)) return () => {};
      const observer = new MutationObserver(() => {
        if (!document.querySelector(selector)) return;
        observer.disconnect();
        notify();
      });
      observer.observe(document.body, { childList: true, subtree: true });
      return () => observer.disconnect();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- a new page needs a new watch
    [pathname, isPostPage, selector]
  );

  return useSyncExternalStore(
    subscribe,
    () => isPostPage && document.querySelector(selector) !== null,
    () => false
  );
}

// True while the page scrolls, and for a moment after.
export function useIsScrolling(enabled: boolean) {
  const [isScrolling, setIsScrolling] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const handleScroll = () => {
      setIsScrolling(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => setIsScrolling(false), 300);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      clearTimeout(timeout);
    };
  }, [enabled]);

  return enabled && isScrolling;
}
