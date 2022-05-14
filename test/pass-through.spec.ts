import test from 'ava';
import * as stream from 'stream';
import { passThrough } from '../src';

interface TestUnit {
  value: string;
  type: string;
}

function testUnit(value: string, type: string): TestUnit {
  return { value, type };
}

test('passThrough wrapps readable', async (t) => {
  const readable = stream.Readable.from([
    testUnit('a', '.js'),
    testUnit('b', '.md')
  ]);

  // @ts-ignore: wait for @types/node to add readable.toArray
  const units = await passThrough(readable).toArray();
  t.is(units.length, 2);
  t.deepEqual(units, [
    { value: 'a', type: '.js' },
    { value: 'b', type: '.md' },
  ])
});

test('passThrough passes through readable', async (t) => {
  const readable1 = stream.Readable.from([
    testUnit('a', '.js'),
    testUnit('b', '.md')
  ]);

  const readable2 = stream.Readable.from([
    testUnit('c', '.ts'),
    testUnit('d', '.css')
  ]);

  // @ts-ignore: wait for @types/node to add readable.toArray
  const units = await readable1.pipe(passThrough(readable2)).toArray();
  t.is(units.length, 4);
  t.deepEqual(units, [
    { value: 'a', type: '.js' },
    { value: 'b', type: '.md' },
    { value: 'c', type: '.ts' },
    { value: 'd', type: '.css' },
  ])
});

test('passThrough works at start of a pipeline', async (t) => {
  const readable1 = stream.Readable.from([
    testUnit('a', '.js'),
    testUnit('b', '.md')
  ]);

  const readable2 = stream.Readable.from([
    testUnit('c', '.ts'),
    testUnit('d', '.css')
  ]);

  // @ts-ignore: wait for @types/node to add readable.toArray
  const units = await passThrough(readable1).pipe(passThrough(readable2)).toArray();
  t.is(units.length, 4);
  t.deepEqual(units, [
    { value: 'a', type: '.js' },
    { value: 'b', type: '.md' },
    { value: 'c', type: '.ts' },
    { value: 'd', type: '.css' },
  ])
});

test('passThrough passes through readable and isolates transoforms', async (t) => {
  const readable1 = stream.Readable.from([
    testUnit('a', '.js'),
    testUnit('b', '.md')
  ]);

  const readable2 = stream.Readable.from([
    testUnit('c', '.ts'),
    testUnit('d', '.css')
  ]).pipe(new stream.Transform({
    objectMode: true,
    transform(file: TestUnit, enc: BufferEncoding, callback: stream.TransformCallback) {
      file.value += "!";
      callback(null, file);
    }
  }));

  // @ts-ignore: wait for @types/node to add readable.toArray
  const units = await readable1.pipe(passThrough(readable2)).toArray();
  t.is(units.length, 4);
  t.deepEqual(units, [
    { value: 'a', type: '.js' },
    { value: 'b', type: '.md' },
    { value: 'c!', type: '.ts' },
    { value: 'd!', type: '.css' },
  ])
});

test('passThrough passes through readable and isolates multiple transoforms', async (t) => {
  const readable1 = stream.Readable.from([
    testUnit('a', '.js'),
    testUnit('b', '.md')
  ]).pipe(new stream.Transform({
    objectMode: true,
    transform(file: TestUnit, enc: BufferEncoding, callback: stream.TransformCallback) {
      file.value += "#";
      callback(null, file);
    }
  }));

  const readable2 = stream.Readable.from([
    testUnit('c', '.ts'),
    testUnit('d', '.css')
  ]).pipe(new stream.Transform({
    objectMode: true,
    transform(file: TestUnit, enc: BufferEncoding, callback: stream.TransformCallback) {
      file.value += "!";
      callback(null, file);
    }
  }));

  // @ts-ignore: wait for @types/node to add readable.toArray
  const units = await passThrough(readable1).pipe(passThrough(readable2)).toArray();
  t.is(units.length, 4);
  t.deepEqual(units, [
    { value: 'a#', type: '.js' },
    { value: 'b#', type: '.md' },
    { value: 'c!', type: '.ts' },
    { value: 'd!', type: '.css' },
  ])
});

test('passThrough re-emits error', async (t) => {
  // @ts-ignore: wait for @types/node to add stream.compose
  const readable = stream.compose(async function *() {
    yield testUnit('a', '.js');
    throw new Error("test");
  });

  try {
    // @ts-ignore: wait for @types/node to add readable.toArray
    await passThrough(readable).toArray();
    t.fail("should not pass");
  } catch (e) {
    t.is(e.message, "test");
  }
});
