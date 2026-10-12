import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt({
  files: ['app/engine/**/*.ts'],
  rules: {
    'no-restricted-imports': ['error', { patterns: ['vue', 'vue/*', 'nuxt', 'nuxt/*', '#*', 'motion-v', '@vueuse/*', 'pinia'] }],
    'no-restricted-globals': ['error', 'window', 'document', 'localStorage', 'navigator'],
    '@typescript-eslint/no-explicit-any': 'error'
    , '@typescript-eslint/no-dynamic-delete': 'off'
  }
}, { rules: { 'vue/multi-word-component-names': 'off', 'vue/html-self-closing': 'off', 'vue/max-attributes-per-line': 'off', 'vue/html-indent': 'off', 'vue/singleline-html-element-content-newline': 'off', 'vue/html-closing-bracket-newline': 'off' } })
