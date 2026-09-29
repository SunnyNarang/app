import { motion } from "framer-motion";

export const Reveal = ({ children, delay = 0, y = 28, className = "", mount = false }) => (
  <motion.div
    className={className}
    initial={{ opacity: 0, y }}
    {...(mount
      ? { animate: { opacity: 1, y: 0 } }
      : { whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: 0.15 } })}
    transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
  >
    {children}
  </motion.div>
);

export const MaskedLine = ({ children, delay = 0, as: Tag = "span" }) => (
  <Tag className="block overflow-hidden pb-1">
    <motion.span
      className="block"
      initial={{ y: "115%" }}
      animate={{ y: 0 }}
      transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.span>
  </Tag>
);
