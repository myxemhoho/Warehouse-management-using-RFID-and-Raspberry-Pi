﻿var logger = require('../lib/logger');

module.exports.actions = function (server, actionType, device, data) {
    switch (actionType) {
        case 'info':
            info(device, data);
            break;
    }
};

function info(device, data) {
    device.serial_number = data.serial_number;
    device.version = data.version;
    device.save(function (err, device) {
        if (err)
            logger.error(err);
    });
}