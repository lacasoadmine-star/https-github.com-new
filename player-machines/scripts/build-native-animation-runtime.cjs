const fs = require('fs'), path = require('path'), crypto = require('crypto');
const esbuild = require('esbuild');
const root = path.resolve(__dirname, '..');
const source = process.argv[2] || '/workspace/work/r12-reference/runtimes';
let pixi = fs.readFileSync(path.join(source, 'pixi.js'), 'utf8').replace(/\/\/# sourceMappingURL=.*$/gm, '');
// The delivered Pixi build adds a page-rotation input hook requiring the provider's jQuery/gameInfo.
// Restore upstream coordinate mapping; the offscreen integration also unregisters input plugins.
const helper = /\s*\/\/ დამატება 2\s+function getRotationDegrees\(obj\) \{[\s\S]*?\n      \}\s*(?=InteractionManager\.prototype\.mapPositionToPoint)/;
const mapping = /InteractionManager\.prototype\.mapPositionToPoint = function \(point, x, y\) \{[\s\S]*?\n      \};/;
if (!helper.test(pixi) || !mapping.test(pixi)) throw new Error('Unexpected Pixi interaction source: review before building');
pixi = pixi.replace(helper, '\n      ').replace(mapping, `InteractionManager.prototype.mapPositionToPoint = function (point, x, y) {
          var rect = this.interactionDOMElement.parentElement ? this.interactionDOMElement.getBoundingClientRect() :
              { left: 0, top: 0, width: this.interactionDOMElement.width, height: this.interactionDOMElement.height };
          var resolutionMultiplier = 1.0 / this.resolution;
          point.x = (x - rect.left) * (this.interactionDOMElement.width / rect.width) * resolutionMultiplier;
          point.y = (y - rect.top) * (this.interactionDOMElement.height / rect.height) * resolutionMultiplier;
      };`);
if (pixi.includes('gameInfo') || pixi.includes('getRotationDegrees') || pixi.includes("$('.game-div')")) throw new Error('Provider input dependency remains');
const spine = fs.readFileSync(path.join(source, 'pixi-spine.js'), 'utf8').replace(/\/\/# sourceMappingURL=.*$/gm, '');
const notices = ['pixi.js-legacy-LICENSE', 'pixi-spine-SPINE-LICENSE'].map(name => name + '\n\n' + fs.readFileSync(path.join(source, name), 'utf8')).join('\n\n');
// Original public runtime distributions, isolated from any application globals.
const libraries = `const nativeLibraries = (() => { ${pixi}\n const scope = { PIXI }; (function(globalThis) { ${spine}\n }).call(scope, scope); return { PIXI, spine: scope.pixi_spine }; })();\n`;
const result = esbuild.transformSync(libraries + fs.readFileSync(path.join(__dirname, 'native-animation-runtime-source.mjs'), 'utf8'), {
  loader: 'js', format: 'esm', target: 'es2020', minify: true, legalComments: 'inline',
  banner: '/*! Native presentation runtime. Full upstream notices: native-animation-LICENSES.txt */',
});
fs.writeFileSync(path.join(root, 'public/native-animation-runtime.mjs'), result.code);
fs.writeFileSync(path.join(root, 'public/native-animation-LICENSES.txt'), notices);
const metadata = { versions: { pixi: '6.5.5', pixiSpine: '3.0.4', skeleton: '3.8' },
  isolation: 'No provider game logic or network calls. Local public skeletons only. No background animation ticker.',
  interactionIsolation: 'Provider-specific jQuery/gameInfo rotation hook removed at build; standard Pixi coordinate mapping restored. Interaction and accessibility renderer plugins unregistered before renderer creation.',
  sourceManifest: JSON.parse(fs.readFileSync(path.join(source, 'manifest.json'), 'utf8')),
  sourceHashes: Object.fromEntries(['pixi.js', 'pixi-spine.js', 'pixi.js-legacy-LICENSE', 'pixi-spine-SPINE-LICENSE'].map(name => [name, crypto.createHash('sha256').update(fs.readFileSync(path.join(source, name))).digest('hex')])),
  outputBytes: Buffer.byteLength(result.code), outputSha256: crypto.createHash('sha256').update(result.code).digest('hex') };
fs.writeFileSync(path.join(root, 'evidence/r12/native-animation-runtime.json'), JSON.stringify(metadata, null, 2) + '\n');
console.log({ outputBytes: metadata.outputBytes, outputSha256: metadata.outputSha256 });
