import fs from 'fs-extra';
import path from 'path';
import { glob } from 'glob';
import JavaScriptObfuscator from 'javascript-obfuscator';
import CleanCSS from 'clean-css';
import { minify as minifyHTML } from 'html-minifier-terser';

const srcDir = path.resolve('public/games');
const distDir = path.resolve('dist/games');

async function processGames() {
  console.log('🚀 Processing games: compression and obfuscation...');

  // 确保目标目录存在
  if (await fs.pathExists(distDir)) {
    await fs.remove(distDir);
  }
  await fs.ensureDir(distDir);

  // 查找所有文件
  const files = await glob('**/*', { cwd: srcDir, nodir: true });

  for (const file of files) {
    const srcPath = path.join(srcDir, file);
    const destPath = path.join(distDir, file);
    const ext = path.extname(file).toLowerCase();

    await fs.ensureDir(path.dirname(destPath));

    try {
      if (ext === '.js') {
        const code = await fs.readFile(srcPath, 'utf8');
        console.log(`  - Processing JS (Obfuscating): ${file}`);
        
        const obfuscationResult = JavaScriptObfuscator.obfuscate(code, {
          compact: true,
          controlFlowFlattening: true,
          controlFlowFlatteningThreshold: 0.5,
          deadCodeInjection: false, // 减少体积
          debugProtection: false,
          disableConsoleOutput: false,
          identifierNamesGenerator: 'hexadecimal',
          log: false,
          renameGlobals: false,
          rotateStringArray: true,
          selfDefending: false,
          stringArray: true,
          stringArrayEncoding: ['base64'],
          stringArrayThreshold: 0.75,
          unicodeEscapeSequence: false
        });
        
        await fs.writeFile(destPath, obfuscationResult.getObfuscatedCode());
      } else if (ext === '.css') {
        const css = await fs.readFile(srcPath, 'utf8');
        console.log(`  - Processing CSS (Minifying): ${file}`);
        const minified = new CleanCSS({}).minify(css);
        await fs.writeFile(destPath, minified.styles);
      } else if (ext === '.html') {
        const html = await fs.readFile(srcPath, 'utf8');
        console.log(`  - Processing HTML (Minifying): ${file}`);
        const minified = await minifyHTML(html, {
          collapseWhitespace: true,
          removeComments: true,
          minifyJS: true,
          minifyCSS: true,
          caseSensitive: true,
          removeRedundantAttributes: true,
          useShortDoctype: true
        });
        await fs.writeFile(destPath, minified);
      } else {
        // 其他资源（图片、json等）直接复制
        await fs.copy(srcPath, destPath);
      }
    } catch (err) {
      console.error(`  ❌ Error processing ${file}:`, err);
      // 出错时回退到直接复制
      await fs.copy(srcPath, destPath);
    }
  }

  console.log('✅ Games processed and moved to dist/games');
}

processGames().catch(err => {
  console.error('Fatal error during game processing:', err);
  process.exit(1);
});
