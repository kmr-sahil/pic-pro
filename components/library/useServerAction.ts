
"use client";

import { useCallback, useTransition } from "react";
import type { ActionResult } from "@/lib/types";

export type Notify = (text: string, tone?: "info" | "error") => void;

/**
 * Runs a server action, surfacing failures through the notice banner instead
 * of letting them disappear into the console.
 */
export function useServerAction(notify: Notify) {
  const [pending, startTransition] = useTransition();

  const run = useCallback(
    <T>(action: () => Promise<ActionResult<T>>, success?: string) => {
      startTransition(async () => {
        try {
          const result = await action();
          if (!result.ok) notify(result.error, "error");
          else if (success) notify(success);
        } catch {
          notify("Something went wrong. Please try again.", "error");
        }
      });
    },
    [notify]
  );

  return { pending, run };
}
