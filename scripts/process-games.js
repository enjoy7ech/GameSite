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
    try {
      await fs.remove(distDir);
    } catch (e) {
      console.warn('  ⚠️ Initial cleanup failed, retrying in 500ms...', e.message);
      await new Promise(resolve => setTimeout(resolve, 500));
      await fs.remove(distDir);
    }
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
        const isLibrary = file.includes('lib' + path.sep) || file.includes('vendor' + path.sep) || file.endsWith('.min.js');
        
        if (isLibrary) {
          console.log(`  - Skipping Obfuscation (Library/Minified): ${file}`);
          await fs.copy(srcPath, destPath);
          continue;
        }

        const code = await fs.readFile(srcPath, 'utf8');
        console.log(`  - Processing JS (Obfuscating): ${file}`);
        
        const obfuscationResult = JavaScriptObfuscator.obfuscate(code, {
          compact: true,
          controlFlowFlattening: false, // 性能杀手，关闭
          deadCodeInjection: false,
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
      console.error(`  ❌ Error processing ${file}:`, err.message);
      // 出错时回退到直接复制
      try {
        await fs.copy(srcPath, destPath, { overwrite: true });
      } catch (copyErr) {
        console.error(`  ❌ Failed to even copy ${file}:`, copyErr.message);
      }
    }
  }

  console.log('✅ Games processed and moved to dist/games');
}

processGames().catch(err => {
  console.error('Fatal error during game processing:', err);
  process.exit(1);
});
