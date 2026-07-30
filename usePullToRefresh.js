import { useState, useEffect, useRef } from "react";

/**
 * usePullToRefresh — native-style pull-to-refresh hook
 * @param {Function} onRefresh — async function to call on pull
 * @param {number} threshold — px to pull before triggering (default 70)
 */
export function usePullToRefresh(onRefresh, threshold = 70) {
  const [pullY, setPullY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const el = containerRef.current || window;

    const onTouchStart = (e) => {
      const scrollTop = containerRef.current
        ? containerRef.current.scrollTop
        : window.scrollY;
      if (scrollTop <= 0) {
        startY.current = e.touches[0].clientY;
      }
    };

    const onTouchMove = (e) => {
      if (startY.current === null || refreshing) return;
      const delta = e.touches[0].clientY - startY.current;
      if (delta > 0) {
        setPullY(Math.min(delta * 0.5, threshold + 20));
      }
    };

    const onTouchEnd = async () => {
      if (pullY >= threshold && !refreshing) {
        setRefreshing(true);
        setPullY(threshold);
        await onRefresh();
        setRefreshing(false);
      }
      setPullY(0);
      startY.current = null;
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd);

    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [pullY, refreshing, onRefresh, threshold]);

  return { pullY, refreshing, containerRef };
}