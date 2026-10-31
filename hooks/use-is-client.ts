"use client";

import { useSyncExternalStore } from "react";

const noSubscribe = () => () => {};

// False on the server and while hydrating, true after: for what renders only in the browser.
export function useIsClient() {
  return useSyncExternalStore(
    noSubscribe,
    () => true,
    () => false
  );
}
