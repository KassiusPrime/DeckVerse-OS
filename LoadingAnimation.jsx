import React from "react";
import { motion } from "framer-motion";
import { Layers, Sparkles, Shield, Zap } from "lucide-react";

// Futuristic DeckVerse Circular Loading Spinner
export function DeckVerseLoader({ label = "Carregando DeckVerse...", size = "md" }) {
  const sizeClasses = size === "sm" ? "w-8 h-8" : size === "lg" ? "w-16 h-16" : "w-12 h-12";
  
  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-4">
      <div className="relative flex items-center justify-center">
        {/* Outer glowing pulsing ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
          className={`${sizeClasses} rounded-full border-2 border-primary/20 border-t-primary border-r-primary/60 shadow-[0_0_15px_rgba(234,88,12,0.3)]`}
        />
        {/* Inner reverse spinning ring */}
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
          className="absolute inset-1 rounded-full border border-amber-500/20 border-b-amber-400"
        />
        {/* Center Icon */}
        <motion.div
          animate={{ scale: [0.9, 1.1, 0.9] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
          className="absolute inset-0 flex items-center justify-center text-primary"
        >
          <Zap className="w-5 h-5 text-primary" />
        </motion.div>
      </div>

      {label && (
        <motion.p
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
          className="font-heading text-xs font-bold tracking-widest uppercase text-muted-foreground"
        >
          {label}
        </motion.p>
      )}
    </div>
  );
}

// Collection Skeleton Loader
export function CollectionSkeleton({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array(count).fill(0).map((_, i) => (
        <div key={i} className="border border-border/40 bg-card/40 rounded-lg p-4 space-y-3 animate-pulse">
          <div className="aspect-[16/8] bg-muted/30 rounded-md w-full" />
          <div className="h-5 bg-muted/40 rounded w-2/3" />
          <div className="h-3 bg-muted/20 rounded w-full" />
          <div className="space-y-2 pt-2">
            <div className="h-3 bg-muted/30 rounded w-1/2" />
            <div className="h-2 bg-muted/20 rounded-full w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Card Grid Skeleton Loader
export function CardGridSkeleton({ count = 8 }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {Array(count).fill(0).map((_, i) => (
        <div key={i} className="border border-border/30 bg-card/30 rounded-lg p-3 space-y-3 animate-pulse">
          <div className="aspect-[3/4] bg-muted/30 rounded-md w-full" />
          <div className="h-4 bg-muted/40 rounded w-3/4" />
          <div className="h-3 bg-muted/20 rounded w-1/2" />
        </div>
      ))}
    </div>
  );
}

// Item Skeleton Loader
export function ItemSkeleton({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      {Array(count).fill(0).map((_, i) => (
        <div key={i} className="border border-border/30 bg-card/30 rounded-md p-3 flex items-start gap-3 animate-pulse">
          <div className="w-10 h-10 bg-muted/30 rounded shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-muted/40 rounded w-2/3" />
            <div className="h-3 bg-muted/20 rounded w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Page Transition Animation Wrapper
export function PageTransition({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
