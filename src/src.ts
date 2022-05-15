import * as fs from 'fs';
import * as path from 'path';
import * as stream from 'stream';
import * as micromatch from 'micromatch';
import { Vinyl } from '@gorb/shared';
import { passThrough } from './pass-through';

interface PathWithStat {
  path: string;
  stat: fs.Stats;
}

interface GorbSrcOptions {
  since?: Date | number | ((file: Vinyl) => Date | number);
  // TODO support following options
  sourcemaps?: boolean | ((file: Vinyl) => boolean);
  resolveSymlinks?: boolean | ((file: Vinyl) => boolean);
}

export type SrcOptions = micromatch.Options & GorbSrcOptions;

// walk recursively to yield file path and stat.
export async function* walk(dir: string): AsyncIterable<PathWithStat> {
  const subs = await fs.promises.readdir(dir);
  for (const sub of subs) {
    const filePath = path.join(dir, sub);
    const stat = await fs.promises.stat(filePath);
    yield { path: filePath, stat };
    if (stat.isDirectory()) {
      yield* walk(filePath);
    }
  }
}

interface Matcher {
  info: micromatch.ScanInfo;
  doesMatch: (str: string) => boolean;
}

interface MatcherGroup extends GorbSrcOptions {
  cwd: string;
  positive: Matcher[];
  negative: Matcher[];
}

export function matcherGroup(patterns: string | string[], options: SrcOptions = {}): MatcherGroup {
  if (!patterns) throw new Error("Missing glob pattern");
  if (typeof patterns === 'string') patterns = [patterns];
  if (!Array.isArray(patterns)) throw new Error("Unexpected glob pattern");
  if (patterns.some(p => !p)) throw new Error("glob pattern cannot be empty");

  const { cwd, since, sourcemaps, resolveSymlinks, ...micromatchOptions } = options;
  const _cwd = cwd || process.cwd();

  const positiveMatchers: Matcher[] = [];
  const negativeMatchers: Matcher[] = [];

  patterns
    .map((p) => {
      let prefix = '';
      if (p.startsWith('!')) {
        prefix = '!';
        p = p.slice(1);
      }
      const fullPath = path.resolve(_cwd, p)
        // micromatch uses forward slash "/" even on windows.
        .replace(/\\/g, '/');
      return prefix + fullPath;
    })
    .forEach((pattern) => {
      const info = micromatch.scan(pattern, micromatchOptions);
      const doesMatch = micromatch.matcher(pattern, micromatchOptions);
      if (info.negated) {
        negativeMatchers.push({ info, doesMatch });
      } else {
        positiveMatchers.push({ info, doesMatch });
      }
    });

  if (positiveMatchers.length === 0) {
    throw new Error("Missing positive glob pattern");
  }

  // console.log(positiveMatchers);
  // console.log(negativeMatchers);

  return {
    cwd: _cwd,
    positive: positiveMatchers,
    negative: negativeMatchers,
    since,
    sourcemaps,
    resolveSymlinks
  };
}

function doesSince(file: Vinyl, since: Date | number | ((file: Vinyl) => Date | number)): boolean {
  if (!since) return true;
  let mtime = since;
  if (typeof since === 'function') mtime = since(file);
  if (file.stat && file.stat.mtime <= mtime) return false;
  return true;
}

export async function* glob({ cwd, positive, negative, since, sourcemaps, resolveSymlinks }: MatcherGroup): AsyncIterable<Vinyl> {
  for (const matcher of positive) {
    const { base, input } = matcher.info;
    // pattern could be just a static string like "src/index.html".
    if (input === base) {
      // TODO source-map init
      const stat = await fs.promises.stat(base);
      const file = new Vinyl({
        path: base,
        stat,
        cwd,
        base: path.dirname(base),
        contents: stat.isDirectory() ? null : await fs.promises.readFile(base)
      });
      if (doesSince(file, since)) yield file;
      continue;
    }

    for await (const fileOpts of walk(base)) {
      if (matcher.doesMatch(fileOpts.path) && negative.every((m) => m.doesMatch(fileOpts.path))) {
        // TODO source-map init
        const file = new Vinyl({
          ...fileOpts,
          cwd,
          base,
          contents: fileOpts.stat.isDirectory() ? null : await fs.promises.readFile(fileOpts.path)
        });
        if (doesSince(file, since)) yield file;
      }
    }
  }
}

export function src(patterns: string | string[], options?: SrcOptions): stream.Duplex {
  const mg = matcherGroup(patterns, options);
  // @ts-ignore
  const readable = stream.compose(glob(mg));
  return passThrough(readable);
}

