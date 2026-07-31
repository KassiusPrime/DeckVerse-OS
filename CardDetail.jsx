import { db } from "@/base44Client";

import React from "react";
import { useQuery } from "@tanstack/react-query";

import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Hash } from "lucide-react";
import { Skeleton } from "@/skeleton";

import Navbar from "@/Navbar";
import CardImage from "@/CardImage";
import { RarityBadge, RoleBadge, ElementBadge } from "@/RarityBadge";
import StatsPanel from "@/StatsPanel";
import SkillsList from "@/SkillsList";
import LoreSection from "@/LoreSection";

export default function CardDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const cardId = window.location.pathname.split("/card/")[1];

  const { data: cards, isLoading } = useQuery({
    queryKey: ["card", cardId],
    queryFn: () => db.entities.Card.filter({ id: cardId }),
    enabled: !!cardId,
  });

  const card = cards?.[0];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12">
            <div className="lg:col-span-2">
              <Skeleton className="aspect-[3/4] rounded-2xl" />
            </div>
            <div className="lg:col-span-3 space-y-6">
              <Skeleton className="h-10 w-64" />
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-40 w-full rounded-xl" />
              <Skeleton className="h-32 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!card) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20 text-center">
          <p className="font-heading text-lg text-muted-foreground">Card not found</p>
          <Link to="/" className="mt-4 inline-flex items-center gap-2 text-primary text-sm font-body hover:underline">
            <ArrowLeft className="w-4 h-4" /> Back to Collections
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* Back link */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-body text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Collections
        </Link>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Left: Card Image */}
          <div className="lg:col-span-2">
            <div className="sticky top-24">
              <CardImage
                imageUrl={card.image_url}
                name={card.name}
                rarity={card.rarity}
              />
            </div>
          </div>

          {/* Right: Card Data */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="lg:col-span-3 space-y-6"
          >
            {/* Title Area */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Hash className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="font-heading text-xs font-bold tracking-widest text-muted-foreground uppercase">
                  {card.card_id}
                </span>
                {card.series && (
                  <span className="text-xs font-body text-muted-foreground/60">· {card.series}</span>
                )}
              </div>
              <h1 className="font-heading text-3xl sm:text-4xl font-black tracking-tight text-foreground">
                {card.name}
              </h1>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-2">
              <RarityBadge rarity={card.rarity} />
              <RoleBadge role={card.role} />
              {card.element && <ElementBadge element={card.element} />}
            </div>

            {/* Stats */}
            <StatsPanel
              attack={card.attack}
              defense={card.defense}
              speed={card.speed}
              hp={card.hp}
            />

            {/* Skills */}
            <SkillsList skills={card.skills} />

            {/* Lore */}
            <LoreSection lore={card.lore} />
          </motion.div>
        </div>
      </div>
    </div>
  );
}