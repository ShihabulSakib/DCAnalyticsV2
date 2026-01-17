/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Dark Mode: refined Zinc palette
                zinc: {
                    950: '#09090b', // Background
                    900: '#18181b', // Surface
                    800: '#27272a', // Border
                },
                // Light Mode: Alabaster/Slate
                slate: {
                    50: '#f8fafc', // Background
                },
                // Accent
                indigo: {
                    500: '#6366f1',
                    600: '#4f46e5',
                }
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                display: ['Outfit', 'sans-serif'],
                mono: ['JetBrains Mono', 'Roboto Mono', 'monospace'], // For tabular data
            }
        },
    },
    plugins: [],
}
