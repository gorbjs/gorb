import test from 'ava';
import * as path from 'path';
import * as fs from 'fs';
import * as stream from 'stream';
import { Vinyl } from '@gorb/shared';
import _ from 'lodash';
import { src } from '../src';

const cwd = process.cwd();

interface FileSample {
  relative: string;
  base: string;
  contents: string | null;
}

// replace \ with / on win32
function normalize(p: string): string {
  return p.replaceAll('\\', '/');
}

function map(files: Vinyl[]): FileSample[] {
  const samples = files.map((f) => ({
    relative: normalize(f.relative),
    base: normalize(path.relative(process.cwd(), f.base)),
    // Normalise win32 line separator too.
    contents: (f.contents ? f.contents.toString('utf8').replaceAll('\r\n', '\n') : null)
  }));
  return _.sortBy(samples, ['base', 'relative']);
}

test('src throws on invalid input', async (t) => {
  // @ts-ignore
  t.throws(() => src());
  t.throws(() => src(''));
  t.throws(() => src(['']));
  t.throws(() => src([]));
  // @ts-ignore
  t.throws(() => src(123));
  // @ts-ignore
  t.throws(() => src([['./fixtures/*.coffee']]));
});

test('src emits an error on file not existing', async (t) => {
  // @ts-ignore
  await t.throwsAsync(async () => await src('test_files/not-exist').toArray());
});

test('src pipe files matching single file', async (t) => {
  // @ts-ignore: wait for @types/node to add readable.toArray
  const files: Vinyl[] = await src('test_files/src/a.js').toArray();
  t.is(files.length, 1);
  t.deepEqual(map(files), [
    { relative: 'a.js', base: 'test_files/src', contents: '// a\n' },
  ]);
});

test('src passes through write', async (t) => {
  const s = src('test_files/src/a.js');
  const cwd = process.cwd();
  const anotherInput = stream.Readable.from([new Vinyl({
    path: path.join(cwd, 'mock', 'file.txt'),
    base: path.join(cwd, 'mock'),
    contents: Buffer.from("mock-file")
  })]);
  // @ts-ignore: wait for @types/node to add readable.toArray
  const files: Vinyl[] = await anotherInput.pipe(s).toArray();
  t.is(files.length, 2);
  t.deepEqual(map(files), [
    { relative: 'file.txt', base: 'mock', contents: 'mock-file' },
    { relative: 'a.js', base: 'test_files/src', contents: '// a\n' }
  ]);
});

test('src pipe files matching single pattern', async (t) => {
  // @ts-ignore: wait for @types/node to add readable.toArray
  const files: Vinyl[] = await src('test_files/**/*.js').toArray();
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
  const files: Vinyl[] = await src(['test_files/src/**/*.js', 'test_files/test/**/*.js']).toArray();
  t.is(files.length, 5);
  t.deepEqual(map(files), [
    { relative: 'a.js', base: 'test_files/src', contents: '// a\n' },
    { relative: 'a.test.js', base: 'test_files/test', contents: '// a.test\n' },
    { relative: 'a__test__.js', base: 'test_files/test', contents: '// a__test__\n' },
    { relative: 'b.test.js', base: 'test_files/test', contents: '// b.test\n' },
    { relative: 'setup.js', base: 'test_files/test', contents: '// setup\n' },
  ]);
});

test('src pipe files matching single pattern with cwd option', async (t) => {
  // @ts-ignore: wait for @types/node to add readable.toArray
  const files: Vinyl[] = await src('**/*.js', { cwd: path.join(cwd, 'test_files') }).toArray();
  t.is(files.length, 5);
  t.deepEqual(map(files), [
    { relative: 'src/a.js', base: 'test_files', contents: '// a\n' },
    { relative: 'test/a.test.js', base: 'test_files', contents: '// a.test\n' },
    { relative: 'test/a__test__.js', base: 'test_files', contents: '// a__test__\n' },
    { relative: 'test/b.test.js', base: 'test_files', contents: '// b.test\n' },
    { relative: 'test/setup.js', base: 'test_files', contents: '// setup\n' },
  ]);
});

