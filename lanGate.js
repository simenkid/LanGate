'use strict';

var EventEmitter = require('events').EventEmitter,
    dgram = require('dgram'),
    ip = require('ip'),
    server = dgram.createSocket('udp4'),
    _ = require('lodash');

var lanGate = {
    configs: {
        port: 2658,
        authAccounts: [],  // { username: 'sivann', password: '1234567890' }
        services: []       // { name: 'mqtt', port: 5555 }
    },
    start: function () {
        server.on('listening', function () {
            lanGate.emit('listening');
        });

        server.on('message', function (msg, rinfo) {
            var msgObj = JSON.parse(msg);
            lanGate.emit('message', msgObj);
            lanGate.incomingMsgHandler(msgObj, rinfo);
        });

        server.on('close', function () {
            lanGate.emit('close');
        });

        server.on('error', function () {
            lanGate.emit('error');
        });

        server.bind(lanGate.configs.port);
        return lanGate;
    },
    stop: function () {
        server.close();
        return lanGate;
    },
    restart: function () {
        server.close(function () {
            lanGate.start();
        });
        return lanGate;
    },
    setPort: function (p) {
        lanGate.configs.port = p;
        return lanGate;
    },
    addAuthAccount: function (acnt) {
        // TODO: check type, existense
        lanGate.configs.authAccounts.push(acnt);
        return lanGate;
    },
    removeAuthAccount: function () {
        // TODO: remove Auth
        return lanGate;
    },
    addServiceInfo: function (servInfo) {
        // TODO: check type, existense
        lanGate.configs.services.push(servInfo);
        return lanGate;
    },
    removeServiceInfo: function () {
        // TODO: remove ServInfo
        return lanGate;
    },
    getIp: function () {
        return ip.address();
    },
    getPort: function () {
        return lanGate.configs.port;
    }
};

_.assign(lanGate, EventEmitter.prototype);

lanGate.incomingMsgHandler = function (msgObj, rinfo) {
    // msg = { type: 'xxx' }
    var rspObj = {
            type: 'RSP',
            cmd: '',
            data: null
        },
        rspBuf;

    // event forwarding
    lanGate.emit('message', msgObj);

    if (msgObj.type === 'REQ') {
        switch (msgObj.cmd) {
            case 'SERV_IP':
                rspObj.cmd = 'SERV_IP';
                rspObj.data = {
                    ip: ip.address(),
                    family: server.address().family,
                    port: lanGate.configs.port
                }
                break;
            case 'QRY_SERV':
                rspObj.cmd = 'QRY_SERV';
                rspObj.data = findService(msgObj.service);
                break;
            default:
                rspObj.cmd = 'UNKNOWN'
                rspObj.data = null;
                break;
        }

        rspBuf = new Buffer(JSON.stringify(rspObj));

        server.send(rspBuf, 0, rspBuf.length, rinfo.port, rinfo.address, function (err) {
            if (err) { console.log(err); }
        });

    } else if (msgObj.type === 'RSP') {
        // don't know if we need this yet
    }
};


/*************************************************************************************************/
/*** Private Functions                                                                         ***/
/*************************************************************************************************/

function findService(servStr) {
    var foundServ = _.find(lanGate.configs.services, function (serv) {
        return serv.name === servStr.toLowerCase();
    });

    return foundServ || null;
}

module.exports = lanGate;
