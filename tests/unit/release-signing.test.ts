/// <reference types="node" />
// The config plugin that makes release builds use your upload key (plugins/release-signing.js).
import { createRequire } from 'node:module';

import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { addReleaseSigning } = require('../../plugins/release-signing.js') as {
  addReleaseSigning: (contents: string) => string;
};

// The relevant part of android/app/build.gradle as Expo SDK 58's prebuild generates it.
const GENERATED = `android {
    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
    }
    buildTypes {
        debug {
            signingConfig signingConfigs.debug
        }
        release {
            // Caution! In production, you need to generate your own keystore file.
            signingConfig signingConfigs.debug
            minifyEnabled enableMinifyInReleaseBuilds
        }
    }
}
`;

describe('addReleaseSigning', () => {
  const out = addReleaseSigning(GENERATED);

  it('adds a release signing config read from gradle properties', () => {
    expect(out).toMatch(/signingConfigs \{[\s\S]*debug \{[\s\S]*release \{[\s\S]*storeFile file\(TORA_UPLOAD_STORE_FILE\)/);
    expect(out).toContain('keyPassword TORA_UPLOAD_KEY_PASSWORD');
  });

  it('signs release builds with it, and debug builds still with the debug key', () => {
    const buildTypes = out.slice(out.indexOf('buildTypes'));
    expect(buildTypes.match(/signingConfig signingConfigs\.\w+/g)).toEqual([
      'signingConfig signingConfigs.debug',
      'signingConfig signingConfigs.release',
    ]);
  });

  it('stops a release build when the key details are missing', () => {
    expect(out).toContain('gradle.taskGraph.whenReady');
    expect(out).toContain("!project.hasProperty('TORA_UPLOAD_STORE_FILE')");
  });

  it('contains no secrets and applies only once', () => {
    expect(out).not.toMatch(/storePassword '(?!android)/);
    expect(addReleaseSigning(out)).toBe(out);
  });

  it('fails loudly if a future Expo template looks different', () => {
    expect(() => addReleaseSigning('android {}')).toThrow(/signingConfigs.debug not found/);
  });
});
