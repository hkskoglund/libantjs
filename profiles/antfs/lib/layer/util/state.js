'use strict';

class State {
  constructor(state) {
    this.state = state || State.LINK;
  }

  get() {
    return this.state;
  }

  setLink() {
    this.set(State.LINK);
  }

  set(state) {
    const prevState = this.state;
    if (state !== prevState) {
      this.state = state;
    }
  }

  isLink() {
    return this.state === State.LINK;
  }

  isAuthentication() {
    return this.state === State.AUTHENTICATION;
  }

  isTransport() {
    return this.state === State.TRANSPORT;
  }

  isBusy() {
    return this.state === State.BUSY;
  }

  toString() {

    switch (this.state) {

      case State.LINK:
        return "LINK";

      case State.AUTHENTICATION:
        return "AUTHENTICATION";

      case State.TRANSPORT:
        return "TRANSPORT";

      case State.BUSY:
        return "BUSY";
    }
  }

  static LINK = 0x00;
  static AUTHENTICATION = 0x01;
  static TRANSPORT = 0x02;
  static BUSY = 0x03;
}






export default State;
