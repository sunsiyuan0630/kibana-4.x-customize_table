define(function (require) {

  var $ = require('jquery');
  var DataTable = require('./../node_modules/datatables.net');
  $.fn.DataTable = DataTable;
  var _ = require('./../node_modules/lodash');

  var module = require('ui/modules').get('kibana/customize_table', ['kibana']);

  module.controller('KbnCustomizeTableController', function (createNotifier, $location, $rootScope, $scope, $route, savedSearches, savedVisualizations, Private, $element, Promise) {

    var notify = createNotifier({
      location: 'Customize Data table'
    });

    // Initialization of plugin settings
    $scope.$root.editor = {};

    $scope.$root.editor.fields = readFields();

    $scope.$root.editor.metricField = $scope.vis.type.schemas.metrics['0'].aggFilter; 


    function readFields() {
      let allFields = $scope.vis.indexPattern.fields;
      let allFieldNames = [];
      allFields.forEach((field) => {
        allFieldNames.push(field.name);
      });
      let metaFieldNames = $scope.vis.indexPattern.metaFields;

      _.pullAll(allFieldNames, metaFieldNames);
      allFieldNames.unshift('');//add blank at the beginning
      return allFieldNames;
    }

    $scope.initTable = ($element) => {
      let $container = $($element.children()[0]);

      $container.empty();
      $container.append('<table class="table table-striped table-bordered table-hover table-condensed container" ></table>');
    };

    $scope.readConfig = () => {
      return {
        bucketConfigs : readBucketConfig(),
        metricConfigs : readMetricConfig()
      }

      function readBucketConfig() {
        let buckets = $scope.vis.aggs.bySchemaGroup['buckets'];
        
        if (_.isUndefined(buckets)) return null;
        let configs = [];
        buckets.forEach((aggConfig, index) => {
          let order;
          if (aggConfig.params.order.display == 'Ascending') {
            order = "asc";
          }
          if (aggConfig.params.order.display == 'Descending') {
            order = "desc";
          }
          configs.push({ id : Number(aggConfig.id), order : order, field : aggConfig.params.field, customLabel : aggConfig.params.customLabel });
        });
        return configs;
      }

      function readMetricConfig() {
        let metrics = $scope.vis.aggs.bySchemaGroup['metrics'];
        if (_.isUndefined(metrics)) return null;
        let configs = [];
        metrics.forEach((aggConfig, index) => {
          configs.push({ id : Number(aggConfig._opts.id), schema : aggConfig._opts.schema, type : aggConfig._opts.type, fieldName: aggConfig._opts.params.field });
        });
        return configs;
      }

    };

    $scope.readHeaderFromConfig = (bucketConfigs, metricConfigs) => {
      if (_.isNull(bucketConfigs) || _.isNull(metricConfigs)) return null;
      let columns = [];
      bucketConfigs.forEach((config) => {
        columns.push({ title : config.field.displayName, displayName : config.customLabel, order : config.order });
      });
      metricConfigs.forEach((config) => {
        columns.push({ title : config.type, displayName : config.fieldName == undefined ? config.type : config.type + ' ' + config.fieldName });
      });
      $scope.sourceColumns = columns;
    };


    $scope.readData = (bucketConfigs, metricConfigs, aggregations) => {
      if (_.isNull(bucketConfigs) || _.isNull(metricConfigs)) return null;
      let rows = [];
      let firstOne = _.head(bucketConfigs);
      let buckets = aggregations[firstOne.id].buckets;
      var stringArr, stack, readConfigIndex;

      buckets.forEach((aggregation) => {
        stack = [];
        stringArr = [];
        readConfigIndex = 0;
        readBuckets(aggregation, firstOne.id, bucketConfigs, metricConfigs);
        stringArr.forEach((result) => {
          rows.push(result);
        });
      });

      $scope.sourceData = rows;

      function readBuckets(aggregation, bucketLayer, bucketConfigs, metricConfigs) {
        stack.push(aggregation.key);
        let currentIndex = _.findIndex(bucketConfigs, (o) => {
          return o.id == bucketLayer;
        });
        if ((currentIndex+1) == bucketConfigs.length) {  //verify if this is the last layer
          if (bucketLayer == firstOne.id) {
            let arr = [];
            arr.push(aggregation.key);
            metricConfigs.forEach((metricConfig) => {
              if (metricConfig.type == 'count') {           //special case
                arr.push(aggregation['doc_count']);
              } else {
                arr.push(aggregation[metricConfig.id].value);
              }
            });
            stringArr.push(arr);
          } else {
            metricConfigs.forEach((metricConfig) => {
              if (metricConfig.type == 'count') {           //special case
                stack.push(aggregation['doc_count']);
              } else {
                stack.push(aggregation[metricConfig.id].value);
              }
            });
            stringArr.push(_.cloneDeep(stack));
            metricConfigs.forEach((metricConfig) => {   //POP metrics
              stack.pop();
            });
            stack.pop();                                    //POP last add bucket
          }

        } else {
          let nextLayer = _.nth(bucketConfigs, ++readConfigIndex).id;
          aggregation[nextLayer].buckets.forEach((agg) => {
            if (currentIndex != readConfigIndex - 1) {
              let needPop = readConfigIndex - 1 - currentIndex;
              for (let i = 0 ; i < needPop ; i++) {
                stack.pop();
                readConfigIndex--;
              }
            }
            readBuckets(agg, nextLayer, bucketConfigs, metricConfigs);
          });
        }
      }
    };

    $scope.readParams = () => {
      let ignoreBucketFields = $scope.vis.params.configLine.ignoreBucketFields == undefined ? []:$scope.vis.params.configLine.ignoreBucketFields;
      let ignoreMetricFields = $scope.vis.params.configLine.ignoreMetricFields == undefined ? []:$scope.vis.params.configLine.ignoreMetricFields;
      let linkFields = $scope.vis.params.configLine.linkField == undefined ? []:$scope.vis.params.configLine.linkField;

      return {
        ignoreBucketFields : ignoreBucketFields,
        ignoreMetricFields : ignoreMetricFields,
        linkFields : linkFields
      };
    };

    $scope.drawTable = ($element, data, columns, configs) => {
      let $table = $($element.children().find('table.container')[0]);
        
      if(_.isNull(columns) || _.isUndefined(columns)) return;
      let displayColumn = [];
      let order = [];
      columns.forEach((column, index) => {
        let o = [];
        o.push(index);
        let bucketConfig = _.find(configs.bucketConfigs, (con) => {
          return con.field.displayName == column.title;
        });
        if (!_.isUndefined(bucketConfig)) {
          o.push(bucketConfig.order);
          order.push(o);
          displayColumn.push({title : column.displayName == undefined ? column.title + ':' + bucketConfig.order : column.displayName + ':' + bucketConfig.order});
        } else {
          displayColumn.push({title : column.displayName == undefined ? column.title : column.displayName});
        }

      });
      let pageLength = $scope.vis.params.perPage == undefined ? 10 : $scope.vis.params.perPage;

      let searchBox = $scope.vis.params.enableSearchBox == undefined ? false : $scope.vis.params.enableSearchBox;
      $table.DataTable({
        "data" : data,
        "columns" : displayColumn,
        "autoWidth" : false,
        "pageLength" : pageLength,
        "bLengthChange": false,
        "order" : order,
        "searching" : searchBox
      });
    };

    // Get query results ElasticSearch
    $scope.$watch('esResponse', (resp, oldResp) => {
      if (resp) {
        $scope.initTable($element);
        let configs = $scope.readConfig();
        $scope.readHeaderFromConfig(configs.bucketConfigs, configs.metricConfigs);
        $scope.readData(configs.bucketConfigs, configs.metricConfigs, resp.aggregations);
        
        let params = $scope.readParams();
        if ($scope.needPrepareDataWithParams(params)) {
          $scope.prepareData(configs.bucketConfigs, params);
        } else {
          $scope.modifiedColumns = null;
          $scope.modifiedData = null;
        }

        let fieldFormatMap = $scope.vis.indexPattern.fieldFormatMap;
        if (!_.isEmpty(fieldFormatMap)) {
          let needFormatField = false;
          let fieldFormatConfig = {};
          let iterateData = [];
          if (!_.isNull($scope.modifiedColumns)) {
            iterateData = $scope.modifiedColumns;
          } else {
            iterateData = $scope.sourceColumns;
          }
          if (!_.isUndefined(iterateData)) {
            iterateData.forEach((column, index) => {
            if (!_.isUndefined(fieldFormatMap[column.title])) {
              needFormatField = true;
              let fieldType = _.find(configs.bucketConfigs, (o) => {
                return o.field.displayName == column.title;
              });
              fieldFormatConfig[index] = {formatClass:fieldFormatMap[column.title], fieldType:fieldType};
            }
          });

            if(needFormatField) {
              $scope.formatFields(fieldFormatConfig);
            }
          }
        }

        if (!_.isUndefined($scope.modifiedColumns) && !_.isUndefined($scope.modifiedData)
          && !_.isNull($scope.modifiedColumns) && !_.isNull($scope.modifiedData)) {
          $scope.drawTable($element, $scope.modifiedData, $scope.modifiedColumns, configs);
        } else {
          $scope.drawTable($element, $scope.sourceData, $scope.sourceColumns, configs);
        }
        
      }
    });

    $scope.formatFields = (fieldFormatConfig) => {
      let totalData = [];
      let rowData = [];
      let iterateData = [];
      if (!_.isNull($scope.modifiedColumns)) {
        iterateData = $scope.modifiedData;
      } else {
        iterateData = $scope.sourceData;
      }
      iterateData.forEach((row, index) => {
        rowData = [];
        row.forEach((cell, i) => {
          if (!_.isUndefined(fieldFormatConfig[i])) {
            let formatMethod = fieldFormatConfig[i].formatClass._convert;
            let fieldType = fieldFormatConfig[i].fieldType;
            let regexLink = regexHyperlink(cell);
            if (!_.isUndefined(regexLink.href) && !_.isUndefined(regexLink.context)) {
              let formatContext = formatMethod['html'](regexLink.context, fieldType.field && fieldType.field.type);
              let getFormatStyleAndContext = regexSpan(formatContext);
              if (!_.isUndefined(getFormatStyleAndContext.style) && !_.isUndefined(getFormatStyleAndContext.context)) {
                rowData.push('<a style="'+getFormatStyleAndContext.style+';text-decoration:none;" href="'+regexLink.href+'">'+getFormatStyleAndContext.context+'</a>')
              } else {
                rowData.push(cell);
              }
            } else {
              rowData.push(formatMethod['html'](cell, fieldType.field && fieldType.field.type));
            }
          } else {
            rowData.push(cell)
          }
        });
        totalData.push(rowData);
      });
      if (!_.isNull($scope.modifiedColumns)) {
        $scope.modifiedData = totalData;
      } else {
        $scope.sourceData = totalData;
      }

      function regexHyperlink(cell) {
        const regex = /<a.*?href="(.*?)">(.*?)<\/a>/g;
        let m;
        let href, context;
        while ((m = regex.exec(cell)) !== null) {
          //This is necessary to avoid infinite loops with zero-width matchs
          if (m.index == regex.lastIndex) {
            regex.lastIndex++;
          }
          //The result can be accessed through the 'm' -variable.
          m.forEach((match, groupIndex) => {
            switch(groupIndex){
              case 1:
                href = match;
                break;
              case 2:
                context = match;
                break;
            }
          });
        }
        return {
          href : href,
          context : context
        }
      }

      function regexSpan(cell) {
        const regex = /<span.*?style="(.*?)">(.*?)<\/span>/g;
        let m;
        let style, context;
        while ((m = regex.exec(cell)) !== null) {
          if (m.index == regex.lastIndex) {
            regex.lastIndex++;
          }
          m.forEach((match, groupIndex) => {
            switch(groupIndex){
              case 1:
                style = match;
                break;
              case 2:
                context = match;
                break;
            }
          });
        }
        return {
          style : style,
          context : context
        }
      }
    };

    $scope.prepareDataWithLinkFields = (linkFields, columns, datas) => {
      let index = [];
      for (var i in linkFields) {
        let fromField = linkFields[i].from;
        let toField = linkFields[i].to;
        let fromIndex = _.findIndex(columns, (o) => {
          return o.title == fromField;
        });
        let toIndex = _.findIndex(columns, (o) => {
          return o.title == toField;
        });
        if (fromIndex == -1 || toIndex == -1) {
          if (fromIndex == -1) {
            notify.error(fromField + ' field not found in result, please check your select buckets!');
          } else {
            notify.error(toField + ' field not found in result, please check your select buckets!');
          }
          continue;
        }
        index.push({fromIndex:fromIndex, toIndex:toIndex});
      }
      if (_.isEmpty(index)) return {data:datas};
      let returnData = [];
      datas.forEach((data, i) => {
        index.forEach((indexObj) => {
          let fName = data[indexObj.fromIndex];
          let tName = data[indexObj.toIndex];
          data[indexObj.toIndex] = '<a style="text-decoration:none;" href="'+ fName +'">'+tName+'</a>';
        });
        returnData.push(data);
      });
      return {
        data : returnData
      };
    };

    $scope.prepareDataWithIgnoreFields = (ignoreFields, columns, datas) => {
      let index = [];
      if (!_.isEmpty(ignoreFields)) {
        ignoreFields.forEach((fieldName) => {
          let fieldIndex = _.findIndex(columns, (o) => {
            return o.title == fieldName;
          });
          if (fieldIndex != -1) {
            index.push(fieldIndex);
          } else {
            notify.error(fieldName + ' field not found in result, please check your select buckets!');
            return
          }
        });
      }
      _.pullAt(columns, index);
      let returnData = [];
      datas.forEach((data) => {
        _.pullAt(data, index);
        returnData.push(data);
      });
      return {
        columns : columns,
        data : returnData
      };
    };

    $scope.prepareData = (configs, params) => {
      let columns = _.cloneDeep($scope.sourceColumns);
      let data = _.cloneDeep($scope.sourceData);
      if (!_.isUndefined(params.linkFields)) {
        let linkResult = $scope.prepareDataWithLinkFields(params.linkFields, columns, data);
        data = linkResult.data;
      }

      let ignoreFields = _.concat(params.ignoreBucketFields, params.ignoreMetricFields);

      $scope.ignoreFields = ignoreFields;

      if (!_.isUndefined(ignoreFields)) {
        let ignoreResult = $scope.prepareDataWithIgnoreFields(ignoreFields, columns, data);
        columns = ignoreResult.columns;
        data = ignoreResult.data;
      }

      $scope.modifiedColumns = columns;
      $scope.modifiedData = data;
    };

    $scope.needPrepareDataWithParams = (params) => {
      var need = false;
      for (var key in params) {
        if (params.hasOwnProperty(key)) {
          if (!_.isEmpty(params[key])) {
            need = true;
            break;
          }
        }
      }
      return need;
    };

    // Dump data

    let self = this;
    self.title = $scope.vis.title + '.csv';
    self._saveAs = require('@spalger/filesaver').saveAs;
    self.csv = {
      separator: ',',
      quoteValues: true
    };

    $scope.exportAsCsv = () => {
      let csv = new Blob([self.toCsv()], { type: 'text/plain' });
      self._saveAs(csv, self.title);
    };

    self.toCsv = () => {
      let formatted = $scope.prepareDataWithIgnoreFields($scope.ignoreFields, $scope.sourceColumns, $scope.sourceData);

      let rows = formatted.data;
      let columns = formatted.columns;
      let nonAlphaNumRE = /[^a-zA-Z0-9]/;
      let allDoubleQuoteRE = /"/g;

      function escape(val) {
        if (_.isObject(val)) val = val.valueOf();
        val = String(val);
        if (self.csv.quoteValues && nonAlphaNumRE.test(val)) {
          val = '"' + val.replace(allDoubleQuoteRE, '""') + '"';
        }
        return val;
      }

      // escape each cell in each row
      let csvRows = rows.map((row) => {
        return row.map(escape);
      });

      // add the columns to the rows
      csvRows.unshift(columns.map((col) => {
        return escape(col.displayName == undefined ? col.title : col.displayName);
      }));

      return csvRows.map((row) => {
        return row.join(self.csv.separator) + '\r\n';
      }).join('');
    };

  });
});

