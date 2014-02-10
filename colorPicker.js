lightApp.directive('colorPicker', function() {
    return {
	restrict: 'E',
	require: '^ngModel',
	scope: {
	    ngModel: '=',
	    onColorChange: '&',
	    onBrightnessChange: '&',
	},
	template:
	'<div class="colorPicker">' +
	    '<div class="huePickerWrapper">' +
	    '<canvas id="huePicker" height="150" width="300" ng-click="huePickerClicked($event)"></canvas>' +
	    '<div id="huePickerShade"  ng-click="huePickerClicked($event)">' +
	    '</div>' +
	    '</div>' +
	    '<label>Brightness: </label>' +
	    '<input type="range" min="0" max="100" class="bri" ' +
	    'ng-model="ngModel.b" ng-change="briSelectedChange()"/>' +
	    '</div>',
	controller : function($scope, $timeout) {
	    var huePicker = $('#huePicker')[0];
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
		var value = $scope.bri / 255 * 100;
		
		if (h > canvasHeight) {
		    value = 0;
		}

		$scope.ngModel.h = Math.floor(hue);
		$scope.ngModel.s = Math.floor(sat);
		$scope.onColorChange();
	    }
	    var briSliderHandler = function () {
		var timeoutID;
		return function() {
		    if (timeoutID != null) {
			$timeout.cancel(timeoutID);
		    }
		    timeoutID = $timeout( function() {
			$scope.onBrightnessChange();
			timeoutID = null;
		    }, 100);
		}	    
	    }();
	    $scope.briSelectedChange = function() {
		briSliderHandler();
		updateHuePickerShade();
	    }
	    var updateHuePickerShade = function() {
		var newVal = $scope.ngModel.b;
		var bri = 1;
		if (newVal) {
		    bri = (newVal / 100) * 0.5 + 0.5;
		}
		var shade = Math.max(1 - bri, 0);
		$('#huePickerShade').css('opacity', shade);
	    }

	    $scope.$watchCollection('ngModel', function(newVal) {
		if (newVal && newVal.b) {
		    updateHuePickerShade();
		}
	    });

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
		    var alpha = 255;
		    if (h > canvasHeight) {
			alpha = 0;
		    }
		    
		    var color = new HSVColour(hue, sat, value);
		    var colorRGB = color.getRGB();
		    pixels[i]   = colorRGB.r;
		    pixels[i+1] = colorRGB.g;
		    pixels[i+2] = colorRGB.b;
		    pixels[i+3] = alpha;
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
	},
    };
});
