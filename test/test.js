var assert         = require('assert');
var EventEmitter   = require('events').EventEmitter;
var Promise        = require('pinkie-promise');
var promisifyEvent = require('../');

it('Should resolve promise on event', function () {
    var emitter = new EventEmitter();
    var promise = promisifyEvent(emitter, 'test-event');

    emitter.emit('test-event', 'yo');

    return promise
        .then(function (val) {
            assert.strictEqual(val, 'yo');
            assert.strictEqual(emitter.listeners('test-event').length, 0);
        });
});

it('Should convert multiple event arguments to array', function () {
    var emitter = new EventEmitter();
    var promise = promisifyEvent(emitter, 'test-event');

    emitter.emit('test-event', 'yo', '42');

    return promise
        .then(function (val) {
            assert.deepEqual(val, ['yo', '42']);
        });
});

it('Should reject promise on `error` event', function () {
    var emitter = new EventEmitter();
    var promise = promisifyEvent(emitter, 'error');

    emitter.emit('error', 'yo');

    return promise
        .then(function () {
            throw 'Promise rejection expected.';
        })
        .catch(function (val) {
            assert.strictEqual(val, 'yo');
        });
});

it('Should cancel event promise and subscription', function () {
    var emitter = new EventEmitter();
    var promise = promisifyEvent(emitter, 'test-event');

    promise.cancel();
    assert.strictEqual(emitter.listeners('test-event').length, 0);
    emitter.emit('test-event', 'yo');

    promise = promise
        .then(function () {
            throw 'Promise cancellation expected.';
        });

    return Promise.race([
        new Promise(function (resolve) {
            setTimeout(resolve, 100);
        }),
        promise
    ]);
});
