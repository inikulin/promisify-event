var Promise = require('pinkie-promise');

function promisifyEvent (emitter, event) {
    var listener = null;

    var promise = new Promise(function (resolve, reject) {
        listener = function () {
            var args = null;

            if (arguments.length === 1)
                args = arguments[0];
            else {
                args = [];

                for (var i = 0; i < arguments.length; i++)
                    args.push(arguments[i]);
            }

            event === 'error' ? reject(args) : resolve(args);
        };

        emitter.once(event, listener);
    });

    promise.cancel = function () {
        emitter.removeListener(event, listener);
    };

    return promise;
}

function _isThenable (obj) {
    return typeof obj.then === 'function';
}

function _isEmitter (obj) {
    return typeof obj.once === 'function';
}

function _parseRaceArgs (args) {
    var n = args.length;
    var i = 0;
    var promises = [];

    while (i < n) {
        if (_isThenable(args[i])) {
            promises.push(args[i]);
            i += 1;
            continue;
        }

        if (_isEmitter(args[i]) && i + 1 < n && typeof args[i+1] === 'string') {
            promises.push(promisifyEvent(args[i], args[i+1]));
            i += 2;
            continue;
        }

        throw new Error('Wrong arguments');
    }

    return promises;
}

function _getPromisesCancellations (promises) {
    return promises.map(function (promise){
        if (typeof promise.cancel !== 'function')
            return void 0;

        return promise.cancel();
    });
}

function _wrapRacePromises (promises) {
    return promises.map(function (promise, index) {
        return promise
            .then(function (result){
                return { index: index, result: result };
            })
            .catch(function (error){
                return { index: index, error: error }
            });
    });
}

function raceEvents (args) {
    var promises = _parseRaceArgs(args);

    return Promise
        .race(_wrapRacePromises(promises))
        .then(function (result) {
            promises.splice(result.index, 1);

            return Promise.all(_getPromisesCancellations(promises))
                .then(function () {
                    if (result.error)
                        throw result.error;

                    return result.result;
                });
        });
}

module.exports = promisifyEvent;
module.exports.race = raceEvents;
