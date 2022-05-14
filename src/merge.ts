import * as stream from 'stream';
import { passThrough } from './pass-through';

export function merge(...readables: stream.Readable[]): stream.Readable {
  if (!readables || readables.length < 1) {
    throw new Error("No readable streams to merge.");
  }

  const [ readable, ...rest ] = readables;
  let out = readable;
  for (const other of rest) {
    out = readable.pipe(passThrough(other));
  }
  return out;
}
