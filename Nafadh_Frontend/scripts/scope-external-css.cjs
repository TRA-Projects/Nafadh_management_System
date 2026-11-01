
const fs = require('node:fs');
const postcss = require('postcss');
const selectorParser = require('postcss-selector-parser');

const input = 'public/external-system/css/style.css';
const output = 'public/external-system/css/style.scoped.css';
const scope = 'app-constants-manage-page';

const css = fs.readFileSync(input, 'utf8')
  .replace(/color:\s*color:\s*/g, 'color: ');

const root = postcss.parse(css);

root.walkRules((rule) => {
  // Don't change animation steps.
  if (rule.parent?.type === 'atrule' &&
      /keyframes$/i.test(rule.parent.name)) {
    return;
  }

  // Leave font-face and other non-selector at-rules alone.
  if (rule.parent?.type === 'atrule' &&
      /^(font-face|property)$/i.test(rule.parent.name)) {
    return;
  }

  rule.selector = selectorParser((selectors) => {
    selectors.each((selector) => {
      const first = selector.nodes[0];
      if (!first) return;

      // Replace document root selectors with our page host.
      const rootNames = ['html', 'body', ':root'];
      const firstText = first.toString().toLowerCase();

      if (rootNames.includes(firstText)) {
        first.replaceWith(selectorParser.tag({ value: scope }));
      } else {
        selector.prepend(selectorParser.combinator({ value: ' ' }));
        selector.prepend(selectorParser.tag({ value: scope }));
      }
    });
  }).processSync(rule.selector);
});

fs.writeFileSync(output, root.toString(), 'utf8');
console.log('Created:', output);
