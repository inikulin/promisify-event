module.exports = (emitter, event) => {
  let listener;

  const promise = new Promise((resolve, reject) => {
    listener = (...args) => {
      let promArgs = args;
      if(args.length <= 1) [promArgs] = args;
      event === 'error' ? reject(promArgs) : resolve(promArgs);
    }
    emitter.once(event, listener);
  });
  promise.cancel = () => emitter.removeListener(event, listener);
  return promise;
};
