import { useLayoutEffect, type RefObject } from 'react';

export function useTextareaAutosize(ref: RefObject<HTMLTextAreaElement | null>, value: string) {
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;

    function resize() {
      if (!element) return;
      const scrollTop = element.scrollTop;
      const styles = getComputedStyle(element);
      const border = parseFloat(styles.borderTopWidth) + parseFloat(styles.borderBottomWidth);
      const minHeight = parseFloat(styles.minHeight);
      const maxHeight = parseFloat(styles.maxHeight);

      element.style.overflowY = 'hidden';
      element.style.height = '0px';
      const contentHeight = element.scrollHeight + border;
      element.style.height = `${Math.min(maxHeight, Math.max(minHeight, contentHeight))}px`;
      element.style.overflowY = contentHeight > maxHeight ? 'auto' : 'hidden';
      element.scrollTop = scrollTop;
    }

    resize();
    let width = element.clientWidth;
    const observer = new ResizeObserver(() => {
      if (element.clientWidth === width) return;
      width = element.clientWidth;
      resize();
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, value]);
}
