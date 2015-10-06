var EventEmitter = require('events').EventEmitter,
    dgram = require('dgram'),
    _ = require('lodash'),
    broadAddr = '255.255.255.255',
    broadPort = 2658,
    servAddr = {
        ip: '',
        port: null,
        family: ''
    };

var gateClient = {
    serverAddrReq: function (callback) {
        var client = dgram.createSocket('udp4'),
            retryScheduler;

        client.on('message', function (msg, rinfo) {
            msg = JSON.parse(msg);
            if (msg.type === 'RSP' && msg.cmd === 'SERV_IP') {
                servAddr.ip = msg.data.ip;
                servAddr.port = msg.data.port;
                servAddr.family = msg.data.family;

                process.nextTick(function () {
                    callback(null, servAddr);
                });

                clearInterval(retryScheduler);
                client.close();
            }
        });

        client.on('timeout', function () {
            process.nextTick(function () {
                callback(new Error('RSP Timeout'), null);
            });
        });

        client.bind(function () {
            var reqBuf = new Buffer(JSON.stringify({
                type: 'REQ',
                cmd: 'SERV_IP'
            }));

            client.setBroadcast(true);

            retryScheduler = gateClient.sendMessageWithRetry({
                client: client,
                buf: reqBuf,
                port: broadPort,
                addr: broadAddr
            }, 5, 2000);
        });
    },
    serviceInfoReq: function (serv, callback) {
        var client = dgram.createSocket('udp4'),
            retryScheduler;

        if (servAddr.ip === '') {
            process.nextTick(function () {
                callback(new Error('Unknown server ip'), null);
            });
            return;
        }

        client.on('message', function (msg, rinfo) {
            msg = JSON.parse(msg);
            if (msg.type === 'RSP' && msg.cmd === 'QRY_SERV') {
                process.nextTick(function () {
                    callback(null, msg.data);
                });

                clearInterval(retryScheduler);
                client.close();
            }
        });

        client.on('timeout', function () {
            process.nextTick(function () {
                callback(new Error('RSP Timeout'), null);
            });
        });

        client.bind(function () {
            var reqBuf = new Buffer(JSON.stringify({
                type: 'REQ',
                cmd: 'QRY_SERV',
                service: serv
            }));

            retryScheduler = gateClient.sendMessageWithRetry({
                client: client,
                buf: reqBuf,
                port: servAddr.port,
                addr: servAddr.ip
            }, 5, 2000);
        });
    },
    sendMessage: function (client, buf, port, addr, cb) {
        client.send(buf, 0, buf.length, port, addr, function (err) {
            if (err) {
                console.log(err);
                client.close();
            }
            
            if (typeof cb === 'function') {
                cb();
            }
        });
    },
    sendMessageWithRetry: function (cMsg, maxRetries, interv, callback) {
        var client = cMsg.client,
            msgBuf = cMsg.buf,
            port = cMsg.port,
            addr = cMsg.addr,
            retryScheduler,
            retries = 0,
            cb;

        gateClient.sendMessage(client, msgBuf, port, addr, callback);

        retryScheduler = setInterval(function () {
            if (retries === maxRetries) {
                clearInterval(retryScheduler);
                client.emit('timeout');
                client.close();
            } else {
                gateClient.sendMessage(client, msgBuf, port, addr);
                retries += 1;
            }
        }, interv);

        return retryScheduler;
    }
};

_.assign(gateClient, EventEmitter.prototype);

module.exports = gateClient;
