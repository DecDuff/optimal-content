"use client";

import {
  type CSSProperties,
  useCallback,
  useRef,
  useState,
} from "react";
import { motion } from "framer-motion";

type Props = {
  children: React.ReactNode;
  className?: string;
  type?: "button" | "submit" | "reset";
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
  shineColor?: string;
};

/** Tap scale + radial cursor-follow highlight (Apple-style tactile feedback). */
export function InteractiveButton({
  className = "",
  children,
  shineColor = "rgba(46, 91, 255, 0.22)",
  type = "button",
  onClick,
  disabled,
}: Props) {
  const ref = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ x: 50, y: 50 });

  const onMove = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({
      x: ((e.clientX - r.left) / r.width) * 100,
      y: ((e.clientY - r.top) / r.height) * 100,
    });
  }, []);

  const onLeave = useCallback(() => setPos({ x: 50, y: 50 }), []);

  return (
    <motion.button
      ref={ref}
      type={type}
      disabled={disabled}
      onClick={onClick}
      whileTap={{ scale: disabled ? 1 : 0.95 }}
      transition={{ type: "spring", stiffness: 520, damping: 28 }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={`group relative isolate overflow-hidden ${className}`}
      style={
        {
          "--shine-x": `${pos.x}%`,
          "--shine-y": `${pos.y}%`,
          "--shine-color": shineColor,
        } as CSSProperties
      }
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(120px circle at var(--shine-x) var(--shine-y), var(--shine-color), transparent 65%)`,
        }}
      />
      <span className="relative z-10">{children}</span>
    </motion.button>
  );
}
