'use strict';

/** Wrap DOM selector methods:
 *  document.querySelector,
 *  document.getElementById,
 *  document.getElementsByClassName
 *  'element' checks for a string before returning an element with `query`
 */
var dom = {
  query: function query(arg) {
    return document.querySelector(arg);
  },
  id: function id(arg) {
    return document.getElementById(arg);
  },
  class: function _class(arg) {
    return document.getElementsByClassName(arg);
  },
  element: function element(el) {
    return typeof el === 'string' ? this.query(el) : el;
  }
};

/**
 * Returns a (nested) propery from an object, or undefined if it doesn't exist
 * @param {String | Array} props - An array of properties or a single property
 * @param {Object | Array} obj
 */
var path = function path(props, obj) {
  var nested = obj;
  var properties = typeof props === 'string' ? props.split('.') : props;

  var _iteratorNormalCompletion = true;
  var _didIteratorError = false;
  var _iteratorError = undefined;

  try {
    for (var _iterator = properties[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
      var property = _step.value;

      nested = nested[property];
      if (nested === undefined) {
        return nested;
      }
    }
  } catch (err) {
    _didIteratorError = true;
    _iteratorError = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion && _iterator.return) {
        _iterator.return();
      }
    } finally {
      if (_didIteratorError) {
        throw _iteratorError;
      }
    }
  }

  return nested;
};

/**
 * Checks for a (nested) propery in an object and returns the property if
 * it exists.  Otherwise, it returns a default value.
 * @param {*} d - Default value
 * @param {String | Array} props - An array of properties or a single property
 * @param {Object | Array} obj
 */
var pathOr = function pathOr(d, props, obj) {
  var value = path(props, obj);
  return value === undefined ? d : value;
};

/**
 * Converts a string to proper case (e.g. 'camera' => 'Camera')
 * @param {String} text
 * @returns {String}
 */
var properCase = function properCase(text) {
  return '' + text[0].toUpperCase() + text.slice(1);
};

module.exports = {
  dom: dom,
  path: path,
  pathOr: pathOr,
  properCase: properCase
};