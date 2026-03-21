import { test } from '@japa/runner'
import { SupportAutoInjectedAssets } from '../../src/features/support_auto_injected_assets/support_auto_injected_assets.js'

test.group('SupportAutoInjectedAssets', () => {
  test('should inject assets into head', async ({ assert }) => {
    const html = '<html><head></head><body>Content</body></html>'
    const assetsHead = '<link rel="stylesheet" href="style.css">'
    const assetsBody = ''

    const result = SupportAutoInjectedAssets.injectAssets(html, assetsHead, assetsBody)

    assert.include(result, '<link rel="stylesheet" href="style.css">')
    assert.include(result, '<head>')
    assert.include(result, '</head>')
  })

  test('should inject assets into body', async ({ assert }) => {
    const html = '<html><head></head><body>Content</body></html>'
    const assetsHead = ''
    const assetsBody = '<script src="app.js"></script>'

    const result = SupportAutoInjectedAssets.injectAssets(html, assetsHead, assetsBody)

    assert.include(result, '<script src="app.js"></script>')
    assert.include(result, '<body>')
    assert.include(result, '</body>')
  })

  test('should inject assets into both head and body', async ({ assert }) => {
    const html = '<html><head></head><body>Content</body></html>'
    const assetsHead = '<link rel="stylesheet" href="style.css">'
    const assetsBody = '<script src="app.js"></script>'

    const result = SupportAutoInjectedAssets.injectAssets(html, assetsHead, assetsBody)

    assert.include(result, '<link rel="stylesheet" href="style.css">')
    assert.include(result, '<script src="app.js"></script>')
    assert.include(result, '<head>')
    assert.include(result, '<body>')
  })

  test('should handle HTML without assets', async ({ assert }) => {
    const html = '<html><head></head><body>Content</body></html>'
    const assetsHead = ''
    const assetsBody = ''

    const result = SupportAutoInjectedAssets.injectAssets(html, assetsHead, assetsBody)

    assert.equal(result, html)
  })

  test('should handle HTML with existing content in head', async ({ assert }) => {
    const html = '<html><head><title>Page</title></head><body>Content</body></html>'
    const assetsHead = '<link rel="stylesheet" href="style.css">'
    const assetsBody = ''

    const result = SupportAutoInjectedAssets.injectAssets(html, assetsHead, assetsBody)

    assert.include(result, '<title>Page</title>')
    assert.include(result, '<link rel="stylesheet" href="style.css">')
  })

  test('should handle HTML with existing content in body', async ({ assert }) => {
    const html = '<html><head></head><body><h1>Title</h1>Content</body></html>'
    const assetsHead = ''
    const assetsBody = '<script src="app.js"></script>'

    const result = SupportAutoInjectedAssets.injectAssets(html, assetsHead, assetsBody)

    assert.include(result, '<h1>Title</h1>')
    assert.include(result, '<script src="app.js"></script>')
  })

  test('should handle multiple assets in head', async ({ assert }) => {
    const html = '<html><head></head><body>Content</body></html>'
    const assetsHead =
      '<link rel="stylesheet" href="style1.css">\n<link rel="stylesheet" href="style2.css">'
    const assetsBody = ''

    const result = SupportAutoInjectedAssets.injectAssets(html, assetsHead, assetsBody)

    assert.include(result, 'style1.css')
    assert.include(result, 'style2.css')
  })

  test('should handle multiple assets in body', async ({ assert }) => {
    const html = '<html><head></head><body>Content</body></html>'
    const assetsHead = ''
    const assetsBody = '<script src="app1.js"></script>\n<script src="app2.js"></script>'

    const result = SupportAutoInjectedAssets.injectAssets(html, assetsHead, assetsBody)

    assert.include(result, 'app1.js')
    assert.include(result, 'app2.js')
  })

  test('should preserve HTML structure', async ({ assert }) => {
    const html = '<html><head></head><body>Content</body></html>'
    const assetsHead = '<link rel="stylesheet" href="style.css">'
    const assetsBody = '<script src="app.js"></script>'

    const result = SupportAutoInjectedAssets.injectAssets(html, assetsHead, assetsBody)

    assert.include(result, '<html>')
    assert.include(result, '<head>')
    assert.include(result, '</head>')
    assert.include(result, '<body>')
    assert.include(result, '</body>')
    assert.include(result, '</html>')
  })

  test('should inject before closing tags (PHP parity)', async ({ assert }) => {
    const html = '<html><head><title>X</title></head><body><h1>Content</h1></body></html>'
    const assetsHead = '<!--head-->'
    const assetsBody = '<!--body-->'

    const result = SupportAutoInjectedAssets.injectAssets(html, assetsHead, assetsBody)

    assert.include(result, '<title>X</title>')
    assert.include(result, '<h1>Content</h1>')
    assert.ok(result.includes('<!--head--></head>'), 'assets before </head>')
    assert.ok(result.includes('<!--body--></body>'), 'assets before </body>')
  })

  test('should handle HTML without head/body (inject at html tags)', async ({ assert }) => {
    const html = '<html><yolo /></html>'
    const assetsHead = '<!--head-->'
    const assetsBody = '<!--body-->'

    const result = SupportAutoInjectedAssets.injectAssets(html, assetsHead, assetsBody)

    assert.include(result, '<yolo />')
    assert.ok(result.startsWith('<html><!--head-->'), 'assets after <html>')
    assert.ok(result.includes('<!--body--></html>'), 'assets before </html>')
  })

  test('should handle weirdly formatted HTML (case-insensitive, whitespace)', async ({
    assert,
  }) => {
    const html = `<!doctype html>
<html
  lang="en"
>
  <Head
  >
    <meta charset="utf-8"/>
    <title></title>
  </Head>
  <body>
  </body
  >
</html>`
    const assetsHead = '<!--head-->'
    const assetsBody = '<!--body-->'

    const result = SupportAutoInjectedAssets.injectAssets(html, assetsHead, assetsBody)

    assert.ok(/<!--head-->\s*<\/head>/i.test(result))
    assert.ok(/<!--body-->\s*<\/body\s*>/i.test(result))
    assert.include(result, '<title></title>')
  })
})
