import test from 'ava';
import * as stream from 'stream';
import { merge } from '../src';


interface TestUnit {
  value: string;
  type: string;
}

function testUnit(value: string, type: string): TestUnit {
  return { value, type };
}

test('merge throws if input is empty', async (t) => {
  t.throws(() => merge());
});

test('merge wrapps readable', async (t) => {
  const readable = stream.Readable.from([
    testUnit('a', '.js'),
    testUnit('b', '.md')
  ]);

  // @ts-ignore: wait for @types/node to add readable.toArray
  const units = await merge(readable).toArray();
  t.is(units.length, 2);
  t.deepEqual(units, [
    { value: 'a', type: '.js' },
    { value: 'b', type: '.md' },
  ])
});

test('merge merges readable', async (t) => {
  const readable1 = stream.Readable.from([
    testUnit('a', '.js'),
    testUnit('b', '.md')
  ]);

  const readable2 = stream.Readable.from([
    testUnit('c', '.ts'),
    testUnit('d', '.css')
  ]);

  // @ts-ignore: wait for @types/node to add readable.toArray
  const units = await merge(readable1, readable2).toArray();
  t.is(units.length, 4);
  t.deepEqual(units, [
    { value: 'a', type: '.js' },
    { value: 'b', type: '.md' },
    { value: 'c', type: '.ts' },
    { value: 'd', type: '.css' },
  ])
});


test('merge isolates multiple transoforms', async (t) => {
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
  const units = await merge(readable1, readable2).toArray();
  t.is(units.length, 4);
  t.deepEqual(units, [
    { value: 'a#', type: '.js' },
    { value: 'b#', type: '.md' },
    { value: 'c!', type: '.ts' },
    { value: 'd!', type: '.css' },
  ])
});

test('merge re-emits error', async (t) => {
  // @ts-ignore: wait for @types/node to add stream.compose
  const readable = stream.compose(async function *() {
    yield testUnit('a', '.js');
    throw new Error("test");
  });

  try {
    // @ts-ignore: wait for @types/node to add readable.toArray
    await merge(readable).toArray();
    t.fail("should not pass");
  } catch (e) {
    t.is(e.message, "test");
  }
});

test('merge re-emits error, case 2', async (t) => {
  const readable1 = stream.Readable.from([
    testUnit('a', '.js'),
    testUnit('b', '.md')
  ]);
  // @ts-ignore: wait for @types/node to add stream.compose
  const readable2 = stream.compose(async function *() {
    yield testUnit('a', '.js');
    throw new Error("test");
  });

  try {
    // @ts-ignore: wait for @types/node to add readable.toArray
    await merge(readable1, readable2).toArray();
    t.fail("should not pass");
  } catch (e) {
    t.is(e.message, "test");
  }
});
