define(function (require) {

  require('./lib/directives/multi_select');
  var $ = require('jquery');
  var _ = require('lodash');

  require('ui/modules').get('customize_table/customize_table')
  .directive('customizeTableParams', function ($rootScope, savedSearches, Private) {

    return {
      restrict: 'E',
      template: require('plugins/customize_table/customize_table_params.html'),
      link: function ($scope, $element, attr) {

      $scope.removeLinkField = function (index) {
        _.remove($scope.vis.params.configLine.linkField, (n, i) => {
          return i == index;
        });
      };

      $scope.addLink = function () {
        if (_.isUndefined($scope.vis.params.configLine.linkField)) {
            $scope.vis.params.configLine.linkField = [];
          }
        $scope.vis.params.configLine.linkField.push({from:'',to:''});
      };

      }
    };
  });
});
