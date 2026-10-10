'use strict';
import Message from '../message.js';

class SetUsbDescriptorStringMessage extends Message {
  constructor(stringNumber, characters) {
    super(undefined, Message.SET_USB_DESCRIPTOR_STRING);
    this.encode(stringNumber, characters);
  }

  encode(stringNumber, characters) {
    const bytes = typeof characters === 'string' ? Buffer.from(characters, 'latin1') : Uint8Array.from(characters);
    // Strings 1-3 are null terminated, string 0 is the raw VID/PID
    const terminator = stringNumber === 0 ? 0 : 1;
    const content = new Uint8Array(1 + bytes.length + terminator);

    if (stringNumber < 0 || stringNumber > 3)
      throw new RangeError('USB descriptor string number must be between 0 and 3');
    if (stringNumber === 0 && bytes.length !== 4)
      throw new RangeError('USB descriptor string 0 must be 4 bytes (VID/PID)');

    content[0] = stringNumber;
    content.set(bytes, 1);

    this.stringNumber = stringNumber;
    this.setContent(content);
  }

  toString() {
    return Message.prototype.toString.call(this) + " string " + this.stringNumber;
  }
}

export default SetUsbDescriptorStringMessage;
