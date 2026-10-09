'use strict';

class State {
  constructor(state) {
    this.state = state || State.prototype.LINK;
  }

  get() {
    return this.state;
  }

  setLink() {
    this.set(State.prototype.LINK);
  }

  set(state) {
    const prevState = this.state;
    if (state !== prevState) {
      this.state = state;
    }
  }

  isLink() {
    return this.state === State.prototype.LINK;
  }

  isAuthentication() {
    return this.state === State.prototype.AUTHENTICATION;
  }

  isTransport() {
    return this.state === State.prototype.TRANSPORT;
  }

  isBusy() {
    return this.state === State.prototype.BUSY;
  }

  toString() {

    switch (this.state) {

      case State.prototype.LINK:
        return "LINK";

      case State.prototype.AUTHENTICATION:
        return "AUTHENTICATION";

      case State.prototype.TRANSPORT:
        return "TRANSPORT";
        
      case State.prototype.BUSY:
        return "BUSY";
    }
  }
}

State.prototype.LINK = 0x00;
State.prototype.AUTHENTICATION = 0x01;
State.prototype.TRANSPORT = 0x02;
State.prototype.BUSY = 0x03;

module.exports = State;
