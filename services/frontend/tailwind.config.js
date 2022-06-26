module.exports = {
  darkMode: "class",
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    fontFamily: {
      display: ['Gilroy', 'sans-serif'],
      body: ['Graphik', 'sans-serif'],
    },
    extend: {
      typography: (theme) => ({
        DEFAULT: {
          css: {
            pre: {
              'color': '#fff',
              'line-height': '1.4',
              'margin-top': '0',
              'padding': '',
              'padding-top': '0.4rem',
              'padding-right': '1em',
              'padding-bottom': '0.4rem',
              'padding-left': '1em'
            },
            code: false,
            'pre code': false,
            'code::before': false,
            'code::after': false,
            p: {
              'margin-top': '1em',
              'margin-bottom': '1em'
            }
          }
        }
      })
    },
    height: theme => ({
      auto: 'auto',
      ...theme('spacing'),
      full: '100%',
      screen: 'calc(var(--vh) * 100)',
    }),
    minHeight: theme => ({
      ...theme('spacing'),
      full: '100%',
      screen: 'calc(var(--vh) * 100)',
    })
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography')
  ]
}
