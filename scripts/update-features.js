#!/usr/bin/env node

/**
 * Feature Tracker - Auto-update features.json from git commits
 *
 * Analyzes git commits since last release and updates:
 * - Feature progress based on commit types (feat, fix, docs)
 * - User story status from commit messages
 * - Release suggestion from semantic commit analysis
 * - Test metrics from coverage reports
 *
 * Usage:
 *   node scripts/update-features.js
 *   node scripts/update-features.js --dry-run
 *   node scripts/update-features.js --since=v1.0.0
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const FEATURES_FILE = 'features.json';
const PACKAGE_FILE = 'package.json';

class FeatureTracker {
  constructor(options = {}) {
    this.dryRun = options.dryRun || false;
    this.since = options.since || null;
    this.verbose = options.verbose || false;
  }

  /**
   * Main execution
   */
  async run() {
    this.log('🔍 Analyzing git commits for feature tracking...\n');

    try {
      const features = this.loadFeatures();
      const commits = this.getCommitsSinceLastRelease();

      this.log(`📊 Found ${commits.length} commits since last release\n`);

      // Update release metadata
      this.updateReleaseMetadata(features, commits);

      // Update feature progress from commits
      this.updateFeatureProgress(features, commits);

      // Update user story status
      this.updateUserStoryStatus(features, commits);

      // Save updated features
      if (!this.dryRun) {
        this.saveFeatures(features);
        this.log('\n✅ features.json updated successfully');
      } else {
        this.log('\n🔍 Dry run - no changes written');
        this.log('\nPreview of changes:');
        console.log(JSON.stringify(features, null, 2));
      }

      return features;
    } catch (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  }

  /**
   * Load features.json
   */
  loadFeatures() {
    try {
      const content = fs.readFileSync(FEATURES_FILE, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Failed to load ${FEATURES_FILE}: ${error.message}`);
    }
  }

  /**
   * Save features.json
   */
  saveFeatures(features) {
    features.lastUpdated = new Date().toISOString();
    const content = JSON.stringify(features, null, 2) + '\n';
    fs.writeFileSync(FEATURES_FILE, content, 'utf8');
  }

  /**
   * Get commits since last release
   */
  getCommitsSinceLastRelease() {
    try {
      const sinceRef = this.since || this.getLastTag();
      const range = sinceRef ? `${sinceRef}..HEAD` : 'HEAD';

      const output = execSync(
        `git log ${range} --format="%H|%ct|%s" --no-merges`,
        { encoding: 'utf8' },
      );

      return output
        .trim()
        .split('\n')
        .filter(line => line)
        .map(line => {
          const [hash, timestamp, message] = line.split('|');
          const parsed = this.parseCommitMessage(message);

          return {
            hash: hash.substring(0, 7),
            timestamp: new Date(parseInt(timestamp) * 1000).toISOString(),
            message,
            ...parsed,
          };
        });
    } catch (error) {
      this.log('⚠️  No previous release found, analyzing all commits');
      return [];
    }
  }

  /**
   * Get last git tag
   */
  getLastTag() {
    try {
      return execSync('git describe --tags --abbrev=0', {
        encoding: 'utf8',
      }).trim();
    } catch {
      return null;
    }
  }

  /**
   * Parse conventional commit message
   */
  parseCommitMessage(message) {
    const conventionalRegex =
      /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore)(?:\(([^)]+)\))?: (.+)$/;
    const match = message.match(conventionalRegex);

    if (!match) {
      return { type: 'unknown', scope: null, subject: message };
    }

    const [, type, scope, subject] = match;

    // Extract user story from subject (e.g., "add US-038 Scenario 1")
    const userStoryMatch = subject.match(/US-(\d{3,})/);
    const userStory = userStoryMatch ? `US-${userStoryMatch[1]}` : null;

    // Extract epic from subject (e.g., "EPIC-009")
    const epicMatch = subject.match(/EPIC-(\d{3,})/);
    const epic = epicMatch ? `EPIC-${epicMatch[1]}` : null;

    return {
      type,
      scope: scope || null,
      subject,
      userStory,
      epic,
    };
  }

  /**
   * Update release metadata
   */
  updateReleaseMetadata(features, commits) {
    const lastCommit = commits[0];
    if (lastCommit) {
      features.release.lastCommit = lastCommit.hash;
    }

    // Count unreleased commits by type
    const unreleased = {
      feat: commits.filter(c => c.type === 'feat').length,
      fix: commits.filter(c => c.type === 'fix').length,
      breaking: commits.filter(c => c.message.includes('BREAKING CHANGE'))
        .length,
    };

    features.release.unreleased = unreleased;

    // Suggest next version
    const currentVersion = features.release.current;
    const nextVersion = this.calculateNextVersion(currentVersion, unreleased);
    features.release.nextSuggested = nextVersion;

    this.log(`📦 Current: ${currentVersion} → Next: ${nextVersion}`);
    this.log(
      `📝 Unreleased: ${unreleased.feat} feat, ${unreleased.fix} fix, ${unreleased.breaking} breaking\n`,
    );
  }

  /**
   * Calculate next version based on conventional commits
   */
  calculateNextVersion(current, unreleased) {
    const [major, minor, patch] = current.split('.').map(Number);

    if (unreleased.breaking > 0) {
      return `${major + 1}.0.0`;
    }
    if (unreleased.feat > 0) {
      return `${major}.${minor + 1}.0`;
    }
    if (unreleased.fix > 0) {
      return `${major}.${minor}.${patch + 1}`;
    }

    return current;
  }

  /**
   * Update feature progress from commits
   */
  updateFeatureProgress(features, commits) {
    for (const [featureKey, feature] of Object.entries(features.features)) {
      const featureCommits = commits.filter(
        c =>
          c.scope === this.getFeatureScope(featureKey) || c.epic === feature.id,
      );

      if (featureCommits.length === 0) continue;

      // Add new commits to feature
      if (!feature.commits) feature.commits = [];

      featureCommits.forEach(commit => {
        const exists = feature.commits.some(c => c.hash === commit.hash);
        if (!exists) {
          feature.commits.push({
            hash: commit.hash,
            type: commit.type,
            scope: commit.scope,
            subject: commit.subject,
            timestamp: commit.timestamp,
            userStory: commit.userStory,
          });
        }
      });

      this.log(`✓ Updated ${feature.name}: +${featureCommits.length} commits`);
    }
  }

  /**
   * Update user story status from commits
   */
  updateUserStoryStatus(features, commits) {
    for (const feature of Object.values(features.features)) {
      if (!feature.userStories) continue;

      for (const [usKey, userStory] of Object.entries(feature.userStories)) {
        const storyCommits = commits.filter(c => c.userStory === usKey);

        if (storyCommits.length === 0) continue;

        // Add commits to user story
        if (!userStory.commits) userStory.commits = [];

        storyCommits.forEach(commit => {
          if (!userStory.commits.includes(commit.hash)) {
            userStory.commits.push(commit.hash);
          }
        });

        // Auto-update status if has commits and was 'todo'
        if (userStory.status === 'todo' && storyCommits.length > 0) {
          userStory.status = 'in-progress';
          this.log(`  → ${usKey}: todo → in-progress`);
        }
      }
    }
  }

  /**
   * Map feature key to git scope
   */
  getFeatureScope(featureKey) {
    const scopeMap = {
      'auth-package': 'auth',
      'infrastructure-foundation': 'infra',
      'production-deployment': 'infra',
      'centralized-auth': 'auth',
    };
    return scopeMap[featureKey] || featureKey;
  }

  /**
   * Log with verbose control
   */
  log(message) {
    if (this.verbose || !message.startsWith('  ')) {
      console.log(message);
    }
  }
}

// CLI
const args = process.argv.slice(2);
const options = {
  dryRun: args.includes('--dry-run'),
  verbose: args.includes('--verbose') || args.includes('-v'),
  since: args.find(a => a.startsWith('--since='))?.split('=')[1] || null,
};

const tracker = new FeatureTracker(options);
tracker.run().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
