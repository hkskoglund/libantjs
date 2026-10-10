'use strict';

class Concat {
  concat(buffer1, buffer2) {
    if (!buffer1)
      buffer1 = new Uint8Array(0);
    if (!buffer2)
      buffer2 = new Uint8Array(0);

    const result = new Uint8Array(buffer1.byteLength + buffer2.byteLength);

    result.set(new Uint8Array(buffer1), 0);
    result.set(new Uint8Array(buffer2), buffer1.byteLength);

    return result;
  }
}

export default Concat;
