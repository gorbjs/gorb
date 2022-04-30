import test from 'ava';
import * as path from 'path';
import { Vinyl } from '@gorb/shared';
import _ from 'lodash';
import { src } from '../src';

interface FileSample {
  relative: string;
  base: string;
  contents: string | void;
}

function map(files: Vinyl[]): FileSample[] {
  return files.map((f) => ({
    relative: path.posix.normalize(f.relative),
    base: path.posix.normalize(path.relative(process.cwd(), f.base)),
    contents: f.contents?.toString('utf8')
  }));
}

test('src pipe files matching single file', async (t) => {
  // @ts-ignore: wait for @types/node to add readable.toArray
  let files: Vinyl[] = await src('test_files/src/a.js').toArray();
  files = _.sortBy(files, 'path');
  t.is(files.length, 1);
  t.deepEqual(map(files), [
    { relative: 'a.js', base: 'test_files/src', contents: '// a\n' },
  ]);
});

test('src pipe files matching single pattern', async (t) => {
  // @ts-ignore: wait for @types/node to add readable.toArray
  let files: Vinyl[] = await src('test_files/**/*.js').toArray();
  files = _.sortBy(files, 'path');
  t.is(files.length, 5);
  t.deepEqual(map(files), [
    { relative: 'src/a.js', base: 'test_files', contents: '// a\n' },
    { relative: 'test/a.test.js', base: 'test_files', contents: '// a.test\n' },
    { relative: 'test/a__test__.js', base: 'test_files', contents: '// a__test__\n' },
    { relative: 'test/b.test.js', base: 'test_files', contents: '// b.test\n' },
    { relative: 'test/setup.js', base: 'test_files', contents: '// setup\n' },
  ]);
});

test('src pipe files matching patterns', async (t) => {
  // @ts-ignore: wait for @types/node to add readable.toArray
  let files: Vinyl[] = await src(['test_files/src/**/*.js', 'test_files/test/**/*.js']).toArray();
  files = _.sortBy(files, 'path');
  t.is(files.length, 5);
  t.deepEqual(map(files), [
    { relative: 'a.js', base: 'test_files/src', contents: '// a\n' },
    { relative: 'a.test.js', base: 'test_files/test', contents: '// a.test\n' },
    { relative: 'a__test__.js', base: 'test_files/test', contents: '// a__test__\n' },
    { relative: 'b.test.js', base: 'test_files/test', contents: '// b.test\n' },
    { relative: 'setup.js', base: 'test_files/test', contents: '// setup\n' },
  ]);
});
