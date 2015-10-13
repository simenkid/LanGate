var lanGate = require('./lanGate'),
    gatePort = 2658;

lanGate.addServiceInfo({ name: 'mqtt', port: 1883 })
       .addAuthAccount({ username: 'sivann', password: '1234567890' })
       .setPort(gatePort)
       .start();

lanGate.on('listening', function (x) {
    console.log('LAN Gate starts listening at ' + lanGate.getIp() + ':' + lanGate.getPort());
});