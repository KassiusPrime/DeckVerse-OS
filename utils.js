import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
} 

export function getCardImage(card) {
  return card?.img_custom || card?.img_oficial || card?.image_url || "";
}

export const isIframe = window.self !== window.top;
