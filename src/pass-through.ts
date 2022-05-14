import * as stream from 'stream';

// https://github.com/gulpjs/to-through
export function passThrough(readable: stream.Readable): stream.Transform {
  const wrapper = new stream.Transform({
    objectMode: true,
    transform(chunk: any, encoding: BufferEncoding, callback: stream.TransformCallback) {
      // pass through incoming chunks.
      callback(null, chunk);
    },
    async flush(callback: stream.TransformCallback) {
      try {
        for await (const chunk of readable) {
          this.push(chunk);
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
