/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: "class",
    theme: {
        extend: {
            animation: {
                'pulse-once': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) 1',
            },
            colors: {
                primary: {
                    DEFAULT: "#135bec",
                    500: "#3B82F6",
                    600: "#2563EB",
                },
                "background-light": "#F3F4F6",
                "background-dark": "#141414",
                "surface-light": "#FFFFFF",
                "surface-dark": "#1c1c1e",
                "surface-variant": "#262628",
                "card-light": "#FFFFFF",
                "card-dark": "#242426",
                "border-light": "#E5E7EB",
                "border-dark": "#333335",
                "input-light": "#F9FAFB",
                "input-dark": "#2c2c2e",
                "text-main": "#F5F5F7",
                "text-secondary": "#8e8e93",
                "text-tertiary": "#636366",
                "text-muted": "#8e8e93",
                "chip-active": "#F5F5F7",
                "chip-inactive": "#2c2c2e",
            },
            fontFamily: {
                display: ["Manrope", "Noto Sans SC", "sans-serif"],
            },
            borderRadius: {
                DEFAULT: "0.5rem",
                'xl': '1rem',
                '2xl': '1.5rem',
            },
        },
    },
    plugins: [],
}
