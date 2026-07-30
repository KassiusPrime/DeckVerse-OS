import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

// Restore persisted font on boot
const savedFont = localStorage.getItem("deckverse_font");
const FONT_MAP = {
  orbitron: "'Orbitron', sans-serif",
  firacode: "'Fira Code', monospace",
  inter:    "'Inter', sans-serif",
};
if (savedFont && FONT_MAP[savedFont]) {
  document.documentElement.style.setProperty("--font-heading", FONT_MAP[savedFont]);
  if (savedFont === "firacode") {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600;700&display=swap";
    document.head.appendChild(link);
  }
}

// Restore persisted theme on boot
const savedTheme = localStorage.getItem("deckverse_theme");
if (savedTheme === "custom") {
  const custom = localStorage.getItem("deckverse_custom_theme");
  if (custom) {
    const colors = JSON.parse(custom);
    const hexToHsl = (hex) => {
      let r = parseInt(hex.slice(1,3),16)/255, g = parseInt(hex.slice(3,5),16)/255, b = parseInt(hex.slice(5,7),16)/255;
      const max=Math.max(r,g,b),min=Math.min(r,g,b);let h,s,l=(max+min)/2;
      if(max===min){h=s=0;}else{const d=max-min;s=l>0.5?d/(2-max-min):d/(max+min);switch(max){case r:h=((g-b)/d+(g<b?6:0))/6;break;case g:h=((b-r)/d+2)/6;break;case b:h=((r-g)/d+4)/6;break;}}
      return `${Math.round(h*360)} ${Math.round(s*100)}% ${Math.round(l*100)}%`;
    };
    document.documentElement.style.setProperty("--primary", hexToHsl(colors.primary));
    document.documentElement.style.setProperty("--background", hexToHsl(colors.bg));
    document.documentElement.style.setProperty("--accent", hexToHsl(colors.accent));
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)