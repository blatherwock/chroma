lightApp.directive('slider', function() {
    return {
	restrict: 'E',
	require: '^ngModel',
	scope: {
	    ngModel: '=',
	    onSliderChange: '&',
	},
	template:'<div class="brightnessSlider"><div class="brightnessCursor"></div></div>',
	controller: function($scope, $timeout, $document) {
	    var sliderMouseDown = function(event) {
		event.preventDefault();
		$document.on('mousemove', sliderMouseMove);
		$document.on('mouseup', sliderMouseUp);
		//for single clicks
		sliderMouseMove(event);
	    }
	    var sliderMouseUp = function(event) {
		$document.unbind('mousemove', sliderMouseMove);
		$document.unbind('mouseup', sliderMouseUp);
	    }
	    var sliderMouseMove = function(event) {
		var x = event.pageX - $('.brightnessSlider').offset().left - 6;
		// bound between the 0 and the width of the slider
		var max = $('.brightnessSlider').width() - $('.brightnessCursor').width();
		x = Math.min(max, Math.max(x, 0));
		$('.brightnessCursor').css('left', x);

		var realValue = x / max * 100;
		$scope.ngModel = realValue;
		// Have to call this asyncronously so that ngModel is completely updated by Angular
		// before the callback listeners look to the new value.
		$timeout($scope.onSliderChange);
	    }
	    
	    $('.brightnessSlider').mousedown(sliderMouseDown);
	},
    };
});
