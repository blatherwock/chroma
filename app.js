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
    var updateStatus = function(newStatus) {
        $scope.status = newStatus;
        $scope.$apply();
    }
    //delay init so $scope.$apply in updateStatus can't be called
    //inside this call stack context (it throws an exception otherwise)
    setTimeout( function() {
        hueBridgeInitializer.init(updateStatus,
                                  /*success*/ function(hue_user) {
                                      user = hue_user;
                                      $scope.status = "";
                                      user.getFullState( function(state) {
					  var lights = [];
					  var i = 0;
					  while(state.lights[++i]) {
					      state.lights[i].hueID = i;
					      state.lights[i].isSelected = true;
					      lights.push(state.lights[i]);
					  }
                                          $scope.lights = lights;
					  updateSelectedState();
                                          // to update the view since we aren't using an AngularJS service
                                          $scope.$apply();
                                      });
                                  });
    });
    // Setup defaults for our selection 'light'
    $scope.selection = {};
    $scope.lightToHex = function(light) {
	var hue = (light.state.hue / 65535) * 360;
	var sat = (light.state.sat / 255) * 100;
	var li  = (light.state.bri / 255) * 75 + 25;
	return "hsl(" + hue + ", " + sat + "%, " + li + "%)";
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
	    var matchedLight = selectedLights.reduce(m);
	    if (matchedLight) {
		$scope.selection[prop] = matchedLight.state[prop];
	    } else {
		delete $scope.selection[prop];
	    }
	}
	setSelectedProp("hue");
	setSelectedProp("sat");
	setSelectedProp("bri");
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
	});
    };
    // ---- Events ----
    $scope.toggleSelection = function () {
	this.light.isSelected = !this.light.isSelected;
	updateSelectedState();
    };
    $scope.powerOn = function() {
        this.light.state.on = true;
	pushLightState(this.light);
    };
    $scope.powerOff = function() {
	this.light.state.on = false;
	pushLightState(this.light);
    };
    $scope.powerSelectedOn = function() {
	$scope.selection.on = true;
	pushSelectedLightState();
    };
    $scope.powerSelectedOff = function() {
	$scope.selection.on = false;
	pushSelectedLightState();
    };

    // -- Slider Events --
    var hsbSliderHandler = function () {
	var timeoutID;
	return function() {
	    if (timeoutID != null) {
		$timeout.cancel(timeoutID);
	    }
	    timeoutID = $timeout( function() {
		pushSelectedLightState();
		timeoutID = null;
	    }, 100);
	}	    
    }();
    $scope.hsbSelectedChange = function() {
	hsbSliderHandler();
    }

    // -- Misc Events --
    $scope.selectedAlert = function() {
	alertSelectedLights();
    };
    $scope.startSelectedColorLoop = function() {
	$scope.selection.effect = "colorloop";
	pushSelectedLightState();
    };
    $scope.stopSelectedColorLoop = function() {
	$scope.selection.effect = "none";
	pushSelectedLightState();
    };
    $scope.save = function() {
	
    }
}]);
