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
                                      user = hue_user;
                                      $scope.status = "";
                                      user.getFullState( function(state) {
					  $scope.lights = [];
					  var i = 0;
					  while(state.lights[++i]) {
					      state.lights[i].hueID = i;
					      //state.lights[i].isSelected = true;
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
	//delete localStorage['selectedBulbs']
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
	// trigger the light controls to update based on the new selection
	updateSelectedState();
	
	// Persist the new selection in local storage
	if (selectedBulbStorage.isBulbSelected(this.light.hueID) && !this.light.isSelected) {
	    selectedBulbStorage.removeBulb(this.light.hueID);
	} else if (!selectedBulbStorage.isBulbSelected(this.light.hueID) && this.light.isSelected) {
	    selectedBulbStorage.addBulb(this.light.hueID);
	}
    };
    $scope.powerOn = function(event) {
        this.light.state.on = true;
	pushLightState(this.light);
	event.stopPropagation();
    };
    $scope.powerOff = function(event) {
	this.light.state.on = false;
	pushLightState(this.light);
	event.stopPropagation();
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
	drawHuePickerBackground();
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
    $scope.huePickerClicked = function(event) {
	var x = event.pageX - $('#huePicker').offset().left;
	var y = event.pageY - $('#huePicker').offset().top;
	
	var canvasHeight = huePicker.height;
	var canvasWidth = huePicker.width;
	var origin = { x : canvasWidth / 2, y : canvasHeight };

	var a = origin.x - x;
	var h = Math.sqrt(Math.pow(origin.x - x, 2) + Math.pow(origin.y - y, 2));
	var thetaRad = Math.acos(a/h);
	var thetaDeg = thetaRad * (180 / Math.PI);

	// scale to a half circle and rotate so red is all the way on the left
	var hue = ((thetaDeg * 2) + 300) % 360;
	var sat = Math.min(h / canvasHeight, 1) * 100;
	var value = $scope.selection.bri / 255 * 100;
	
	if (h > canvasHeight) {
	    value = 0;
	}
	
	var color = new HSVColour(hue, sat, value);
	$scope.selection.hue = hue / 360 * 65535;
	$scope.selection.sat = sat / 100 * 255;
	pushSelectedLightState();
	$('.lightControls').css('background-color', color.getCSSIntegerRGB());
    }
    var huePicker = $('#huePicker')[0];
    var drawHuePickerBackground = function () {
	var ctx = huePicker.getContext('2d');
	var canvasHeight = huePicker.height;
	var canvasWidth = huePicker.width;
	var origin = { x : canvasWidth / 2, y : canvasHeight };

	var imageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
	var pixels = imageData.data;

	for (var i = 0; i < pixels.length; i += 4) {
	    var x = (i / 4) % canvasWidth;
	    var y = Math.floor((i / 4) / canvasWidth);
	
	    var a = origin.x - x;
	    var h = Math.sqrt(Math.pow(origin.x - x, 2) + Math.pow(origin.y - y, 2));
	    var thetaRad = Math.acos(a/h);
	    var thetaDeg = thetaRad * (180 / Math.PI);

	    // scale to a half circle and rotate so red is all the way on the left
	    var hue = ((thetaDeg * 2) + 300) % 360;
	    var sat = Math.pow(Math.min(h / canvasHeight, 1), 1.75) * 100;
	    var value = 100;
	    if ($scope.selection.bri) {
		value = $scope.selection.bri / 255 * 100 + 50;
	    }
	    
	    if (h > canvasHeight) {
		value = 0;
	    }
	    
	    var color = new HSVColour(hue, sat, value);
	    var colorRGB = color.getRGB();
	    pixels[i]   = colorRGB.r;
	    pixels[i+1] = colorRGB.g;
	    pixels[i+2] = colorRGB.b;
	    pixels[i+3] = 255;
	}
	ctx.clearRect(0, 0, canvasWidth, canvasHeight);
	ctx.putImageData(imageData, 0, 0);
	
	//stroke the edge of the semicircle to smooth it out
	ctx.fillStyle = null;
	ctx.strokeStyle = 'rgb(10,10,10)';
	ctx.lineWidth = 3;
	ctx.beginPath();
	ctx.arc(origin.x, origin.y, canvasHeight, 0, Math.PI, true);
	ctx.stroke();
    };

    drawHuePickerBackground();
}]);
