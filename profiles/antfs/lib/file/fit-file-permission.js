'use strict';

class FitFilePermission {
  constructor(flags) {
    this.flags = flags;

    this.selected = this.flags & FitFilePermission.BIT_MASK.SELECTED ? true : false;
  }

  toString() {
    if (this.selected)
      return 'Selected : User selected';
    else
      return 'Selected : NO';
  }

  static BIT_MASK = {
  SELECTED: 0x01 // Selected (file is user selected)
};
}



module.exports = FitFilePermission;
