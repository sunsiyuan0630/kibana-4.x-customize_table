'use strict';

module.exports = function (kibana) {

  return new kibana.Plugin({
  	name:'customize_table',
  	require:['kibana', 'elasticsearch'],
    uiExports: {
      visTypes: ['plugins/customize_table/customize_table']
    }
  });
};