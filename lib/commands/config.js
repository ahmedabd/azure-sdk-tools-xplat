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

var util = require('util');

var utils = require('../util/utils');
var $ = utils.getLocaleString;

exports.init = function (cli) {
  var log = cli.output;

  var config = cli.category('config')
    .description($('Commands to manage your local settings'));

  config.command('list')
    .description($('List config settings'))
    .action(function () {
      log.info($('Getting config settings'));

      var cfg = utils.readConfig();
      if (!log.format().json && Object.keys(cfg).length === 0) {
        log.info($('No config settings found'));
        return;
      }
      log.table(cfg, function (row, name) {
        row.cell('Setting', name);
        row.cell('Value', cfg[name]);
      });
    });

  config.command('delete <name>')
  .description($('Delete a config setting'))
  .action(function (name) {
    var cfg = utils.readConfig();
    if (!(name in cfg)) {
      log.warn(util.format($('Setting "%s" does not exist'), name));
      return;
    }
    log.info(util.format($('Deleting "%s"'), name));
    delete cfg[name];
    utils.writeConfig(cfg);
    log.info($('Changes saved'));
  });

  config.command('set <name> <value>')
    .usage('<name> <value>')
    .description($('Update a config setting'))
    .action(function (name, value) {
      var cfg = utils.readConfig();
      if (name === 'endpoint') {
        value = utils.validateEndpoint(value);
      }

      log.info(util.format($('Setting "%s" to value "%s"'), name, value));
      cfg[name] = value;
      utils.writeConfig(cfg);
      log.info($('Changes saved'));
    });

  // apply any persistant switches at load-time
  function applyGlobalSettings() {
    var cfg = utils.readConfig();
    if (!cfg) {
      return;
    }

    if (cfg.labels === 'off') {
      log.format({ terse: true });
    }

    if (cfg.logo === 'off') {
      log.format({ logo: 'off' });
    } else {
      log.format({ logo: 'on' });
    }
  }

  applyGlobalSettings();
};
