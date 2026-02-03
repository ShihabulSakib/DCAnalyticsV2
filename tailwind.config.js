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
                primary: {
                    a0: 'var(--clr-primary-a0)',
                    a10: 'var(--clr-primary-a10)',
                    a20: 'var(--clr-primary-a20)',
                    a30: 'var(--clr-primary-a30)',
                    a40: 'var(--clr-primary-a40)',
                    a50: 'var(--clr-primary-a50)',
                },
                surface: {
                    a0: 'var(--clr-surface-a0)',
                    a10: 'var(--clr-surface-a10)',
                    a20: 'var(--clr-surface-a20)',
                    a30: 'var(--clr-surface-a30)',
                    a40: 'var(--clr-surface-a40)',
                    a50: 'var(--clr-surface-a50)',
                },
                'surface-tonal': {
                    a0: 'var(--clr-surface-tonal-a0)',
                    a10: 'var(--clr-surface-tonal-a10)',
                    a20: 'var(--clr-surface-tonal-a20)',
                    a30: 'var(--clr-surface-tonal-a30)',
                    a40: 'var(--clr-surface-tonal-a40)',
                    a50: 'var(--clr-surface-tonal-a50)',
                },
                success: {
                    a0: 'var(--clr-success-a0)',
                    a10: 'var(--clr-success-a10)',
                    a20: 'var(--clr-success-a20)',
                },
                warning: {
                    a0: 'var(--clr-warning-a0)',
                    a10: 'var(--clr-warning-a10)',
                    a20: 'var(--clr-warning-a20)',
                },
                danger: {
                    a0: 'var(--clr-danger-a0)',
                    a10: 'var(--clr-danger-a10)',
                    a20: 'var(--clr-danger-a20)',
                },
                info: {
                    a0: 'var(--clr-info-a0)',
                    a10: 'var(--clr-info-a10)',
                    a20: 'var(--clr-info-a20)',
                },
                // Aliases for compatibility or ease of use if needed
                'dark-card': 'var(--clr-surface-tonal-a10)', // Mapping the missing class seen in Navbar
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                display: ['Outfit', 'sans-serif'],
                mono: ['JetBrains Mono', 'Roboto Mono', 'monospace'],
            }
        },
    },
    plugins: [],
}