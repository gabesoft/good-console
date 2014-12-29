// Load modules

var Util = require('util');
var GoodReporter = require('good-reporter');
var qs = require('querystring');
var Hoek = require('hoek');
var Moment = require('moment');
var SafeStringify = require('json-stringify-safe');

// Declare internals

var internals = {
    defaults: {
        format: 'YYMMDD/HHmmss.SSS'
    },
    colors : {
        black       : '0;30',
        blue        : '0;34',
        brown       : '0;33',
        cyan        : '0;36',
        darkGray    : '1;30',
        green       : '0;32',
        lightBlue   : '1;34',
        lightCyan   : '1;36',
        lightGray   : '0;37',
        lightGreen  : '1;32',
        lightPurple : '1;35',
        lightRed    : '1;31',
        purple      : '0;35',
        red         : '0;31',
        white       : '1;37',
        yellow      : '1;33'
    }
};

module.exports = internals.GoodConsole = function (events, options) {

    Hoek.assert(this.constructor === internals.GoodConsole, 'GoodConsole must be created with new');
    options = options || {};
    var settings = Hoek.applyToDefaults(internals.defaults, options);

    GoodReporter.call(this, events, settings);
};

Hoek.inherits(internals.GoodConsole, GoodReporter);


internals.GoodConsole.prototype._report = function (event, eventData) {

    var tags = (eventData.tags || []).concat([]);
    tags.unshift(event);

    if (event === 'response') {
        return this._formatResponse(eventData, tags);
    }

    var eventPrintData = {
        timestamp: eventData.timestamp,
        tags: tags,
        data: undefined
    };

    if (event === 'ops') {
        eventPrintData.data = 'memory: ' + Math.round(eventData.proc.mem.rss / (1024 * 1024)) +
        'Mb, uptime (seconds): ' + eventData.proc.uptime +
        ', load: ' + eventData.os.load;
        return this._printEvent(eventPrintData);
    }

    if (event === 'error') {
        eventPrintData.data = 'message: ' + eventData.error.message + ' stack: ' + eventData.error.stack;
        return this._printEvent(eventPrintData);
    }

    if (event === 'request' || event === 'log') {
        eventPrintData.data = 'data: ' + (typeof eventData.data === 'object' ? SafeStringify(eventData.data) : eventData.data);
        return this._printEvent(eventPrintData, this._settings.format);
    }

    var m = Moment.utc(eventData.timestamp || Date.now());
    var timestring = m.format(this._settings.format);

    console.log('Unknown event "%s" occurred with timestamp %s.', event, timestring);
};

internals.GoodConsole.prototype._color = function (text, color) {
    return '\x1b[' + internals.colors[color] + 'm' + text + '\x1b[0m';
};

internals.GoodConsole.prototype._printEvent = function (event) {

    var m = Moment(event.timestamp);
    var timestring = this._color(m.format(this._settings.format), 'darkGray');
    var data = event.data;
    var output = timestring + ' [' + event.tags.toString() + '] ' + data;

    console.log(output);
};


internals.GoodConsole.prototype._formatResponse = function (event, tags) {
    var query           = qs.stringify(event.query || {});
    var responsePayload = '';
    var requestPayload  = '';

    if (event.responsePayload && typeof event.responsePayload === 'object') {
        responsePayload = this._color('response ', 'darkGray') + SafeStringify(event.responsePayload);
    }
    if (event.requestPayload && typeof event.requestPayload === 'object') {
        requestPayload = this._color('request  ', 'darkGray') + SafeStringify(event.requestPayload);
    }

    var methodColors = {
        get: 'lightGreen',
        delete: 'lightRed',
        put: 'lightCyan',
        post: 'yellow'
    };
    var statusColor = function (status) {
        if (status >= 500) {
            return 'red';
        } else if (status >= 400) {
            return 'brown';
        } else if (status >= 300) {
            return 'cyan';
        } else {
            return 'green';
        }
    };
    var color = methodColors[event.method] || 'lightBlue';
    var method = this._color(event.method.toUpperCase(), color);
    var statusCode = this._color(event.statusCode || '', statusColor(event.statusCode));
    var path = this._color(event.path + (query ? '?' + query : ''), 'blue');

    this._printEvent({
        timestamp: event.timestamp,
        tags: tags,
        data: Util.format('%s %s %s (%sms)', method, path, statusCode, event.responseTime)
    });
    this._printEvent({
        timestamp : event.timestamp,
        tags: tags,
        data: Util.format('%s', requestPayload)
    });
    this._printEvent({
        timestamp : event.timestamp,
        tags: tags,
        data: Util.format('%s', responsePayload)
    });
};
