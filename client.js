var gateClient = require('./gateClient');

setInterval(function () {
    gateClient.serverAddrReq(function (err, addr) {
        if (err) { console.log(err); }
        console.log(addr);
    });

    gateClient.serviceInfoReq('mqtt', function (err, serv) {
        if (err) { console.log(err); }
        console.log(serv);
    });
}, 3000);


