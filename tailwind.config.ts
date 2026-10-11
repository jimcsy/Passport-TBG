import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        beat: {
          maroon: {
            DEFAULT: "#5C1D24",
            light: "#782831",
            dark: "#45141A",
          },
          gold: {
            DEFAULT: "#C29B38",
            light: "#D8B452",
            dark: "#A38027",
          },
          canvas: "#FAF8F4",
          card: "#FFFFFF",
          muted: "#8C827A",
          border: "#E7DFD5",
        },
      },
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          '"Helvetica Neue"',
          "Arial",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
