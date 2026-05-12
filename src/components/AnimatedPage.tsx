import React from "react";
import { motion } from "framer-motion";
import { pageVariants } from "../utils/animations";

const AnimatedPage: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <motion.div
    variants={pageVariants}
    initial="hidden"
    animate="visible"
    exit="exit"
  >
    {children}
  </motion.div>
);

export default AnimatedPage;
