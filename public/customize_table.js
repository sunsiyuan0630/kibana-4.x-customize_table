define(function (require) {

  require('plugins/customize_table/style/jquery.dataTables.css');
  require('plugins/customize_table/style/customize_table.css');
	// we also need to load the controller and used by the template
	require('plugins/customize_table/customize_table_controller');
  require('plugins/customize_table/customize_table_params');
	// register the provider with the visTypes registry
	require('ui/registry/vis_types').register(CustomizeTableVisProvider);

	function CustomizeTableVisProvider(Private) {
    var TemplateVisType = Private(require('ui/template_vis_type/TemplateVisType'));
    var Schemas = Private(require('ui/Vis/Schemas'));

    // return the visType object, which kibana will use to display and configure new
    // Vis object of this type.
    return new TemplateVisType({
      name: 'customize_table',
      title: 'Customize Table',
      description: 'This plugin show table with datatable.js, you could hide any fields including metric value in your selected index and add hyperlink to any fields.',
      icon: 'fa-table',
      template: require('plugins/customize_table/customize_table.html'),
      requiresSearch:true,
      params: {
        defaults: {
          configLine: {
            ignoreBucketFields : [],
            ignoreMetricFields : [],
            linkField : []
          },
          perPage : 10
        },
        editor: '<customize-table-params></customize-table-params>'
      },
      schemas: new Schemas([
        {
          group: 'metrics',
          name: 'metric',
          title: 'Y-Axis',
          min: 1,
          aggFilter: ['count', 'avg', 'sum', 'min', 'max', 'cardinality', 'std_dev'],
          defaults: [
            { schema: 'metric', type: 'count' }
          ]
        },
        {
          group: 'buckets',
          name: 'Split Rows',
          title: 'Split Rows',
          min: 0,
          max: Infinity,
          aggFilter:'!geohash_grid'
        }
      ]),
      requiresSearch: true
    });
  }

  // export the provider so that the visType can be required with Private()
  return CustomizeTableVisProvider;
});