test('src pipe files matching patterns with cwd option', async (t) => {
  // @ts-ignore: wait for @types/node to add readable.toArray
  const files: Vinyl[] = await src(['src/**/*.js', 'test/**/*.js'], { cwd: path.join(cwd, 'test_files') }).toArray();
  t.is(files.length, 5);
  t.deepEqual(map(files), [
    { relative: 'a.js', base: 'test_files/src', contents: '// a\n' },
    { relative: 'a.test.js', base: 'test_files/test', contents: '// a.test\n' },
    { relative: 'a__test__.js', base: 'test_files/test', contents: '// a__test__\n' },
    { relative: 'b.test.js', base: 'test_files/test', contents: '// b.test\n' },
    { relative: 'setup.js', base: 'test_files/test', contents: '// setup\n' },
  ]);
});

test('src pipe files matching single pattern with relative cwd option', async (t) => {
  // @ts-ignore: wait for @types/node to add readable.toArray
  const files: Vinyl[] = await src('**/*.js', { cwd: 'test_files' }).toArray();
  t.is(files.length, 5);
  t.deepEqual(map(files), [
    { relative: 'src/a.js', base: 'test_files', contents: '// a\n' },
    { relative: 'test/a.test.js', base: 'test_files', contents: '// a.test\n' },
    { relative: 'test/a__test__.js', base: 'test_files', contents: '// a__test__\n' },
    { relative: 'test/b.test.js', base: 'test_files', contents: '// b.test\n' },
    { relative: 'test/setup.js', base: 'test_files', contents: '// setup\n' },
  ]);
});

test('src pipe files matching patterns with relative cwd option', async (t) => {
  // @ts-ignore: wait for @types/node to add readable.toArray
  const files: Vinyl[] = await src(['src/**/*.js', 'test/**/*.js'], { cwd: 'test_files' }).toArray();
  t.is(files.length, 5);
  t.deepEqual(map(files), [
    { relative: 'a.js', base: 'test_files/src', contents: '// a\n' },
    { relative: 'a.test.js', base: 'test_files/test', contents: '// a.test\n' },
    { relative: 'a__test__.js', base: 'test_files/test', contents: '// a__test__\n' },
    { relative: 'b.test.js', base: 'test_files/test', contents: '// b.test\n' },
    { relative: 'setup.js', base: 'test_files/test', contents: '// setup\n' },
  ]);
});

test('src globs a directory', async (t) => {
  // @ts-ignore: wait for @types/node to add readable.toArray
  const files: Vinyl[] = await src('test_files/sr*/').toArray();
  t.is(files.length, 1);
  t.deepEqual(map(files), [
    { relative: 'src', base: 'test_files', contents: null }
  ]);
});

test('src globs a directory with cwd option', async (t) => {
  // @ts-ignore: wait for @types/node to add readable.toArray
  const files: Vinyl[] = await src('sr*', { cwd: path.join(cwd, 'test_files') }).toArray();
  t.is(files.length, 1);
  t.deepEqual(map(files), [
    { relative: 'src', base: 'test_files', contents: null }
  ]);
});

test('src globs a directory with relative cwd option', async (t) => {
  // @ts-ignore: wait for @types/node to add readable.toArray
  const files: Vinyl[] = await src('sr*', { cwd: 'test_files' }).toArray();
  t.is(files.length, 1);
  t.deepEqual(map(files), [
    { relative: 'src', base: 'test_files', contents: null }
  ]);
});

test('src globs directories', async (t) => {
  // @ts-ignore: wait for @types/node to add readable.toArray
  const files: Vinyl[] = await src(['test_files/sr*', 'test_files/test']).toArray();
  t.is(files.length, 2);
  t.deepEqual(map(files), [
    { relative: 'src', base: 'test_files', contents: null },
    { relative: 'test', base: 'test_files', contents: null }
  ]);
});

test('src globs directories with cwd option', async (t) => {
  // @ts-ignore: wait for @types/node to add readable.toArray
  const files: Vinyl[] = await src(['sr*', 'test'], { cwd: path.join(cwd, 'test_files') }).toArray();
  t.is(files.length, 2);
  t.deepEqual(map(files), [
    { relative: 'src', base: 'test_files', contents: null },
    { relative: 'test', base: 'test_files', contents: null }
  ]);
});

test('src globs directories with relative cwd option', async (t) => {
  // @ts-ignore: wait for @types/node to add readable.toArray
  const files: Vinyl[] = await src(['sr*', 'test'], { cwd: 'test_files' }).toArray();
  t.is(files.length, 2);
  t.deepEqual(map(files), [
    { relative: 'src', base: 'test_files', contents: null },
    { relative: 'test', base: 'test_files', contents: null }
  ]);
});

