import { Variants } from "framer-motion";

const ease = [0.22, 1, 0.36, 1] as const;

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease } },
  exit:    { opacity: 0, y: -12, transition: { duration: 0.25, ease } },
};

export const staggerContainer: Variants = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.08 } },
};

export const scaleIn: Variants = {
  hidden:  { opacity: 0, scale: 0.92 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.4, ease } },
  exit:    { opacity: 0, scale: 0.95, transition: { duration: 0.2, ease } },
};

export const slideRight: Variants = {
  hidden:  { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.45, ease } },
  exit:    { opacity: 0, x: 20, transition: { duration: 0.2, ease } },
};

export const pageVariants: Variants = {
  hidden:  { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease } },
  exit:    { opacity: 0, y: -8, transition: { duration: 0.25, ease } },
};
