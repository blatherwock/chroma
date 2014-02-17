var lightApp = angular.module('lightApp', []);

lightApp.filter('printBool', function() {
    return function(input, reverse) {
        if ((input && !reverse) || (!input && reverse))
            return "On";
        else
            return "Off";
    }
});


lightApp.controller('LightCtrl', ['$scope', '$timeout', 'hueBridgeInitializer', function($scope, $timeout, hueBridgeInitializer) {
    var user;
    $scope.preAuth = true;
    var updateStatus = function(newStatus) {
        $scope.status = newStatus;
        $scope.$apply();
    }
    var selectedBulbStorage = {
	isInit : function() {
	    return localStorage['selectedBulbs'];
	},
	init : function (bulbs) {
	    localStorage['selectedBulbs'] = JSON.stringify(bulbs);
	},
	isBulbSelected : function(bulbID) {
	    return JSON.parse(localStorage['selectedBulbs']).indexOf(bulbID) != -1;
	},
	removeBulb : function(bulbID) {
	    var storage = JSON.parse(localStorage['selectedBulbs']);
	    storage.splice(storage.indexOf(bulbID), 1);
	    localStorage['selectedBulbs'] = JSON.stringify(storage);
	},
	addBulb : function(bulbID) {
	    var storage = JSON.parse(localStorage['selectedBulbs']);
	    storage.push(bulbID);
	    localStorage['selectedBulbs'] = JSON.stringify(storage);
	}
    };
    //delay init so $scope.$apply in updateStatus can't be called
    //inside this call stack context (it throws an exception otherwise)
    setTimeout( function() {
        hueBridgeInitializer.init(updateStatus,
                                  /*success*/ function(hue_user) {
				      $scope.preAuth = false;
                                      user = hue_user;
                                      $scope.status = "";
                                      user.getFullState( function(state) {
					  $scope.lights = [];
					  var i = 0;
					  while(state.lights[++i]) {
					      state.lights[i].hueID = i;
					      $scope.lights.push(state.lights[i]);
					  }
					  loadFromSelectedBulbStorage();
					  updateSelectedState();
                                          // to update the view since we aren't using an AngularJS service
                                          $scope.$apply();
                                      });
                                  });
    });
    var loadFromSelectedBulbStorage = function() {
	// If we don't have the bulbs setup in local storage, select them all
	// and init the bulb storage array
	if (!selectedBulbStorage.isInit()) {
	    var bulbs = [];
	    $scope.lights.forEach( function(light) {
		light.isSelected = true;
		bulbs.push(light.hueID);
	    });
	    selectedBulbStorage.init(bulbs);
	} else {
	    $scope.lights.forEach( function(light) {
		light.isSelected = selectedBulbStorage.isBulbSelected(light.hueID);
	    });
	}
    }
    // Setup defaults for our selection 'light'
    $scope.selection = {};
    $scope.lightToHex = function(light) {
	var hue = (light.state.hue / 65535) * 360;
	var sat = (light.state.sat / 255) * 100;
	var li  = (light.state.bri / 255) * 75 + 25;
	var color = new HSVColour(hue, sat, li);
	return color.getCSSHSL();
    };
    var getSelectedLights = function () {
	var selected = function(l) { return l.isSelected; };
	return $scope.lights.filter(selected);
    };
    var alertSelectedLights = function () {
	getSelectedLights().forEach( function (l) {
	    user.setLightState(l.hueID, { alert : "select" });
	});
    }
    var updateSelectedState = function () {
	var selectedLights = getSelectedLights();
	var matcher = function(matchingFunction) {
	    return function(prev, cur) {
		return (matchingFunction(prev, cur)) ? prev : undefined;
	    }
	};
	var setSelectedProp = function(prop) {
	    var m = matcher(function(p, c) { return p && c && p.state[prop] == c.state[prop]; });
	    var areSelectedLights = selectedLights.length > 0;
	    var matchedLight = areSelectedLights ? selectedLights.reduce(m) : undefined;
	    if (matchedLight) {
		$scope.selection[prop] = matchedLight.state[prop];
	    } else {
		delete $scope.selection[prop];
	    }
	}
	setSelectedProp("hue");
	setSelectedProp("sat");
	setSelectedProp("bri");
	setSelectedProp("on");

	if (!$scope.selection.color) {
	    $scope.selection.color = {};
	}
	if ($scope.selection.hue)
	    $scope.selection.color.h = Math.floor($scope.selection.hue / 65535 * 360);
	if ($scope.selection.sat)
	    $scope.selection.color.s = Math.floor($scope.selection.sat / 255 * 100);
	if ($scope.selection.bri)
	    $scope.selection.color.b = Math.floor($scope.selection.bri / 255 * 100);
    }
    var pushSelectedLightState = function () {
	getSelectedLights().forEach( function(light) {
	    var lightState = light.state,
	        selecState = $scope.selection;
	    for (prop in selecState) {
		lightState[prop] = selecState[prop];
	    }
	    pushLightState(light);
	});
    };
    var pushLightState = function (light) {
	user.setLightState(light.hueID, {
	    on : light.state.on,
	    hue : parseInt(light.state.hue, 10),
	    sat : parseInt(light.state.sat, 10),
	    bri : parseInt(light.state.bri, 10),
	    effect : light.state.effect,
	    transitiontime : 20,
	});
    };
    // ---- Events ----
    $scope.toggleSelection = function () {
	this.light.isSelected = !this.light.isSelected;
	// trigger the light controls to update based on the new selection
	updateSelectedState();
	
	// Persist the new selection in local storage
	if (selectedBulbStorage.isBulbSelected(this.light.hueID) && !this.light.isSelected) {
	    selectedBulbStorage.removeBulb(this.light.hueID);
	} else if (!selectedBulbStorage.isBulbSelected(this.light.hueID) && this.light.isSelected) {
	    selectedBulbStorage.addBulb(this.light.hueID);
	}
    };
    $scope.togglePower = function(event) {
        this.light.state.on = !this.light.state.on;
	pushLightState(this.light);
	event.stopPropagation();
	updateSelectedState();
    };
    $scope.togglePowerSelected = function() {
	if ($scope.selection.on == undefined) {
	    $scope.selection.on = true;
	} else {
	    $scope.selection.on = !$scope.selection.on;
	}
	pushSelectedLightState();
    };

    // -- Misc Events --
    $scope.selectedAlert = function() {
	alertSelectedLights();
    };
    $scope.toggleSelectedColorLoop = function() {
	if (!$scope.selection.effect || $scope.selection.effect == "none") {
	    $scope.selection.effect = "colorloop";
	} else {
	    $scope.selection.effect = "none";	    
	}
	pushSelectedLightState();
    };
    $scope.updateColor = function() {
	$scope.selection.hue = Math.floor($scope.selection.color.h / 360 * 65535);
	$scope.selection.sat = Math.floor($scope.selection.color.s / 100 * 255);
	pushSelectedLightState();
    };
    $scope.updateBrightness = function() {
	$scope.selection.bri = Math.floor($scope.selection.color.b / 100 * 255);
	pushSelectedLightState();
    };
}]);
