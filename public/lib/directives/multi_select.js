define(function (require) { 
  var $ = require('jquery');
  var module = require('ui/modules').get('kibana');
  var _ = require('./../../../node_modules/lodash');
  require('./../../../node_modules/select2/dist/css/select2.min.css');
  var select2 = require('./../../../node_modules/select2/dist/js/select2.full.min.js');
  module.directive('multiSelect', function (createNotifier, Private) {

    return {
      restrict: 'E',
      replace: true,
      scope: {
        model: '=',
        init: '=',
        id: '@',
        label: '@'
      },
      template: require('../directives/multi_select.html'),
      link: function ($scope, element, attrs) {
        $scope.$watch('model', () => {
          if ($scope.model) {
            let data = [];
            $scope.model.forEach((fieldName, index) => {
              data.push({ id : index, text : fieldName });
            });
            $('select#'+$scope.id+'').select2({
              data : data,
              placeholder: $scope.label,
            });

            if($scope.id == 'multiSelectBucketField') {
              $('select#'+$scope.id+'').on('select2:select', (evt) => {
                if (evt.params.data.selected) {
                  if(_.isUndefined($scope.$parent.vis.params.configLine.ignoreBucketFields) || _.isNull($scope.$parent.vis.params.configLine.ignoreBucketFields)){
                    $scope.$parent.vis.params.configLine.ignoreBucketFields = [];
                  }
                  $scope.$parent.vis.params.configLine.ignoreBucketFields.push(evt.params.data.text);
                }
              });

              $('select#'+$scope.id+'').on('select2:unselect', (evt) => {
                if (!evt.params.data.selected) {
                  _.remove($scope.$parent.vis.params.configLine.ignoreBucketFields,(n) => {
                    return n == evt.params.data.text;
                  });
                }
              });
            } else {
              $('select#'+$scope.id+'').on('select2:select', (evt) => {
                if (evt.params.data.selected) {
                  if (_.isUndefined($scope.$parent.vis.params.configLine.ignoreMetricFields) || _.isNull($scope.$parent.vis.params.configLine.ignoreMetricFields)) {
                    $scope.$parent.vis.params.configLine.ignoreMetricFields = [];
                  }
                  $scope.$parent.vis.params.configLine.ignoreMetricFields.push(evt.params.data.text);
                }
              });

              $('select#'+$scope.id+'').on('select2:unselect', (evt) => {
                if (!evt.params.data.selected) {
                  _.remove($scope.$parent.vis.params.configLine.ignoreMetricFields,(n) => {
                    return n == evt.params.data.text;
                  });
                }
              });
            }
            
          }
        });

        $scope.$watch('init', () => {
          if ($scope.init && !_.isEmpty($scope.init)) {
            let indexArr = [];
            let data = [];
            $scope.model.forEach((fieldName, index) => {
              data.push({ id : index, text : fieldName });
            });
            $scope.init.forEach((fieldName) => {
              let obj = _.find(data, (o) => {
                return o.text == fieldName;
              });
              indexArr.push(obj.id+'');
            });
            let container = $('select#'+$scope.id+'');
            let multiSelect = container.select2();
            multiSelect.val(indexArr).trigger("change");
          }
        });

      }
    };
  });
});
