"use strict";

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/** Errors */
var SDKError = function (_Error) {
  _inherits(SDKError, _Error);

  function SDKError(errorMessage, errorType) {
    _classCallCheck(this, SDKError);

    var _this = _possibleConstructorReturn(this, (SDKError.__proto__ || Object.getPrototypeOf(SDKError)).call(this, "otSDK: " + errorMessage));

    _this.type = errorType;
    return _this;
  }

  return SDKError;
}(Error);

module.exports = {
  SDKError: SDKError
};