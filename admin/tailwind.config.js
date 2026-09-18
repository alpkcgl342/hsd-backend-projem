/** Yönetim paneli için Tailwind yapılandırması.
 *  CSS şu komutla üretilir:  npm run admin:css
 */
module.exports = {
  content: ['./admin/**/*.html', './admin/js/**/*.js'],
  // Sınıf adlarının bir kısmı JS içinde birleştirilerek üretiliyor
  // (ör. 'bg-' + renk + '-100'), bu yüzden açıkça korunmaları gerekir.
  safelist: [
    { pattern: /^(bg|text|border)-(blue|pink|green|yellow|purple|teal|indigo|red|gray)-(50|100|200|500|600|700|800)$/ },
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
