import * as fs from 'fs';
import * as path from 'path';
import * as stream from 'stream';
import * as micromatch from 'micromatch';
import { Vinyl } from '@gorb/shared';

interface PathWithStat {
  path: string;
  stat: fs.Stats;
}

// walk recursively to yield file path and stat.
export async function* walk(dir: string): AsyncIterableIterator<PathWithStat> {
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

export async function* glob(patterns: string | string[], options?: micromatch.Options): AsyncIterableIterator<Vinyl> {
  if (typeof patterns === 'string') patterns = [patterns];
  const cwd = options?.cwd || process.cwd();

  const positiveMatchers: Matcher[] = [];
  const negativeMatchers: Matcher[] = [];

  patterns.forEach((pattern) => {
    const info = micromatch.scan(pattern, options);
    const doesMatch = micromatch.matcher(pattern, options);
    if (info.negated) {
      negativeMatchers.push({ info, doesMatch });
    } else {
      positiveMatchers.push({ info, doesMatch });
    }
  });

  if (positiveMatchers.length === 0) {
    throw new Error("Missing positive glob");
  }

  for (const matcher of positiveMatchers) {
    const base = path.join(cwd, matcher.info.base);

    // pattern could be just a static string like "src/index.html".
    if (matcher.info.input === matcher.info.base) {
      // TODO source-map init
      const stat = await fs.promises.stat(base);
      yield new Vinyl({
        path: base,
        stat,
        cwd,
        base,
        contents: stat.isDirectory() ? null : await fs.promises.readFile(base)
      });
      continue;
    }
    for await (const fileOpts of walk(base)) {
      if (matcher.doesMatch(fileOpts.path) && negativeMatchers.every((m) => m.doesMatch(fileOpts.path))) {
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

export function src(patterns: string | string[], options?: micromatch.Options): stream.Readable {
  // TODO wait for @types/node to provide stream.compose
  return stream['compose'](glob(patterns, options));
}

