lightApp.factory('hueBridgeInitializer', function() {
    var HUE_USER = "chromalightsapp";
    var HUE_DESC = "Chrome extension";

    var hue = jsHue();
    return  {
        init: function (updateStatus, initSuccessful) {
            var ip = localStorage['hueBridgeIP'];

            var discoverBridge = function(success) {
                hue.discover(
                    /*success*/ function(bridges) {
                        if (bridges.length) {
                            ip = bridges.shift().internalipaddress;
                            updateStatus("Connecting to bridge");
                            success(ip);
                        } else {
                            updateStatus("No bridges found");
                        }
                    },
                    /*failure*/ function() {
                        updateStatus("Error finding bridge");
                    }
                );
            };
            
            var authenticate = function (ip) {
                var bridge = hue.bridge(ip);
                var user = bridge.user(HUE_USER);
                updateStatus("Authenticating application");
                user.getConfig(
                    /*success*/ function(data) {
                        //try to access something protected
                        if (data.ipaddress) {
                            //Success!
                            localStorage['hueBridgeIP'] = ip;
                            initSuccessful(user);
                        } else {
                            createUser();
                        }
                    },
                    /*failure*/ function() {
                        discoverBridge(authenticate);
                        //may possibly need to refind the bridge, or create the user
                        updateStatus("Could not authenticate");
                    }
                );
            };


            var creationAttempts = 0;
            var createUser = function() {
                var queueCreationAttempt = function() {
                    creationAttempts++;
                    if (creationAttempts >= 10) {
                        updateStatus("Unable to link with bridge. Please press link button and reopen this page");
                    } else {
                        updateStatus("Please press link button on the bridge. Link attempts remaining: " + (10 - creationAttempts));
                        setTimeout(createUser, 3000);
                    }
                }
                var user = hue.bridge(ip).user(HUE_USER);
                user.create(
                    HUE_DESC,
                    /*success*/ function(data) {
                        data = data.shift();
                        if (data.success) {
                            //Success!
                            initSuccessful(user);
                        } else {
                            queueCreationAttempt();
                        }
                    },
                    /*failure*/ function() {
                        queueCreationAttempt();
                    }
                );
            };

            if (ip) {
                authenticate(ip);
            } else {
                // discover bridges, then authenticate once you have an ip
                discoverBridge(authenticate);
            }
        }
    };
});
