/**
* Copyright (c) Microsoft.  All rights reserved.
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/

'use strict';

var util = require('util');
var azure = require('azure');

var utils = require('../util/utils');

var $ = utils.getLocaleString;

var namespaceNameIsValid = azure.Validate.namespaceNameIsValid;

exports.init = function (cli) {
  var log = cli.output;

  var sb = cli.category('sb')
    .description($('Commands to manage your Service Bus configuration'));

  var sbnamespace = sb.category('namespace')
    .description($('Commands to manage your Service Bus namespaces'));

  sbnamespace.command('list')
    .description($('List currently defined service bus namespaces'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(function (options, _) {
      var service = createService(options.subscription);
      var progress = cli.interaction.progress($('Getting namespaces'));
      var namespaces = service.listNamespaces(_);
      progress.end();

      cli.interaction.formatOutput(namespaces, function(outputData) {
        if(outputData.length === 0) {
          log.info($('No namespaces defined'));
        } else {
          log.table(outputData, function (row, ns) {
            row.cell($('Name'), ns.Name);
            row.cell($('Region'), ns.Region);
            row.cell($('Status'), ns.Status);
          });
        }
      });
    });

  sbnamespace.command('show [name]')
    .description($('Get detailed information about a single service bus namespace'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(function (name, options, _) {
      name = cli.interaction.promptIfNotGiven($('Service Bus namespace: '), name, _);
      namespaceNameIsValid(name, _);
      var service = createService(options.subscription);
      var progress = cli.interaction.progress($('Getting namespace'));
      var namespace = service.getNamespace(name, _);
      progress.end();

      cli.interaction.formatOutput(namespace, function(outputData) {
        Object.keys(outputData).forEach(function (key) {
          if (key !== '_') {
            log.data(util.format($('%s: %s'), key, outputData[key]));
          }
        });
      });
    });

  sbnamespace.command('check <name>')
    .description($('Check that a service bus namespace is legal and available'))
    .usage('[options] <name>')
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(function (name, options, _) {
      namespaceNameIsValid(name, _);
      var service = createService(options.subscription);
      var progress = cli.interaction.progress('Checking namespace ' + name);
      var result = service.verifyNamespace(name, _);
      progress.end();

      cli.interaction.formatOutput({ available: result }, function(outputData) {
        if (outputData.available) {
          log.data(util.format($('Namespace %s is available'), name));
        } else {
          log.data(util.format($('Namespace %s is not available'), name));
        }
      });
    });

  sbnamespace.command('create [namespace] [region]')
    .description($('Create a service bus namespace'))
    .usage('[options] <namespace> <region>')
    .option('-n, --namespace <namespace>', $('the namespace name'))
    .option('-r, --region <region>', $('the region to create the namespace in'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(function (namespaceName, region, options, _) {
      var service = createService(options.subscription);

      var params = utils.normalizeParameters({
        namespace: [namespaceName, options.namespace],
        region: [region, options.region]
      });

      if (params.err) { throw params.err; }

      namespaceName = cli.interaction.promptIfNotGiven($('Namespace name: '), params.values.namespace, _);
      region = cli.interaction.chooseIfNotGiven($('Region: '), $('Getting regions'), params.values.region,
          function (cb) {
            service.getRegions(function (err, regions) {
              if (err) { return cb(err); }
              cb(null, regions.map(function (region) { return region.Code; }));
            });
          }, _);
      var progress = cli.interaction.progress(util.format($('Creating namespace %s in region %s'), namespaceName, region));
      var createdNamespace = service.createNamespace(namespaceName, region, _);
      progress.end();

      cli.interaction.formatOutput(createdNamespace, function(outputData) {
        Object.keys(outputData).forEach(function (key) {
          log.data(util.format($('%s: %s'), key, outputData[key]));
        });
      });
    });

  sbnamespace.command('delete [namespace]')
    .description($('Delete a service bus namespace'))
    .option('-n, --namespace <namespace>', $('the namespace name'))
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(function (namespace, options, _) {
      var params = utils.normalizeParameters({
        namespace: [namespace, options.namespace]
      });

      if (params.err) { throw params.err; }

      namespace = cli.interaction.promptIfNotGiven($('Namespace name: '), params.values.namespace, _);

      if (!options.quiet && !cli.interaction.confirm(util.format($('Delete namespace %s? [y/n] '), namespace), _)) {
        return;
      }

      var service = createService(options.subscription);

      var progress = cli.interaction.progress(util.format($('Deleting namespace %s'), namespace));
      try {
        service.deleteNamespace(namespace, _);
      } finally {
        progress.end();
      }
    });

  var location = sbnamespace.category('location')
    .description($('Commands to manage your Service Bus locations'));

  location.list = location.command('list')
    .description($('Show list of available service bus locations'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(function (options, _) {
      var service = createService(options.subscription);
      var progress = cli.interaction.progress($('Getting locations'));
      var regions = service.getRegions(_);
      progress.end();

      cli.interaction.formatOutput(regions, function(outputData) {
        log.table(outputData, function (row, region) {
          row.cell($('Name'), region.FullName);
          row.cell($('Code'), region.Code);
        });
      });
    });

  function createService(subscription) {
    return utils.createServiceBusManagementService(cli.category('account').getCurrentSubscription(subscription), log);
  }
};