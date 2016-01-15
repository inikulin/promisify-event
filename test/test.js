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

describe('Race', function () {
    it('Should race multiple events', function () {
        var emitter = new EventEmitter();

        var promise = promisifyEvent.race([
            emitter, 'test-event1',
            emitter, 'test-event2',
            emitter, 'test-event3'
        ]);

        emitter.emit('test-event2', 'test2', 'data2');

        return promise
            .then(function (res) {
                assert.deepEqual(res, ['test2', 'data2']);
                assert.strictEqual(emitter.listeners('test-event1').length, 0);
                assert.strictEqual(emitter.listeners('test-event2').length, 0);
                assert.strictEqual(emitter.listeners('test-event3').length, 0);
            })
    });

    it('Should race multiple events along with error', function () {
        var emitter = new EventEmitter();

        var promise = promisifyEvent.race([
            emitter, 'test-event1',
            emitter, 'test-event2',
            emitter, 'error'
        ]);

        emitter.emit('error', 'error-data');

        return promise
            .then(function () {
                throw new Error('Promise rejection expected!');
            })
            .catch(function (err) {
                assert.strictEqual(err, 'error-data');
                assert.strictEqual(emitter.listeners('test-event1').length, 0);
                assert.strictEqual(emitter.listeners('test-event2').length, 0);
                assert.strictEqual(emitter.listeners('test-event3').length, 0);
            })
    });

    it('Should race multiple events along with another promises', function () {
            var emitter = new EventEmitter();

            var promise = promisifyEvent.race([
                emitter, 'test-event1',
                new Promise(function (resolve) {
                    setTimeout(function () {
                        resolve('timeout1')
                    }, 100);
                }),
                emitter, 'test-event2',
                new Promise(function (resolve) {
                    setTimeout(function () {
                        resolve('timeout2')
                    }, 150);
                }),
                emitter, 'test-event3'
            ]);

            return promise
                .then(function (res) {
                    assert.strictEqual(res, 'timeout1');
                    assert.strictEqual(emitter.listeners('test-event1').length, 0);
                    assert.strictEqual(emitter.listeners('test-event2').length, 0);
                    assert.strictEqual(emitter.listeners('test-event3').length, 0);
                })
        });
});
