/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0A0E14",
        surface: "#131A24",
        raised: "#1B2432",
        line: "#242E3D",
        signal: "#FFB74A",
        settle: "#4FD8C4",
        no: "#FF6B6B",
        ink2: "#E8EAF0",
        muted: "#7C8699",
      },
      fontFamily: {
        display: ["Space Grotesk", "sans-serif"],
        body: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
