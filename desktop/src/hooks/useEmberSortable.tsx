import React, { useCallback, useEffect, useRef, useState } from "react";

/**
 * React port of YNAB's Ember sortable mixin (see unminified/wrapper.beautified.js, class NQ).
 *
 * Behaviour reproduced:
 *  - dragstart marks the source row `is-original-dragging is-original-hover` so it keeps its space.
 *  - dragenter/dragover compute top/bottom half and open an animated `.drag-placeholder` in that gap.
 *  - hovering the gaps directly adjacent to the source shows no placeholder; the source keeps its space.
 *  - dragleave does NOTHING (otherwise the placeholder flickers as rows shift under the cursor).
 *  - the previous placeholder becomes `.drag-placeholder-closing` (collapse animation) and is removed later.
 *  - the placeholder itself accepts dragover/drop.
 *  - drop position is the placeholder gap, not the hovered row.
 */

export interface SortItem {
  listId: string;
  id: string;
  index: number;
}

export interface Gap {
  listId: string;
  index: number; // insertion index in the list (0..length)
}

interface Options {
  canDrop?: (dragged: SortItem, gap: Gap) => boolean;
  onDrop: (dragged: SortItem, gap: Gap) => void;
  placeholderClassName?: string;
}

const sameGap = (a: Gap | null, b: Gap | null) =>
  a === b || (!!a && !!b && a.listId === b.listId && a.index === b.index);

let closingSeq = 0;

export function useEmberSortable({ canDrop, onDrop, placeholderClassName = "" }: Options) {
  const [dragging, setDragging] = useState<SortItem | null>(null);
  const [gap, setGapState] = useState<Gap | null>(null);
  const [closing, setClosing] = useState<{ key: number; gap: Gap }[]>([]);

  const draggingRef = useRef<SortItem | null>(null);
  const gapRef = useRef<Gap | null>(null);
  const timers = useRef<number[]>([]);
  const optsRef = useRef({ canDrop, onDrop });
  optsRef.current = { canDrop, onDrop };

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const setGap = useCallback((next: Gap | null) => {
    const prev = gapRef.current;
    if (sameGap(prev, next)) return;
    gapRef.current = next;
    if (prev) {
      const key = ++closingSeq;
      setClosing((c) => [...c.filter((x) => !sameGap(x.gap, next)), { key, gap: prev }]);
      timers.current.push(
        window.setTimeout(() => setClosing((c) => c.filter((x) => x.key !== key)), 500)
      );
    } else if (next) {
      setClosing((c) => c.filter((x) => !sameGap(x.gap, next)));
    }
    setGapState(next);
  }, []);

  const reset = useCallback(() => {
    draggingRef.current = null;
    setGap(null);
    setDragging(null);
  }, [setGap]);

  const commit = useCallback(() => {
    const d = draggingRef.current;
    const g = gapRef.current;
    reset();
    if (d && g) optsRef.current.onDrop(d, g);
  }, [reset]);

  const resolveGap = useCallback(
    (g: Gap | null) => {
      const d = draggingRef.current;
      if (!d || !g) return;
      // Gaps immediately above/below the original row: no placeholder, original keeps its space.
      if (g.listId === d.listId && (g.index === d.index || g.index === d.index + 1)) {
        setGap(null);
        return;
      }
      if (optsRef.current.canDrop && !optsRef.current.canDrop(d, g)) return;
      setGap(g);
    },
    [setGap]
  );

  /** Props for any element that should act as a drop target. `gapFor(isTopHalf)` maps a hover to a gap. */
  const getTargetProps = useCallback(
    (gapFor: (isTopHalf: boolean) => Gap | null) => {
      const handleOver = (e: React.DragEvent<HTMLElement>) => {
        if (!draggingRef.current) return; // not our drag — let it bubble
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = "move";
        const rect = e.currentTarget.getBoundingClientRect();
        if (rect.height === 0) return;
        resolveGap(gapFor(e.clientY < rect.top + rect.height / 2));
      };
      return {
        onDragEnter: handleOver,
        onDragOver: handleOver,
        onDragLeave: (e: React.DragEvent<HTMLElement>) => {
          if (draggingRef.current) e.preventDefault();
        },
        onDrop: (e: React.DragEvent<HTMLElement>) => {
          if (!draggingRef.current) return;
          e.preventDefault();
          e.stopPropagation();
          commit();
        },
      };
    },
    [commit, resolveGap]
  );

  /** Props for a sortable row. */
  const getItemProps = useCallback(
    (item: SortItem, opts: { disabled?: boolean } = {}) => ({
      draggable: !opts.disabled,
      onDragStart: (e: React.DragEvent<HTMLElement>) => {
        if (opts.disabled) {
          e.preventDefault();
          return;
        }
        e.stopPropagation();
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", item.id);
        draggingRef.current = item;
        // Defer visual changes so the browser snapshots the drag image first
        // (mutating the source synchronously can cancel the drag in Chromium/WebView2).
        window.setTimeout(() => {
          if (draggingRef.current === item) setDragging(item);
        }, 0);
      },
      onDragEnd: () => reset(),
      ...getTargetProps((top) => ({ listId: item.listId, index: top ? item.index : item.index + 1 })),
    }),
    [getTargetProps, reset]
  );

  /** Class names for a row: `is-original-dragging` (+ `is-original-hover` while it still holds its slot). */
  const itemClassName = useCallback(
    (item: { id: string }) => {
      if (!dragging || dragging.id !== item.id) return "";
      return gap ? "is-original-dragging" : "is-original-dragging is-original-hover";
    },
    [dragging, gap]
  );

  const placeholderProps = {
    draggable: true,
    onDragEnter: (e: React.DragEvent) => e.preventDefault(),
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      commit();
    },
    onDragEnd: () => reset(),
  };

  /** Render the open/closing placeholders for a gap. Call this between rows. */
  const renderPlaceholder = (listId: string, index: number): React.ReactNode => {
    const g = { listId, index };
    const nodes: React.ReactNode[] = [];
    closing
      .filter((c) => sameGap(c.gap, g))
      .forEach((c) =>
        nodes.push(
          <div key={`closing-${c.key}`} className={`drag-placeholder-closing ${placeholderClassName}`} />
        )
      );
    if (sameGap(gap, g)) {
      nodes.push(
        <div key="open" className={`drag-placeholder ${placeholderClassName}`} {...placeholderProps} />
      );
    }
    return nodes.length ? nodes : null;
  };

  return {
    dragging,
    isDragging: dragging !== null,
    getItemProps,
    getTargetProps,
    itemClassName,
    renderPlaceholder,
  };
}

/** Final index after removing the item at `from` and inserting at gap `gapIndex` in the same list. */
export const gapToIndex = (from: number, gapIndex: number) => (gapIndex > from ? gapIndex - 1 : gapIndex);

export type EmberSortable = ReturnType<typeof useEmberSortable>;
