/** @type {import('tailwindcss').Config} */

export default {
  content: ['index.html', './src/**/*.{ts,tsx}'],
  theme: {
    fontFamily: {
      sans: ['Roboto', 'sans-serif'],
      body: ['Roboto', 'sans-serif'],
      inter: ['Inter', 'sans-serif'],
    },
    extend: {
      backgroundImage: {
        buttonBlackGradient:
          'radial-gradient(82.64% 800.96% at 50% -550.96%, #000 0%, rgba(59, 59, 59, 0.81) 55%, #000 100%)',
        buttonBlackGradientHover:
          'radial-gradient(82.64% 800.96% at 50% -550.96%, #000 0%, rgba(59, 59, 59, 0.81) 74%, #000 100%)',
      },
      colors: {
        dividerColor: '#525866',
        brand: {
          orange: '#e27625',
          grey: '#525866',
          grey10: '#0F0F0F',
          background: '#EFEFEF',
        },
      },
    },
  },
};
