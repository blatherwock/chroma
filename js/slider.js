lightApp.directive('slider', ['$document', function($document) {
	return {
		restrict: 'E',
		require: 'ngModel',
		template:'<div class="brightnessSlider"><div class="brightnessCursor"></div></div>',
		link: function($scope, elem, attrs, ngModelController) {

			ngModelController.$render = function() {
				updateSliderFromValue(ngModelController.$viewValue);
			};

			// --- Slider Update Methods --- //
			var brightnessSliderWidth = function() {
				return $('.brightnessSlider').width() - $('.brightnessCursor').width();
			};
			var updateBrightnessCursor = function(x) {
				var safeX = Math.min(brightnessSliderWidth(), Math.max(x, 0));
				$('.brightnessCursor').css('left', safeX);
			}
			/* Updates the slider based on the value.
			   value should be 0-100 */
			var updateSliderFromValue = function(value) {
				var safeValue = Math.min(100, Math.max(0, value));

				var newCursorX = (safeValue / 100) * brightnessSliderWidth();
				updateBrightnessCursor(newCursorX);
			};
			/* Updates the model value based on user click.
			   clickPageX is the page x coordinate of the click*/
			var updateModelFromClick = function(clickPageX) {
				var x = clickPageX - $('.brightnessSlider').offset().left - 6;

				var max = brightnessSliderWidth();
				x = Math.min(max, Math.max(x, 0));
				updateBrightnessCursor(x);

				var realValue = x / max * 100;
				ngModelController.$setViewValue(realValue);
				$scope.$apply();
			};
			
			// --- Mouse Events --- //
			var sliderMouseDown = function(event) {
				event.preventDefault();
				$document.on('mousemove', sliderMouseMoveOrClick);
				$document.on('mouseup', sliderMouseUp);
			};
			var sliderMouseUp = function(event) {
				$document.unbind('mousemove', sliderMouseMoveOrClick);
				$document.unbind('mouseup', sliderMouseUp);
			};
			var sliderMouseMoveOrClick = function(event) {
				updateModelFromClick(event.pageX);
			};

			
			// --- Initialization --- //
			elem.on('mousedown', sliderMouseDown);
			elem.on('click', sliderMouseMoveOrClick);

		}
	};
}]);
