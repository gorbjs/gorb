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

interface MatcherGroup {
  cwd: string;
  positive: Matcher[];
  negative: Matcher[];
}

export function matcherGroup(patterns: string | string[], options?: micromatch.Options): MatcherGroup {
  if (!patterns) throw new Error("Missing glob pattern");
  if (typeof patterns === 'string') patterns = [patterns];
  if (!Array.isArray(patterns)) throw new Error("Unexpected glob pattern");
  if (patterns.some(p => !p)) throw new Error("glob pattern cannot be empty");
  const cwd = options?.cwd || process.cwd();

  const positiveMatchers: Matcher[] = [];
  const negativeMatchers: Matcher[] = [];

  patterns
    .map((p) =>
      path.resolve(cwd, p)
        // micromatch uses forward slash "/" even on windows.
        .replace(/\\/g, '/')
    )
    .forEach((pattern) => {
      const info = micromatch.scan(pattern, options);
      const doesMatch = micromatch.matcher(pattern, options);
      if (info.negated) {
        negativeMatchers.push({ info, doesMatch });
      } else {
        positiveMatchers.push({ info, doesMatch });
      }
    });

  if (positiveMatchers.length === 0) {
    throw new Error("Missing positive glob pattern");
  }

  return {
    cwd,
    positive: positiveMatchers,
    negative: negativeMatchers
  };
}

export async function* glob({ cwd, positive, negative }: MatcherGroup): AsyncIterable<Vinyl> {
  for (const matcher of positive) {
    const { base, input } = matcher.info;
    // pattern could be just a static string like "src/index.html".
    if (input === base) {
      // TODO source-map init
      const stat = await fs.promises.stat(base);
      yield new Vinyl({
        path: base,
        stat,
        cwd,
        base: path.dirname(base),
        contents: stat.isDirectory() ? null : await fs.promises.readFile(base)
      });
      continue;
    }

    for await (const fileOpts of walk(base)) {
      if (matcher.doesMatch(fileOpts.path) && negative.every((m) => m.doesMatch(fileOpts.path))) {
        // TODO source-map init
        yield new Vinyl({
          ...fileOpts,
          cwd,
          base,
          contents: fileOpts.stat.isDirectory() ? null : await fs.promises.readFile(fileOpts.path)
        });
      }
    }
  }
}

export function src(patterns: string | string[], options?: micromatch.Options): stream.Duplex {
  const mg = matcherGroup(patterns, options);
  // @ts-ignore
  const readable = stream.compose(glob(mg));
  return passThrough(readable);
}

