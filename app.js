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
                                          $scope.lights = state.lights;
                                          // to update the view since we aren't using an AngularJS service
                                          $scope.$apply();
                                      });
                                  });
    });

    // ---- Events ----
    $scope.togglePower = function() {
        var currentlyOn = this.light.state.on;
        user.setLightState( this.$index + 1, { on :!currentlyOn } );
        this.light.state.on = !currentlyOn;
    };
    // -- Slider Events --
    var sliderHandler = function (propName) {
	var timeoutID;
	return function(lightID, newValue) {
	    if (timeoutID != null) {
		$timeout.cancel(timeoutID);
	    }
	    timeoutID = $timeout( function() {
		var newState = {};
		newState[propName] = newValue;
		user.setLightState( lightID, newState );
		timeoutID = null;
	    }, 100);
	}	    
    };
    var brightnessHandler = sliderHandler("bri");
    var hueHandler = sliderHandler("hue");
    var satHandler = sliderHandler("sat");
    $scope.brightnessChange = function() {
        var newBrightness = parseInt(this.light.state.bri, 10);
        brightnessHandler(this.$index + 1, newBrightness);
    };
    $scope.hueChange = function() {
        var newHue = parseInt(this.light.state.hue, 10);
        hueHandler(this.$index + 1, newHue);
    };
    $scope.satChange = function() {
        var newSat = parseInt(this.light.state.sat, 10);
        satHandler(this.$index + 1, newSat);
    };

    // -- Misc Events --
    $scope.alert = function() {
	user.setLightState( this.$index + 1, { alert : "select" } );
    };
    $scope.startColorLoop = function() {
	user.setLightState( this.$index + 1, { effect : "colorloop" } );
    }
    $scope.stopColorLoop = function() {
	user.setLightState( this.$index + 1, { effect : "none" } );
    };
}]);