test('src globs mix of files and directories', async (t) => {
  // @ts-ignore: wait for @types/node to add readable.toArray
  const files: Vinyl[] = await src('test_files/**/(empty|*.spec.md)').toArray();
  t.is(files.length, 2);
  t.deepEqual(map(files), [
    { relative: 'src/a.spec.md', base: 'test_files', contents: '# A spec\n' },
    { relative: 'src/empty', base: 'test_files', contents: null }
  ]);
});

test('src globs mix of files and directories with cwd option', async (t) => {
  // @ts-ignore: wait for @types/node to add readable.toArray
  const files: Vinyl[] = await src('**/(empty|*.spec.md)', { cwd: path.join(cwd, 'test_files') }).toArray();
  t.is(files.length, 2);
  t.deepEqual(map(files), [
    { relative: 'src/a.spec.md', base: 'test_files', contents: '# A spec\n' },
    { relative: 'src/empty', base: 'test_files', contents: null }
  ]);
});

test('src globs mix of files and directories with relative cwd option', async (t) => {
  // @ts-ignore: wait for @types/node to add readable.toArray
  const files: Vinyl[] = await src('**/(empty|*.spec.md)', { cwd: 'test_files' }).toArray();
  t.is(files.length, 2);
  t.deepEqual(map(files), [
    { relative: 'src/a.spec.md', base: 'test_files', contents: '# A spec\n' },
    { relative: 'src/empty', base: 'test_files', contents: null }
  ]);
});

test('src globs file after since', async (t) => {
  const inputPath = 'test_files/src/a.js';
  const lastUpdateDate = new Date(fs.statSync(inputPath).mtime.getTime() - 1000);
  // @ts-ignore: wait for @types/node to add readable.toArray
  const files: Vinyl[] = await src(inputPath, { since: lastUpdateDate }).toArray();
  t.is(files.length, 1);
  t.deepEqual(map(files), [
    { relative: 'a.js', base: 'test_files/src', contents: '// a\n' }
  ]);
});

test('src does not glob file before since', async (t) => {
  const inputPath = 'test_files/src/a.js';
  const lastUpdateDate = new Date(fs.statSync(inputPath).mtime.getTime() + 1000);
  // @ts-ignore: wait for @types/node to add readable.toArray
  const files: Vinyl[] = await src(inputPath, { since: lastUpdateDate }).toArray();
  t.is(files.length, 0);
});

test('src globs file after since number', async (t) => {
  const inputPath = 'test_files/src/a.js';
  const lastUpdateDate = fs.statSync(inputPath).mtime.getTime() - 1000;
  // @ts-ignore: wait for @types/node to add readable.toArray
  const files: Vinyl[] = await src(inputPath, { since: lastUpdateDate }).toArray();
  t.is(files.length, 1);
  t.deepEqual(map(files), [
    { relative: 'a.js', base: 'test_files/src', contents: '// a\n' }
  ]);
});

test('src does not glob file before since number', async (t) => {
  const inputPath = 'test_files/src/a.js';
  const lastUpdateDate = fs.statSync(inputPath).mtime.getTime() + 1000;
  // @ts-ignore: wait for @types/node to add readable.toArray
  const files: Vinyl[] = await src(inputPath, { since: lastUpdateDate }).toArray();
  t.is(files.length, 0);
});

test('src globs file after since function', async (t) => {
  const inputPath = 'test_files/src/a.js';
  const lastUpdateDate = (file: Vinyl) => new Date(file.stat.mtime.getTime() - 1000);
  // @ts-ignore: wait for @types/node to add readable.toArray
  const files: Vinyl[] = await src(inputPath, { since: lastUpdateDate }).toArray();
  t.is(files.length, 1);
  t.deepEqual(map(files), [
    { relative: 'a.js', base: 'test_files/src', contents: '// a\n' }
  ]);
});

test('src does not glob file before since function', async (t) => {
  const inputPath = 'test_files/src/a.js';
  const lastUpdateDate = (file: Vinyl) => file.stat.mtime.getTime() + 1000;
  // @ts-ignore: wait for @types/node to add readable.toArray
  const files: Vinyl[] = await src(inputPath, { since: lastUpdateDate }).toArray();
  t.is(files.length, 0);
});
