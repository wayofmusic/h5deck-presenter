// 通过已连接的 Playwright page 执行此函数。
// 先在本目录启动本地静态服务，修改 baseUrl 与 outputRoot 后执行。
async function exportPosters(page, baseUrl, outputRoot) {
  const context = await page.context().browser().newContext({
    viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 2
  });
  const p = await context.newPage();
  const names = ['01-讲师开课', '02-双屏价值', '03-重要演讲', '04-好课复用'];
  const checks = [];
  try {
    for (let i = 1; i <= 4; i++) {
      await p.goto(baseUrl + '/海报排版源.html?poster=' + i);
      await p.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all([...document.images].map(im => im.decode()));
      });
      const el = p.locator('#poster-' + i);
      await el.screenshot({ path: outputRoot + '/海报/' + names[i - 1] + '-2160x3840.png', scale: 'device' });
      await el.screenshot({ path: outputRoot + '/海报/' + names[i - 1] + '-1080x1920.png', scale: 'css' });
      checks.push(await el.evaluate(e => ({
        poster: e.id, width: e.offsetWidth, height: e.offsetHeight,
        overflow: [...e.querySelectorAll('.benefit p,.cta p,.footer,.delivery,.phone')]
          .filter(n => n.scrollWidth > n.clientWidth + 1 || n.scrollHeight > n.clientHeight + 1)
          .map(n => n.className)
      })));
    }
    return checks;
  } finally { await context.close(); }
}
