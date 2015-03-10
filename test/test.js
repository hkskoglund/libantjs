var assert = require("assert");
ResetSystemMessage = require('../messages/ResetSystemMessage');

/*
describe('Array', function(){
  describe('#indexOf()', function(){
    it('should return -1 when the value is not present', function(){
      assert.equal(-1, [1,2,3].indexOf(5));
      assert.equal(-1, [1,2,3].indexOf(0));
    })
  })
})
*/

describe('ResetSystemMessage', function() {
  var reset = new ResetSystemMessage(),
    rawReset = reset.getRawMessage();

  it('should have SYNC 0xa4 at byte 0', function() {
    assert.equal(0xa4, rawReset[0]);
  });

  it('should have LENGTH 1 at byte 1', function() {
    assert.equal(1, rawReset[1]);
  });

  it('should have ID ' + "74".toString(16) + ' at byte 2', function() {
    assert.equal(74, rawReset[2]);
  });

  it('should have 0 at byte 3', function() {
    assert.equal(0, rawReset[3]);
  });

  it('should have 0xea at byte 4', function() {
    assert.equal(0xef, rawReset[4]);
  });

});