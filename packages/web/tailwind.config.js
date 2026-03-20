/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        douyin: {
          primary: '#fe2c55',
          dark: '#121212',
          gray: '#2f2f2f',
        },
      },
    },
  },
  plugins: [],
};
