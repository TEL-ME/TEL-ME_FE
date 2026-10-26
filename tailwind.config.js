/** @type {import('tailwindcss').Config} */
// 색은 src/styles/tokens.css의 CSS 변수를 가리킨다. 라이트/다크는 <html class="dark">로 바뀐다.
const v = (name) => `var(--${name})`

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        backdrop: v('backdrop'),
        bg: v('bg'),
        surface: v('surface'),
        'surface-2': v('surface-2'),
        line: v('line'),
        'field-disabled': v('field-disabled'),
        ink: { DEFAULT: v('text'), sub: v('text-sub'), muted: v('text-muted') },
        brand: { DEFAULT: v('brand'), text: v('brand-text'), strong: v('brand-strong'), soft: v('brand-soft') },
        inverse: { DEFAULT: v('inverse'), ink: v('on-inverse') },
        danger: v('danger'),
        success: v('success'),
        notice: { DEFAULT: v('notice-bg'), text: v('notice-text') },
        chip: {
          'plan-bg': v('chip-plan-bg'),
          plan: v('chip-plan'),
          'store-bg': v('chip-store-bg'),
          store: v('chip-store'),
          'usim-bg': v('chip-usim-bg'),
          usim: v('chip-usim'),
          'roam-bg': v('chip-roam-bg'),
          roam: v('chip-roam'),
        },
      },
      fontFamily: {
        sans: ['"Pretendard Variable"', 'Pretendard', '"Apple SD Gothic Neo"', '"Noto Sans KR"', 'system-ui', 'sans-serif'],
        logo: ['Nunito', 'system-ui', 'sans-serif'],
      },
      borderRadius: { card: '22px', bubble: '22px' },
    },
  },
  plugins: [],
}
