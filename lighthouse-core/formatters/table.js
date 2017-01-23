/**
 * @license
 * Copyright 2017 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

const Formatter = require('./formatter');
const path = require('path');
const fs = require('fs');
const html = fs.readFileSync(path.join(__dirname, 'partials/table.html'), 'utf8');

class Table extends Formatter {
  static getFormatter(type) {
    switch (type) {
      case 'pretty':
        return result => {
          if (!result) {
            return '';
          }
          if (!result.table || !Array.isArray(result.table.headings) ||
              !Array.isArray(result.table.rows)) {
            return '';
          }

          let output = '';
          result.table.rows.forEach(row => {
            output += '      ';
            row.cols.forEach(col => {
              // Omit code snippet cols.
              if (col.startsWith('`') && col.endsWith('`')) {
                return;
              }
              output += `${col} `;
            });
            output += '\n';
          });
          return output;
        };

      case 'html':
        // Returns a handlebars string to be used by the Report.
        return html;

      default:
        throw new Error('Unknown formatter type');
    }
  }

  /**
   * Preps a formatted table (headings/col vals) for output.
   * @param {!Object<string, string>} headings for the table. The order of this
   *     object's key/value will be the order of the table's headings.
   * @param {!Array<*>} results Audit results.
   * @return {{headings: Array<string>, rows: [{cols: [*]}]}} headings
   */
  static createTable(headings, results) {
    const headingKeys = Object.keys(headings);

    const rows = results.map(result => {
      const cols = headingKeys.map(key => {
        switch (key) {
          case 'code':
            // Wrap code snippets in markdown ticks.
            return '`' + result[key].trim() + '`';
          case 'lineCol':
            // Create a combined line/col numbers for the lineCol key.
            return `${result.line}:${result.col}`;
          default:
            return result[key];
        }
      });

      return {cols};
    });

    headings = headingKeys.map(key => headings[key]);

    return {headings, rows};
  }
}

module.exports = Table;
