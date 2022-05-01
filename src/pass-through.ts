import * as stream from 'stream';

// https://github.com/gulpjs/to-through
export function passThrough<T>(generator: AsyncIterable<T>): stream.Transform {
  const wrapper = new stream.Transform({
    objectMode: true,
    transform(file: T, encoding: BufferEncoding, callback: stream.TransformCallback) {
      // pass through incoming files.
      callback(null, file);
    },
    async flush(callback: stream.TransformCallback) {
      try {
        for await (const file of generator) {
          this.push(file);
        }
      } catch (e) {
        callback(e);
        return;
      }
      callback();
    }
  });

  let shouldFlow = true;
  wrapper.once('pipe', onPipe);
  wrapper.on('newListener', onListener);

  function onListener(event) {
    // Once we've seen the data or readable event, check if we need to flow
    if (event === 'data' || event === 'readable') {
      maybeFlow();
      this.removeListener('newListener', onListener);
    }
  }

  function onPipe() {
    // If the wrapper is piped, disable flow
    shouldFlow = false;
  }

  function maybeFlow() {
    // If we need to flow, end the stream which triggers flush
    if (shouldFlow) {
      wrapper.end();
    }
  }

  return wrapper;
}
