export default defineAppConfig({
  icon: {
    customize: (content: string) => content.replace(/stroke-width="2"/g, 'stroke-width="1.75"')
  }
})
