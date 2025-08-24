
'use client';

import { useEffect } from 'react';
import { useInView } from 'react-intersection-observer';
import { motion, useAnimation, useMotionValue, useTransform } from 'framer-motion';

interface CountUpProps {
  end: number;
  duration?: number;
  className?: string;
}

export function CountUp({ end, duration = 2, className }: CountUpProps) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, latest => Math.round(latest));
  const controls = useAnimation();
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  useEffect(() => {
    if (inView) {
      controls.start({
        pathLength: 1,
        transition: {
          duration: duration,
          ease: 'circOut',
        },
      });
      const animation = motion.animate(count, end, {
        duration: duration,
        ease: 'circOut',
      });

      return animation.stop;
    }
  }, [inView, end, duration, controls, count]);

  return <motion.span ref={ref} className={className}>{rounded}</motion.span>;
}
