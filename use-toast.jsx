// use-toast.jsx — compat layer
import { tacticalToast } from "./TacticalToast";

export function toast({ title, description, variant, duration, ...rest }) {
  return tacticalToast({
    title,
    description,
    type: variant === "destructive" ? "error" : "success",
    duration: duration || (variant === "destructive" ? 5000 : 3500),
    ...rest,
  });
}

export function useToast() {
  return {
    toast,
    dismiss: () => {},
    toasts: [],
  };
}
 