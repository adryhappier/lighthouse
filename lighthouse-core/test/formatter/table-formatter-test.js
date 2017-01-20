/**
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

/* eslint-env mocha */

const TableFormatter = require('../../formatters/table.js');
const assert = require('assert');

describe('TableFormatter', () => {
  it('handles invalid input', () => {
    const pretty = TableFormatter.getFormatter('pretty');
    assert.equal(pretty(), '');
    assert.equal(pretty(null), '');
    assert.equal(pretty({}), '');
    assert.equal(pretty({results: 'blah'}), '');
  });

  it('createTable() produces formatted rows/cols', () => {
    const headings = {url: 'URL', lineCol: 'Line/col', code: 'Snippet'};
    const results = [{
      url: 'http://example.com',
      line: 123,
      col: 456,
      code: 'code snippet'
    }];
    const table = TableFormatter.createTable(headings, results);
    assert.deepEqual(table.headings, Object.keys(headings).map(key => headings[key]));
    assert.equal(table.rows.length, 1);
    assert.equal(table.rows[0].cols.length, Object.keys(headings).length);
    assert.equal(table.rows[0].cols[0], 'http://example.com');
    assert.equal(table.rows[0].cols[1], '123:456');
    assert.equal(table.rows[0].cols[2], '\`code snippet\`');
  });
});
