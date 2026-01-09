/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./node_modules/@tremor/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        body: ['Source Sans 3', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        cream: {
          50: '#FAF7F2',
          100: '#F5F0E8',
          200: '#E8E4DC',
        },
        rust: {
          DEFAULT: '#C45D3E',
          light: '#D4745A',
          dark: '#A84D32',
        },
        sage: {
          DEFAULT: '#5B7C65',
          light: '#7A9B84',
          dark: '#4A6654',
        },
        ink: {
          DEFAULT: '#2C3E50',
          light: '#3D5166',
        },
        gold: {
          DEFAULT: '#B8860B',
        },
        tremor: {
          brand: {
            faint: "#F5F0E8",
            muted: "#E8E4DC",
            subtle: "#D4CFC4",
            DEFAULT: "#5B7C65",
            emphasis: "#4A6654",
            inverted: "#FFFFFF",
          },
          background: {
            muted: "#F5F0E8",
            subtle: "#FAF7F2",
            DEFAULT: "#FFFFFF",
            emphasis: "#F5F0E8",
          },
          border: {
            DEFAULT: "#E8E4DC",
          },
          ring: {
            DEFAULT: "#D4CFC4",
          },
          content: {
            subtle: "#9A9A9A",
            DEFAULT: "#6B6B6B",
            emphasis: "#3D3D3D",
            strong: "#1A1A1A",
            inverted: "#FFFFFF",
          },
        },
      },
    },
  },
  safelist: [
    {
      pattern:
        /^(bg-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/,
      variants: ["hover", "ui-selected"],
    },
    {
      pattern:
        /^(text-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/,
      variants: ["hover", "ui-selected"],
    },
    {
      pattern:
        /^(border-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/,
      variants: ["hover", "ui-selected"],
    },
    {
      pattern:
        /^(ring-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/,
    },
    {
      pattern:
        /^(stroke-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/,
    },
    {
      pattern:
        /^(fill-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/,
    },
  ],
  plugins: [],
};
