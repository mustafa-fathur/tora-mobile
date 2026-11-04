// Pure text change for android/app/build.gradle, used by with-release-signing.js.
// Kept separate (no Expo imports) so it can be unit tested.

const MARKER = '// @tora release-signing';

const SIGNING_CONFIG = `
        release {
            ${MARKER}: the upload key's details live in your own
            // ~/.gradle/gradle.properties (never in this repo). See docs/RELEASE.md.
            if (project.hasProperty('TORA_UPLOAD_STORE_FILE')) {
                storeFile file(TORA_UPLOAD_STORE_FILE)
                storePassword TORA_UPLOAD_STORE_PASSWORD
                keyAlias TORA_UPLOAD_KEY_ALIAS
                keyPassword TORA_UPLOAD_KEY_PASSWORD
            }
        }`;

const GUARD = `
${MARKER}: refuse to build a release signed with the debug key.
gradle.taskGraph.whenReady { graph ->
    def buildsRelease = graph.allTasks.any { it.project == project && it.name.toLowerCase().contains('release') }
    if (buildsRelease && !project.hasProperty('TORA_UPLOAD_STORE_FILE')) {
        throw new GradleException("Release signing isn't set up: add TORA_UPLOAD_STORE_FILE, TORA_UPLOAD_KEY_ALIAS, TORA_UPLOAD_STORE_PASSWORD and TORA_UPLOAD_KEY_PASSWORD to your ~/.gradle/gradle.properties (see docs/RELEASE.md).")
    }
}
`;

/** Adds a release signing config, uses it for release builds, and guards against debug signing. */
function addReleaseSigning(contents) {
  if (contents.includes(MARKER)) return contents; // already applied

  // 1. A "release" signing config next to the generated "debug" one.
  const signingDebug = /(signingConfigs\s*\{\s*\n\s*debug\s*\{[^}]*\})/;
  if (!signingDebug.test(contents)) throw new Error('with-release-signing: signingConfigs.debug not found in build.gradle');
  let out = contents.replace(signingDebug, `$1${SIGNING_CONFIG}`);

  // 2. The release build type signs with it instead of the debug key.
  const releaseUsesDebug = /(buildTypes\s*\{[\s\S]*?\brelease\s*\{[\s\S]*?)signingConfig signingConfigs\.debug/;
  if (!releaseUsesDebug.test(out)) throw new Error('with-release-signing: release build type signing not found in build.gradle');
  out = out.replace(releaseUsesDebug, '$1signingConfig signingConfigs.release');

  return out + GUARD;
}

module.exports = { addReleaseSigning, MARKER };
