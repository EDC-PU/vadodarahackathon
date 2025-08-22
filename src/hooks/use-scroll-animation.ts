
"use client";

import { useEffect, useState, RefObject } from 'react';

export const useScrollAnimation = (ref: RefObject<HTMLElement>): boolean => {
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        // We only want to trigger the animation once
        if (entry.isIntersecting) {
          setIsInView(true);
          // Stop observing the element once it's in view
          if (ref.current) {
            observer.unobserve(ref.current);
          }
        }
      },
      {
        root: null, // relative to the viewport
        rootMargin: '0px',
        threshold: 0.1, // 10% of the element is visible
      }
    );

    const currentRef = ref.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [ref]);

  return isInView;
};

