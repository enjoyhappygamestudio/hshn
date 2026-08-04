const { ReadableStream, TransformStream, WritableStream } = require('stream/web');
globalThis.ReadableStream = ReadableStream;
globalThis.TransformStream = TransformStream;
globalThis.WritableStream = WritableStream;

const os = require('os');
if (!os.availableParallelism) {
  os.availableParallelism = () => os.cpus().length;
}

// Node 20+ polyfills for Node 16
if (!Array.prototype.toReversed) {
  Array.prototype.toReversed = function () {
    const copy = [...this];
    copy.reverse();
    return copy;
  };
}
if (!Array.prototype.toSorted) {
  Array.prototype.toSorted = function (compareFn) {
    const copy = [...this];
    copy.sort(compareFn);
    return copy;
  };
}
if (!Array.prototype.toSpliced) {
  Array.prototype.toSpliced = function (start, deleteCount, ...items) {
    const copy = [...this];
    copy.splice(start, deleteCount, ...items);
    return copy;
  };
}
if (!Array.prototype.findLast) {
  Array.prototype.findLast = function (predicate, thisArg) {
    for (let i = this.length - 1; i >= 0; i--) {
      if (predicate.call(thisArg, this[i], i, this)) return this[i];
    }
    return undefined;
  };
}
