"use client";

import { useRef } from "react";

const LONG_PRESS_MS = 450;

/** Tap vs. long-press handling shared by grid tiles and list rows. */
export function useLongPress(onLongPress: () => void) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressed = useRef(false);
  const origin = useRef<{ x: number; y: number } | null>(null);

  const endPress = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    origin.current = null;
  };

  const handlers = {
    onPointerDown: (e: React.PointerEvent) => {
      longPressed.current = false;
      origin.current = { x: e.clientX, y: e.clientY };
      timer.current = setTimeout(() => {
        longPressed.current = true;
        onLongPress();
      }, LONG_PRESS_MS);
    },
    /** A finger that travels is scrolling, not long-pressing. */
    onPointerMove: (e: React.PointerEvent) => {
      const start = origin.current;
      if (!start) return;
      if (Math.abs(e.clientX - start.x) > 10 || Math.abs(e.clientY - start.y) > 10) {
        endPress();
      }
    },
    onPointerUp: endPress,
    onPointerLeave: endPress,
    onPointerCancel: endPress,
    onContextMenu: (e: React.MouseEvent) => {
      // Long press on touch also fires the context menu; suppress it.
      if (longPressed.current) e.preventDefault();
    },
  };

  return { handlers, longPressed };
}
