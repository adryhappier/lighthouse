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

 /**
  * @fileoverview Gathers all image tags used on the page with their src, size,
  *   and attribute information. Executes script in the context of the page.
  */
'use strict';

const Gatherer = require('./gatherer');

/* global window, document, Image */

/* istanbul ignore next */
function collectImageTagInfo() {
  function parseSrcsetUrls(srcset) {
    if (!srcset) {
      return [];
    }

    const entries = srcset.split(',');
    const relativeUrls = entries.map(entry => entry.trim().split(' ')[0]);
    return relativeUrls.map(url => {
      const a = document.createElement('a');
      a.href = url;
      return a.href;
    });
  }

  function toObject(tag) {
    return {
      tagName: tag.tagName,
      src: tag.currentSrc,
      srcset: tag.srcset,
      srcsetUrls: parseSrcsetUrls(tag.srcset),
      sizes: tag.sizes,
      media: tag.media,
      clientWidth: tag.clientWidth,
      clientHeight: tag.clientHeight,
      naturalWidth: tag.naturalWidth,
      naturalHeight: tag.naturalHeight,
    };
  }

  return [...document.querySelectorAll('img')].map(tag => {
    if (tag.parentElement.tagName !== 'PICTURE') {
      return Object.assign(toObject(tag), {isPicture: false});
    }

    // `img` tags within `picture` behave strangely
    // The picture's width and height are reflected by the img tag's width
    // and height but the natural size is not necessarily accurate.
    const imgTagInfo = toObject(tag);
    const sources = [...tag.parentElement.children]
        .filter(tag => tag.tagName === 'SOURCE')
        .filter(tag => !tag.media || window.matchMedia(tag.media).matches)
        .map(toObject)
        .concat(imgTagInfo);
    return Object.assign(imgTagInfo, {
      isPicture: true,
      // nested chain is too deep for DevTools to handle so stringify
      sources: JSON.stringify(sources),
    });
  });
}

/* istanbul ignore next */
function determineNaturalSize(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener('error', reject);
    img.addEventListener('load', () => {
      resolve({
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight
      });
    });

    img.src = url;
  });
}

function pick(obj, keys) {
  const out = {};
  for (const key of keys) {
    out[key] = obj[key];
  }
  return out;
}

class ImageUsage extends Gatherer {

  /**
   * @param {!{src: string}} tag
   * @return {Promise<!Object>}
   */
  fetchTagWithSizeInformation(tag) {
    const url = JSON.stringify(tag.src);
    return this.driver.evaluateAsync(`(${determineNaturalSize.toString()})(${url})`)
      .then(size => {
        return Object.assign(tag, size);
      });
  }

  afterPass(options, traceData) {
    const driver = this.driver = options.driver;
    const indexedNetworkRecords = traceData.networkRecords.reduce((map, record) => {
      if (/^image/.test(record._mimeType)) {
        map[record._url] = pick(record, [
          'url', 'requestHeaders', 'resourceSize',
          'startTime', 'endTime',
        ]);
      }

      return map;
    }, {});

    return driver.evaluateAsync(`(${collectImageTagInfo.toString()})()`)
      .then(tags => {
        return Promise.all(tags.map(tag => {
          // rehydrate the sources property
          tag.sources = tag.sources && JSON.parse(tag.sources);

          // link up the image tag with its network record
          tag.networkRecord = indexedNetworkRecords[tag.src];

          // fill in natural size information if we can
          return tag.isPicture && tag.networkRecord ?
              this.fetchTagWithSizeInformation(tag) :
              Promise.resolve(tag);
        }));
      });
  }
}

module.exports = ImageUsage;
