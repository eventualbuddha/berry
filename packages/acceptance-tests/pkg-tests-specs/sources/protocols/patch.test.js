import {xfs, ppath} from '@yarnpkg/fslib';

const NO_DEPS_PATCH = `diff --git a/index.js b/index.js
index a6bf8f58..629b6aa8 100644
--- a/index.js
+++ b/index.js
@@ -2,6 +2,8 @@

 module.exports = require(\`./package.json\`);

+module.exports.hello = \`world\`;
+
 for (const key of [\`dependencies\`, \`devDependencies\`, \`peerDependencies\`]) {
   for (const dep of Object.keys(module.exports[key] || {})) {
     // $FlowFixMe The whole point of this file is to be dynamic
`;

describe(`Protocols`, () => {
  describe(`patch:`, () => {
    test(
      `it should apply a patch on the original package`,
      makeTemporaryEnv(
        {
          dependencies: {[`no-deps`]: `patch:no-deps@1.0.0#my-patch.patch`},
        },
        async ({path, run, source}) => {
          await xfs.writeFilePromise(ppath.join(path, `my-patch.patch`), NO_DEPS_PATCH);

          await run(`install`);

          await expect(source(`require('no-deps')`)).resolves.toMatchObject({
            name: `no-deps`,
            version: `1.0.0`,
            hello: `world`,
          });
        },
      ),
    );

    test(
      `it should generate the same file twice in a row`,
      makeTemporaryEnv(
        {
          dependencies: {[`no-deps`]: `patch:no-deps@1.0.0#my-patch.patch`},
        },
        async ({path, run, source}) => {
          await xfs.writeFilePromise(ppath.join(path, `my-patch.patch`), NO_DEPS_PATCH);

          await run(`install`);

          await xfs.removePromise(ppath.join(path, `.yarn/cache`));
          await xfs.removePromise(ppath.join(path, `.yarn/global`));

          await run(`install`);

          await expect(source(`require('no-deps')`)).resolves.toMatchObject({
            name: `no-deps`,
            version: `1.0.0`,
            hello: `world`,
          });
        },
      ),
    );

    test(
      `it should generate the same file twice in a row (delayed)`,
      makeTemporaryEnv(
        {
          dependencies: {[`no-deps`]: `patch:no-deps@1.0.0#my-patch.patch`},
        },
        async ({path, run, source}) => {
          await xfs.writeFilePromise(ppath.join(path, `my-patch.patch`), NO_DEPS_PATCH);

          await run(`install`);

          await xfs.removePromise(ppath.join(path, `.yarn/cache`));
          await xfs.removePromise(ppath.join(path, `.yarn/global`));

          // At least three seconds because Zip archives are precise to two
          // seconds, not one. One extra second will ensure that the file
          // timestamps will always have a chance to tick.
          await new Promise(resolve => setTimeout(resolve, 3000));

          await run(`install`);

          await expect(source(`require('no-deps')`)).resolves.toMatchObject({
            name: `no-deps`,
            version: `1.0.0`,
            hello: `world`,
          });
        },
      ),
      10000,
    );

    test(
      `it should preserve the resolution when switching in and out of a patch`,
      makeTemporaryEnv(
        {
          dependencies: {
            [`no-deps`]: `^2.0.0`,
          },
        },
        async ({path, run, source}) => {
          await xfs.writeFilePromise(ppath.join(path, `my-patch.patch`), NO_DEPS_PATCH);

          await run(`install`);

          const lockfilePath = ppath.join(path, `yarn.lock`);
          const lockfile = await xfs.readFilePromise(lockfilePath, `utf8`);
          await xfs.writeFilePromise(lockfilePath, lockfile.replace(/\^2\.0\.0/, `1.0.0`));

          await xfs.writeJsonPromise(ppath.join(path, `package.json`), {
            dependencies: {
              [`no-deps`]: `patch:no-deps@1.0.0#my-patch.patch`,
            },
          });

          await run(`install`);

          await expect(source(`require('no-deps')`)).resolves.toMatchObject({
            name: `no-deps`,
            version: `2.0.0`,
            hello: `world`,
          });

          await xfs.writeJsonPromise(ppath.join(path, `package.json`), {
            dependencies: {
              [`no-deps`]: `1.0.0`,
            },
          });

          await run(`install`);

          await expect(source(`require('no-deps')`)).resolves.toMatchObject({
            name: `no-deps`,
            version: `2.0.0`,
          });

          await expect(source(`require('no-deps')`)).resolves.not.toMatchObject({
            hello: `world`,
          });
        },
      ),
    );
  });
});
