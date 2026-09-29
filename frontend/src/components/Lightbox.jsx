import { useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { photoSrcOf } from "./PhotoUpload";

export default function Lightbox({ items, index, onClose, onNavigate }) {
  const item = items[index];

  const prev = useCallback(
    () => onNavigate((index - 1 + items.length) % items.length),
    [index, items.length, onNavigate]
  );
  const next = useCallback(
    () => onNavigate((index + 1) % items.length),
    [index, items.length, onNavigate]
  );

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose, prev, next]);

  if (!item) return null;

  const navBtn =
    "absolute top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/20 bg-black/60 p-3 text-white backdrop-blur transition-all duration-300 hover:bg-royal hover:border-royal";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[95] flex flex-col bg-black/90 backdrop-blur-md"
      onClick={onClose}
      data-testid="gallery-lightbox"
    >
      <div className="flex items-center justify-between px-6 py-4">
        <p className="font-mono text-xs tracking-widest text-royal-light" data-testid="lightbox-counter">
          {index + 1} / {items.length}
        </p>
        <button
          onClick={onClose}
          className="rounded-full border border-white/20 bg-black/60 p-2.5 text-white transition-all duration-300 hover:bg-royal hover:border-royal"
          data-testid="lightbox-close"
          aria-label="Close"
        >
          <X size={20} />
        </button>
      </div>

      <div className="relative flex flex-1 items-center justify-center px-4" onClick={(e) => e.stopPropagation()}>
        {items.length > 1 && (
          <button onClick={prev} className={`${navBtn} left-3 sm:left-6`} data-testid="lightbox-prev" aria-label="Previous photo">
            <ChevronLeft size={26} />
          </button>
        )}
        <motion.img
          key={index}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          src={photoSrcOf(item.image_url)}
          alt={item.caption || "Gallery moment"}
          className="max-h-[70vh] max-w-full rounded-xl border border-royal/25 object-contain shadow-[0_24px_90px_rgba(0,0,0,0.85)]"
          data-testid="lightbox-image"
        />
        {items.length > 1 && (
          <button onClick={next} className={`${navBtn} right-3 sm:right-6`} data-testid="lightbox-next" aria-label="Next photo">
            <ChevronRight size={26} />
          </button>
        )}
      </div>

      <div className="px-6 pb-8 pt-4" onClick={(e) => e.stopPropagation()}>
        {item.caption && (
          <p
            className="mx-auto max-w-2xl border-l-2 border-royal/70 pl-4 text-sm leading-relaxed text-slate-200 sm:text-base"
            data-testid="lightbox-caption"
          >
            {item.caption}
          </p>
        )}
      </div>
    </motion.div>
  );
}
