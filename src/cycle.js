'use strict';
let Rx = require('rx');

function makeRequestProxies(drivers) {
  let requestProxies = {};
  for (let name in drivers) { if (drivers.hasOwnProperty(name)) {
    requestProxies[name] = new Rx.ReplaySubject(1);
  }}
  return requestProxies;
}

function callDrivers(drivers, requestProxies) {
  let responses = {};
  for (let name in drivers) { if (drivers.hasOwnProperty(name)) {
    responses[name] = drivers[name](requestProxies[name], name);
  }}
  return responses;
}

function makeDispose(requestProxies, rawResponses) {
  return function dispose() {
    for (let x in requestProxies) { if (requestProxies.hasOwnProperty(x)) {
      requestProxies[x].dispose();
    }}
    for (let name in rawResponses) {
      if (rawResponses.hasOwnProperty(name) &&
        typeof rawResponses[name].dispose === 'function')
      {
        rawResponses[name].dispose();
      }
    }
  };
}

function makeAppInput(requestProxies, rawResponses) {
  Object.defineProperty(rawResponses, 'dispose', {
    enumerable: false,
    value: makeDispose(requestProxies, rawResponses)
  });
  return rawResponses;
}

function replicateMany(original, imitators) {
  for (let name in original) { if (original.hasOwnProperty(name)) {
    if (imitators.hasOwnProperty(name) && !imitators[name].isDisposed) {
      original[name].subscribe(imitators[name].asObserver());
    }
  }}
}

function isObjectEmpty(obj) {
  for (let key in obj) {
    if (obj.hasOwnProperty(key)) {
      return false;
    }
  }
  return true;
}

function run(app, drivers) {
  if (typeof app !== 'function') {
    throw new Error('First argument given to Cycle.run() must be the `app` ' +
      'function.');
  }
  if (typeof drivers !== 'object' || drivers === null) {
    throw new Error('Second argument given to Cycle.run() must be an object ' +
      'with driver functions as properties.');
  }
  if (isObjectEmpty(drivers)) {
    throw new Error('Second argument given to Cycle.run() must be an object ' +
      'with at least one driver function declared as a property.');
  }

  let requestProxies = makeRequestProxies(drivers);
  let rawResponses = callDrivers(drivers, requestProxies);
  let responses = makeAppInput(requestProxies, rawResponses);
  let requests = app(responses);
  setTimeout(() => replicateMany(requests, requestProxies), 1);
  return [requests, responses];
}

let Cycle = {
  /**
   * Takes an `app` function and circularly connects it to the given collection
   * of driver functions.
   *
   * The `app` function expects a collection of "driver response" Observables as
   * input, and should return a collection of "driver request" Observables.
   * A "collection of Observables" is a JavaScript object where
   * keys match the driver names registered by the `drivers` object, and values
   * are Observables or a collection of Observables.
   *
   * @param {Function} app a function that takes `responses` as input
   * and outputs a collection of `requests` Observables.
   * @param {Object} drivers an object where keys are driver names and values
   * are driver functions.
   * @return {Array} an array where the first object is the collection of driver
   * requests, and the second objet is the collection of driver responses, that
   * can be used for debugging or testing.
   * @function run
   */
  run,

  /**
   * A shortcut to the root object of
   * [RxJS](https://github.com/Reactive-Extensions/RxJS).
   * @name Rx
   */
  Rx: Rx
};

module.exports = Cycle;
