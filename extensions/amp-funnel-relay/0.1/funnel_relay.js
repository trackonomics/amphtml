/* do the magic here */
//import {ENDPOINTS} from './constants';

//export var trx = window.trx || {};

import {setStyle} from '../../../src/style';

export class FunnelRelay {

  /**
   * Check the settings and add missing attributes if some corruption occur to
   * settings or when new settings are added.
   *
   * @param {*} baseSettings
   * @public
   * @static
   */
  static prepareDefaultSettings(baseSettings) {
    if (typeof baseSettings.detection_rules !== 'object') {
      baseSettings['detection_rules'] = {
        'auto': true,
        'custom': [],
        'exclude_urls': [],
        'page_url_filter': '',
      };
    }

    if (baseSettings.detection_rules.auto == null) {
      baseSettings.detection_rules.auto = true;
    }
    if (baseSettings.detection_rules.auto_networks == null) {
      baseSettings.detection_rules['auto_networks'] = {
        'amazon': true,
        'ls': true,
        'cj': true,
        'sas': false,
        'awin': false,
        'pj': false,
        'sl': false,
        'ir': false,
      };
    }
    if (!(baseSettings.detection_rules.custom instanceof Array)) {
      baseSettings.detection_rules.custom = [];
    }
    if (!(baseSettings.detection_rules.exclude_urls instanceof Array)) {
      baseSettings.detection_rules['exclude_urls'] = [];
    }
    if (baseSettings.detection_rules.page_url_filter == null) {
      baseSettings.detection_rules['page_url_filter'] = '';
    }

    if (typeof baseSettings.features !== 'object') {
      baseSettings.features = {};
    }

    if (baseSettings.features.append_referrer == null) {
      baseSettings.features['append_referrer'] = {
        'enabled': true,
        'attr_name': 'referrer',
        'new_query_param': false,
      };
    }
    if (baseSettings.features.attributes_forwarding == null) {
      baseSettings.features['attributes_forwarding'] = {
        enabled: false,
        attributes: [],
      };
    }
    if (baseSettings.features.append_timing == null) {
      baseSettings.features['append_timing'] = {
        'enabled': false,
        't_load': false,
        't_clicked': false,
        't_toclick': false,
        'new_query_param': false,
      };
    }
    if (baseSettings.features.append_attributes == null) {
      baseSettings.features['append_attributes'] = {
        enabled: false,
        attributes: '',
      };
    }
    if (baseSettings.features.track_events == null) {
      baseSettings.features['track_events'] = {
        enabled: false,
        pageview: false,
        clicks: false,

      };
    }
    if (baseSettings.features.auto_optimize_link == null) {
      baseSettings.features['auto_optimize_link'] = {
        enabled: false,
      };
    }
    if (baseSettings.features.link_preview == null) {
      baseSettings.features['link_preview'] = {
        'enabled': false,
        'show_icon': false,
        'show_metadata': false,
        'show_coupons': false,
      };
    }
    if (baseSettings.features.shorten_extra_param == null) {
      baseSettings.features['shorten_extra_param'] = {
        enabled: false,
      };
    }
    if (baseSettings.features.metadata == null) {
      baseSettings.features.metadata = {
        enabled: false,
        selectors: '',
      };
    }

    return baseSettings;
  }

  /**
   * Construct and run
   * @param {Object} settings
   * @param {*} win
   * @param {*} doc
   */
  constructor(settings, win, doc) {
    try {
      this._win = win;
      this._ampDoc = doc;
      this._logPrefix = 'MagicLink:: ';
      this._loadTime = Date.now();
      this._links = [];
      this._report = {};
      this._excludeUrlsRegex = [];

      this.prepareSettings_(settings);
      this.prepareExcludeRegExp_();
      this.run();

    } catch (exp) {
      console.error('Magic Links \'init\' procedure fail! Details: ' + exp);
      if (exp.stack) {
        console.error(exp.stack);
      }
    }
  }

  /**
   *
   * @param {string} mlId
   * @param {*} event
   */
  static renderLinkPreview(mlId, event) {
    let str = `iframe[data-ml-preview="${mlId}"]`;
    const imgEm = document.querySelector(str);
    if (imgEm != null) {
      imgEm.parentNode.removeChild(imgEm);
      return;
    }

    str = `a[data-ml-id="${mlId}"]`;
    const anchor = document.querySelector(str);
    if (anchor != null) {
      const iframeEm = document.createElement('iframe');
      iframeEm.setAttribute('data-ml-preview', mlId);
      iframeEm.setAttribute('scrolling', 'no');
      iframeEm.setAttribute('frameborder', '0');
      setStyle(iframeEm, 'borderStyle', 'solid');
      setStyle(iframeEm, 'borderWidth', 2, 'px');
      setStyle(iframeEm, 'borderColor', 'grey');
      setStyle(iframeEm, 'borderRadius', 3, 'px');
      setStyle(iframeEm, 'position', 'absolute');
      setStyle(iframeEm, 'width', 120, 'px');
      setStyle(iframeEm, 'height', 90, 'px');
      setStyle(iframeEm, 'background', '#fff');

      const docElem = document.documentElement;
      const box = anchor.getBoundingClientRect();
      setStyle(iframeEm, 'top', box.top
          + (window.pageYOffset - docElem.clientTop) - 100, 'px');
      setStyle(iframeEm, 'left', box.left +
          (window.pageXOffset - docElem.clientLeft) + (box.width - 60), 'px');

      document.body.appendChild(iframeEm);

      let iframeDoc = (iframeEm.contentWindow || iframeEm.contentDocument);
      if (iframeDoc.document) {
        iframeDoc = iframeDoc.document;
      }

      const imgEm = iframeDoc.createElement('img');
      const url = 'http://images.shrinktheweb.com/xino.php?stwembed=1&stwaccesskeyid=4abc115f8a632c5&stwsize=120x90&stwurl=' +
          anchor.href;
      imgEm.setAttribute('src', url);
      setStyle(imgEm, 'width', '100', '%');
      setStyle(imgEm, 'height', 'auto');
      iframeDoc.body.appendChild(imgEm);
      setStyle(iframeDoc.body, 'padding', 1, 'px');
    }

    event.stopImmediatePropagation();
  }

  /**
   * Run eh features
   *
   * @param {boolean}[reset] reset When working with simulator we want to reset
   *   the links before apply the ML logic again.
   */
  run(reset) {
    try {
      //if page_url_filter is set check that page url match the condition
      if (!this.checkPageUrlMatch_()) {
        return;
      }

      //find links to manipulate
      this.detectLinks_();

      //reset the link url to original state.Used when working with simulator
      // to prevent multiple append of link parameters.
      if (reset === true && this._links.length > 0) {
        for (let i = 0; i < this._links.length; i++) {
          const item = this._links[i];
          const origUrl = item.anchor.getAttribute('data-orig-url');
          if (!this.isEmpty_(origUrl)) {
            item.anchor.href = origUrl;
          }
        }
      }

      //apply magic-links features
      if (this._links.length > 0) {
        this.runFeatures_();
      }

      //is specified prepare and send report data to listeners
      const scriptEm = document.getElementById('funnel-relay-installer');
      if (scriptEm != null) {
        if (scriptEm.getAttribute('data-report') === 'true') {
          this.postReport_();
        }
      }
    } catch (exp) {
      console.error('Magic Links \'run\' procedure fail! Details: ' + exp);
      if (exp.stack) {
        console.error(exp.stack);
      }
    }
  }

  /**
   * Check the enabled features and run corresponding feature logic.
   *
   * @private
   */
  runFeatures_() {
    const obj = this._settings.features;

    //check if we have at least one feature enabled for appending data
    let isAppending = false, featureId, options;
    const featureKeys = Object.keys(obj);
    for (let i = 0; i < featureKeys.length; i++) {
      featureId = featureKeys[i];
      options = obj[featureId];
      if (!this.asBoolean_(options['enabled'])) {
        continue;
      }

      switch (featureId) {
        case 'append_referrer':
        case 'append_timing':
        case 'append_attributes':
        case 'attributes_forwarding':
          isAppending = true;
          break;
      }
    }

    if (isAppending) {
      this.appendUUID_();
    }

    for (let i = 0; i < featureKeys.length; i++) {
      featureId = featureKeys[i];
      options = obj[featureId];
      if (!this.asBoolean_(options['enabled'])) {
        continue;
      }

      switch (featureId) {
        case 'append_referrer':
          this.appendReferrer_(options);
          break;
        case 'append_timing':
          this.appendTiming_(options);
          break;
        case 'append_attributes':
          this.appendAttributes_(options);
          break;
        case 'attributes_forwarding':
          this.attributesForwarding_(options);
          break;
        case 'track_events':
          this.prepareEventTracking_(options);
          break;
        case 'auto_optimize_link':
          this.autoOptimizeLinks_(options);
          break;
        case 'link_preview':
          this.preparePreview_(options);
          break;
        case 'shorten_extra_param':
          this.prepareShortExtraParam_(options);
          break;
        case 'metadata':
          this.prepareMetadata_(options);
          break;
      }
    }
  }

  /**
   * Append UUID to link so we can later match between clicks and conversions
   * @private
   */
  appendUUID_() {
    for (let i = 0; i < this._links.length; i++) {
      const item = this._links[i];
      const url = item.anchor.href;
      const {network} = item;
      const uuid = this.generateUUID_();
      item.anchor.href = this.appendExtraParam_(network,
          url, 'xid', uuid, false);
    }
  }

  /**
   * Appen referrer to the link
   *
   * @param {Object} options
   * @private
   */
  appendReferrer_(options) {
    if (this.asBoolean_(options.enabled)) {
      const attrName = options.attr_name;
      const newQueryParam = this.asBoolean_(options.new_query_param);

      for (let i = 0; i < this._links.length; i++) {
        const item = this._links[i];
        const url = item.anchor.href;
        const {network} = item;
        let {referrer} = document;
        if (referrer.charAt(referrer.length - 1) === '/') {
          referrer = referrer.substring(0, referrer.length - 1);
        }
        item.anchor.href = this.appendExtraParam_(network, url,
            attrName, referrer, newQueryParam);
        this.markLink_('feature', 'append_referrer', item.anchor);
      }
    }
  }

  /**
   * Appen timind properties to the link.
   *
   * @param {Object} options
   * @private
   */
  appendTiming_(options) {
    if (this.asBoolean_(options.enabled)) {
      const newQueryParam = this.asBoolean_(options.new_query_param);
      const recordLoad = options['t_load'];
      const recordClicked = options['t_clicked'];
      const recordToClick = options['t_toclick'];

      for (let i = 0; i < this._links.length; i++) {
        const item = this._links[i];
        const url = item.anchor.href;
        const {anchor, network} = item;

        if (recordLoad) {
          anchor.href = this.appendExtraParam_(network, url, 't_loaded',
              this._loadTime, newQueryParam);
        }

        anchor.addEventListener('click', event => {
          const now = Date.now();
          const anchor = event.currentTarget;
          if (recordClicked) {
            anchor.href = this.appendExtraParam_(network, anchor.href,
                't_clicked', now, newQueryParam);
          }
          if (recordToClick) {
            anchor.href = this.appendExtraParam_(network, anchor.href,
                't_toclick', (now - this._loadTime), newQueryParam);
          }
        });

        if (recordLoad || recordClicked || recordToClick) {
          this.markLink_('feature', 'append_timing', anchor);
        }
      }
    }
  }

  /**
   * Append custom static attributes to affiliate link.
   *
   * @param {Object} options
   * @private
   */
  appendAttributes_(options) {
    if (this.asBoolean_(options.enabled)
        && !this.isEmpty_(options.attributes) > 0) {

      const params = this.parseQuery_(options.attributes);
      params.forEach((value, key) => {
        for (let i = 0; i < this._links.length; i++) {
          const item = this._links[i];
          const {anchor} = item;
          anchor.href = this.appendExtraParam_(item.network, anchor.href, key,
              value, false);
          this.markLink_('feature', 'append_attributes', anchor);
        }
      });
    }
  }

  /**
   * Attributes forwarding takes attributes from page query and forward to
   * affiliate link
   *
   * @param {Object} options
   * @private
   */
  attributesForwarding_(options) {
    if (this.asBoolean_(options.enabled)
        && options.attributes instanceof Array
        && options.attributes.length > 0) {

      const str = location.search;
      if (!this.isEmpty_(str) && str.length > 1) {
        const params = this.parseQuery_(str.substring(1));
        params.forEach((value, key) => {
          if (options.attributes.includes(key)) {
            for (let i = 0; i < this._links.length; i++) {
              const item = this._links[i];
              const {anchor} = item;
              anchor.href = this.appendExtraParam_(item.network, anchor.href,
                  key, value, false);
              this.markLink_('feature', 'attributes_forwarding', anchor);
            }
          }
        });
      }
    }
  }

  /**
   *
   * @param {Object} options
   * @private
   */
  prepareEventTracking_(options) {
    if (this.asBoolean_(options.enabled)
        && !this.isEmpty_(options.analytics_code)) {

      //todo add support for tracking events
      /*this.gaTracker = new GATracker(options.analytics_code, this._win,
          this._ampDoc);
      if (this.asBoolean_(options.pageview)) {
        this.gaTracker.trackPageView();
      }
      if (this.asBoolean_(options.clicks)) {
        for (let i = 0; i < this._links.length; i++) {
          const item = this._links[i];
          const {anchor} = item;
          anchor.addEventListener('click', () => {
            const label = this.getAnchorLabel_(anchor, 50) + ' [' +
                anchor.href + ']';
            this.gaTracker.trackEvent('magic-links', 'click', label, '1');
          });
          this.markLink_('feature', 'track_events', anchor);
        }
        this.gaTracker.trackPageView();
      }*/
    }
  }

  /**
   *
   * @param {Object} options
   * @private
   */
  autoOptimizeLinks_(options) {
    if (this.asBoolean_(options.enabled)) {
      //todo
    }
  }

  /**
   * Prepare links to show icon of target page using shrink the web service.
   *
   * @param {Object} options
   * @private
   */
  preparePreview_(options) {
    if (this.asBoolean_(options.enabled)) {
      if (options.show_icon) {
        for (let i = 0; i < this._links.length; i++) {
          const item = this._links[i];
          const {anchor} = item;
          const handleEm = document.createElement('span');
          setStyle(handleEm, 'cursor', 'pointer');
          handleEm.innerHTML = '&nearr;';
          handleEm.addEventListener('click',
              FunnelRelay.renderLinkPreview.bind(this,
                  anchor.getAttribute('data-ml-id')));
          anchor.insertAdjacentElement('afterend', handleEm);
          this.markLink_('feature', 'preview', anchor);
        }
      }
      if (options.show_metadata) {

      }
      if (options.show_coupons) {

      }
    }
  }

  /**
   * Take the data in extra parameter and prepare short url from it. This
   * intend to solve problem fo too long extra data.
   *
   * @param {Object} options
   * @private
   */
  prepareShortExtraParam_(options) {
    if (this.asBoolean_(options.enabled)) {
      //todo
    }
  }

  /**
   * Check is metadata selectors are defined and collect for defined selectors.
   * @param {Object} options
   * @private
   */
  prepareMetadata_(options) {
    if (!this.isEmpty_(options.selectors) && typeof document.evaluate ===
        'function') {
      let attrName, xpath, xpathResult;
      const lines = options.selectors.split('\n');
      for (let i = 0; i < lines.length; i++) {
        try {
          const line = lines[i];
          const arr = line.split('|');
          if (arr.length > 1) {
            attrName = arr[0].trim();
            xpath = arr[1].trim();
            xpathResult = document.evaluate(xpath, document, null,
                XPathResult.STRING_TYPE, null);
            if (!this.isEmpty_(xpathResult.stringValue)) {
              for (let i = 0; i < this._links.length; i++) {
                const item = this._links[i];
                const {anchor} = item;
                anchor.href = this.appendExtraParam_(item.network, anchor.href,
                    attrName, xpathResult.stringValue, false);
                this.markLink_('feature', 'append_attributes', anchor);
              }
            }
          } else {
            this.log_(
                'Invalid metadata line. Line must have name and Xpath' +
                ' value in this format: name | xpath ');
          }
        } catch (e) {
          this.log_(e);
        }
      }
    }
  }

  /**
   * Detect the links to manipulate and prepare list of anchor elements.
   *
   * @private
   */
  detectLinks_() {
    if (this.asBoolean_(this._settings.detection_rules.auto)) {
      this.autoDetectByUrl_();
    }

    for (let i = 0; i < this._settings.detection_rules.custom.length; i++) {
      const options = this._settings.detection_rules.custom[i];
      switch (options.type) {
        case 'url':
          this.detectByUrlToken_(options);
          break;
        case 'element' :
          this.detectByElementSelector_(options);
          break;
      }
    }

    for (let i = 0; i < this._links.length; i++) {
      const item = this._links[i];
      item.anchor.setAttribute('data-ml-id', i);
    }
  }

  /**
   * Use auto detection of URLS to recognize known links.
   * @private
   */
  autoDetectByUrl_() {
    let url, network;
    const settings = this._settings.detection_rules.auto_networks;

    for (let i = 0; i < document.links.length; i++) {
      const link = document.links[i];
      url = link.href;
      if (this.isAbsolute_(url) && !this.isEmpty_(url) &&
          !this.isExcludedUrl_(url)) {
        network = this.detectKnownAffiliateLink_(url);
        if (network !== false && this.asBoolean_(settings[network])) {
          this._links.push({network, anchor: link});
          if (!link.hasAttribute('data-orig-url')) {
            link.setAttribute('data-orig-url', url);
          }
        }

      }
    }
  }

  /**
   * Detect links by given url token.
   *
   * @param {Object} options
   * @private
   */
  detectByUrlToken_(options) {
    let url, network;

    for (let i = 0; i < document.links.length; i++) {
      const link = document.links[i];
      url = link.href;
      if (this.isAbsolute_(url) && !this.isEmpty_(url) &&
          !this.isExcludedUrl_(url)) {
        const regexp = new RegExp(options.pattern);
        if (regexp.test(url)) {
          network = this.detectKnownAffiliateLink_(url);
          if (network === false) {
            network = 'other';
          }
          this._links.push({network, anchor: link});
          if (!link.hasAttribute('data-orig-url')) {
            link.setAttribute('data-orig-url', url);
          }
        }
      }
    }
  }

  /**
   * Detect links by element selector.
   *
   * @param {Object} options
   * @private
   */
  detectByElementSelector_(options) {
    let url, network;
    const links = document.querySelectorAll(options.selector);
    links.forEach(link => {
      if (link.nodeName === 'A') {
        url = link.href;
        if (this.isAbsolute_(url) && !this.isEmpty_(url) &&
            !this.isExcludedUrl_(url)) {
          const regexp = new RegExp(options.pattern);
          if (regexp.test(url)) {
            network = this.detectKnownAffiliateLink_(url);
            if (network === false) {
              network = 'other';
            }
            this._links.push({network, anchor: link});
            if (!link.hasAttribute('data-orig-url')) {
              link.setAttribute('data-orig-url', url);
            }
          }
        }
      }
    });
  }

  /**
   * Detect affiliate links by structure and move to corresponding buffer.
   * @param {string} url
   * @return {*}
   * @private
   */
  detectKnownAffiliateLink_(url) {

    if (url.indexOf('/dp/') !== -1 && url.includes('tag=') &&
        url.includes('amazon.')) {
      return 'amazon';
    } else if (url.indexOf('linksynergy') !== -1) {
      return 'ls';
    } else if (url.indexOf('anrdoezrs.net') !== -1
        || url.indexOf('jdoqocy.com') !== -1
        || url.indexOf('tqlkg.com') !== -1
        || url.indexOf('tkqlhce.com') !== -1
        || url.indexOf('dpbolvw.net') !== -1
        || url.indexOf('jqoqocy.com') !== -1
        || url.indexOf('kqzfj.com') !== -1) {
      return 'cj';
    } else if (url.indexOf('shareasale.com') !== -1) {
      return 'sas';
    } else if (url.indexOf('awin1.com') !== -1) {
      return 'awin';
    } else if (url.indexOf('pepperjamnetwork.com') !== -1) {
      return 'pj';
    } else if (url.indexOf('go.redirectingat.com') !== -1 ||
        url.indexOf('go.skimresources.com') !== -1) {
      return 'sl';
    } else if (url.indexOf('/c/') !== -1) {
      return 'ir';
    }
    return false;
  }

  /**
   * Check if url need to be excluded and not being analyzed.
   *
   * @param {string} url
   * @private
   */
  isExcludedUrl_(url) {
    const excludeRegs = this._excludeUrlsRegex;
    for (let i = 0; i < excludeRegs.length; i++) {
      if (excludeRegs.test(url)) {
        return true;
      }
    }
    return false;
  }

  /**
   * 1. Load on-page settings if found.
   * 2. Complete missing settings by running prepareDefaultSettings()
   * 3. Merge with settings loaded from server
   *
   * @param {Object} settings
   * @private
   */
  prepareSettings_(settings) {
    this._settings = FunnelRelay.prepareDefaultSettings({});
    this._settings = this.extendForte_(this._settings, settings);
  }

  /**
   * Write log message to console.
   *
   * @param {string} message
   * @private
   */
  log_(message) {
    console.log(this._logPrefix + message);
  }

  /**
   * Write error message to console.
   *
   * @param {string} message
   * @param {*} stack
   * @private
   */
  error_(message, stack) {
    console.error(this._logPrefix + message);
    if (stack != null) {
      console.error(stack);
    }
  }

  /**
   * Prepare regular expressions for checking exclude tokens, so that we
   * compile only once and reuse the regexp object.
   * @private
   */
  prepareExcludeRegExp_() {
    this._excludeUrlsRegex = [];
    const excludes = this._settings.detection_rules.exclude_urls;
    if (excludes.length > 0) {
      for (let i = 0; i < excludes.length; i++) {
        this._excludeUrlsRegex = new RegExp(excludes[i], 'i');
      }
    }
  }

  /**
   * Extend obj1 with he content of obj2, using deep copy.
   *
   * @param {Object} obj1
   * @param {Object} obj2
   * @return {{}}
   */
  extendForte_(obj1, obj2) {
    if (obj1 == null || obj2 == null) {
      throw new Error('Null object provided to extendForte!');
    }
    const result = {};
    let key;
    let keys = Object.keys(obj1);
    for (let i = 0; i < keys.length; i++) {
      key = keys[i];
      const val1 = obj1[key];
      const val2 = obj2[key];
      if (val1 != null && val2 != null) {
        if (val1 instanceof Array) {
          result[key] = val2; //in the case of array override
        } else if (typeof val1 === 'object') {
          result[key] = this.extendForte_(val1, val2);
        } else {
          result[key] = val2;
        }
      } else if (val1 == null) {
        result[key] = val2;
      } else if (val2 == null) {
        result[key] = val1;
      } else {
        result[key] = null;
      }
    }
    keys = Object.keys(obj2);
    for (let i = 0; i < keys.length; i++) {
      key = keys[i];
      if (!(key in obj1) || obj1[key] == null) {
        result[key] = obj2[key];
      }
    }
    return result;
  }

  /**
   * Post report that can be used by other tools to analyze magic-links
   * activity.
   *
   * @private
   */
  postReport_() {
    this._report = {
      links: [],
    };

    for (let i = 0; i < this._links.length; i++) {
      const {anchor} = this._links[i];
      const label = this.getAnchorLabel_(anchor, 100);
      this._report.links.push({
        network: this._links[i].network,
        url: anchor.href,
        label,
      });
    }

    window.postMessage({
      type: 'MSG_FROM_MAGIC_LINKS',
      action: 'report',
      report: JSON.stringify(this._report),
    }, '*');
  }

  /**
   * Add mark to link so we know that it was manipulated.
   *
   * @param {string} type
   * @param {string} value
   * @param {string} anchor
   * @private
   */
  markLink_(type, value, anchor) {
    let val = anchor.getAttribute('data-' + type);
    val += ',' + value;
    anchor.setAttribute('data-ml', 'true');
    anchor.setAttribute('data-' + type, val);
  }

  /**
   * When appending extra parameter we must refer to affiliate link type, and
   * detect the special parameter in the URL used to carry extra information.
   * Then we append the value to this parameter by concatenating using pipe
   * delimiter. If we do not found the special parameter for extra info, create
   * one according to link type, and set it correctly in the url.
   *
   * @param {string} network
   * @param {string} url
   * @param {string} name
   * @param {*} value
   * @param {boolean} forceNewQueryParams set true to ignore searching for
   *   known extra info param, and force the 'name' as new query param
   * @private
   */
  appendExtraParam_(network, url, name, value, forceNewQueryParams) {
    let queryParamToUse = null;
    let pathStyle = false;

    if (forceNewQueryParams) {
      queryParamToUse = null;
    } else {
      switch (network) {
        case 'cj':
          //search for 'sid/'
          queryParamToUse = 'sid';
          pathStyle = true;
          break;
        case 'ls':
          //search for 'u1='
          queryParamToUse = 'u1';
          break;
        case 'sas':
          //search for 'afftrack='
          queryParamToUse = 'afftrack';
          break;
        case 'awin':
          //search for 'clickref='
          queryParamToUse = 'clickref';
          break;
        case 'pj':
          //search for 'sid='
          queryParamToUse = 'sid';
          break;
        case 'sl':
          //search for 'xcust='
          queryParamToUse = 'xcust';
          break;
        case 'ir':
          //search for 'subId1='
          queryParamToUse = 'subId1';
          break;
        case 'wg':
          //search for 'clickref='
          queryParamToUse = 'clickref';
          break;
        case 'amazon':
          //search for 'ascsubtag='
          queryParamToUse = 'ascsubtag';
          break;
        default:
          queryParamToUse = null;
      }
    }

    return this.appendNameValueToUrl_(url, name, value, queryParamToUse,
        pathStyle, network);

  }

  /**
   * Append property to url. If the attribute name already set, append the new
   * value with pipe delimiter. Else set new attribute in the url string.
   *
   * @param {string} url
   * @param {string} name
   * @param {string} value Note! we run encodeURIComponent inside no need to
   *   encode the value
   * @param {string} queryParamToUse  the query parameter for setting the
   *   value. If not specified use the 'name' as new query parameter
   * @param {boolean} pathStyle if true the name value will be added to path.
   *   Else they will be added as query parameter
   * @param {string} network
   * @private
   */
  appendNameValueToUrl_(url, name, value, queryParamToUse, pathStyle, network) {
    let inx1, inx2, appendValue, currentVal;
    value = encodeURIComponent(value);

    if (queryParamToUse != null) {
      appendValue = name + ':' + value;

      if (pathStyle) {
        //attributes are saturated by "/" e.g. (CJ)
        inx1 = url.indexOf(queryParamToUse + '/');
        if (inx1 !== -1) {
          inx1 += (queryParamToUse + '/').length;
          inx2 = url.indexOf('/', inx1);

          if (inx2 === -1) {
            inx2 = url.length;
          }

          currentVal = url.substring(inx1, inx2);
          if (currentVal.length > 0) {
            appendValue = '|' + appendValue;
          }
          return this.insertToString_(url, appendValue, inx2);

        } else {
          if (network === 'cj') {
            const inx3 = url.indexOf('dlg/');
            if (inx3 !== -1) {
              appendValue = queryParamToUse + '/' + appendValue + '/';
              return this.insertToString_(url, appendValue, inx3 + 4);
            } else if (url.indexOf('?') === -1) {
              //url does not have parameters. Add  ?sid=value
              return url + '?sid=' + appendValue;
            } else {
              //url already have parameters prefix by ?

              const inx11 = url.indexOf('?');
              const inx12 = url.indexOf('sid=', inx11 + 1);
              if (inx12 !== -1) {
                //url already have "sid=" parameter
                const inx13 = url.indexOf('&', inx12 + 4);
                if (inx13 === -1) {
                  //sid=xyz at the end of url
                  return url + '|' + appendValue;
                } else {
                  appendValue = '|' + appendValue;
                  return this.insertToString_(url, appendValue, inx13);
                }
              } else if (inx11 === url.length - 1) {
                //url ends with "?"
                return url + 'sid=' + appendValue;
              } else {
                //url does not have "sid=" parameter
                return url + '&sid=' + appendValue;
              }

            }
          } else {
            appendValue = '/' + queryParamToUse + '/' + appendValue;
            return this.insertToString_(url, appendValue, url.length);
          }
        }

      } else if ((inx1 = url.indexOf(queryParamToUse + '='))) {
        //attributes are saturated by "&"
        if (inx1 !== -1) {
          inx2 = url.indexOf('&', inx1);
          if (inx2 === -1) {
            inx2 = url.length;
          }

          currentVal = url.substring(inx1 + queryParamToUse.length + 1, inx2);
          if (currentVal.length > 0) {
            appendValue = '|' + appendValue;
          }
        } else {
          if (url.indexOf('?') !== -1) {
            appendValue = '&' + queryParamToUse + '=' + appendValue;
          } else {
            appendValue = '?' + queryParamToUse + '=' + appendValue;
          }
          return this.insertToString_(url, appendValue, url.length);
        }

        return this.insertToString_(url, appendValue, inx2);

      }

    }

    if (pathStyle) {
      //inject the name value as part of url path.
      url += name + '/' + value;
    } else {
      //inject the name value as pary of url query param
      if (url.indexOf('?') !== -1) {
        url += ('&' + name + '=' + value);
      } else {
        url += ('?' + name + '=' + value);
      }
    }
    return url;
  }

  /**
   * If 'page_url_filter' is defined, check that page URL match the filter
   * @return {boolean}
   * @private
   */
  checkPageUrlMatch_() {
    if (!this.isEmpty_(this._settings.detection_rules.page_url_filter)) {
      return location.href.includes(
          this._settings.detection_rules.page_url_filter);
    }

    return true;
  }

  /**
   *
   * @param {string} url
   * @param {Object} properties
   * @return {*}
   * @private
   */
  appendToUrl_(url, properties) {
    if (url.indexOf('?') !== -1) {
      url += ('&' + encodeURIComponent(properties));
    } else {
      url += ('?' + encodeURIComponent(properties));
    }
    return url;
  }

  /**
   * Append string is specified position.
   *
   * @param {string} str
   * @param {string} value
   * @param {int} position
   * @return {string}
   * @private
   */
  insertToString_(str, value, position) {
    let str2;
    const str1 = str.substring(0, position);
    if (position < str.length) {
      str2 = str.substring(position);
    } else {
      str2 = '';
    }

    return str1 + value + str2;
  }

  /**
   * Parse query string
   * @param {string} query
   * @return {Map}
   */
  parseQuery_(query) {
    const params = new Map();
    if (!query) {
      return params;
    }

    const pairs = query.split(/[;&]/);
    for (let i = 0; i < pairs.length; i++) {
      const KeyVal = pairs[i].split('=');
      if (!KeyVal || KeyVal.length !== 2) {
        continue;
      }
      const key = unescape(KeyVal[0]);
      let val = unescape(KeyVal[1]);
      val = val.replace(/\+/g, ' ');
      params.set(key, val);
    }
    return params;
  }

  /**
   * Tool for getting anchor label
   *
   * @param {string} anchor
   * @param {int} maxSize
   * @private
   */
  getAnchorLabel_(anchor, maxSize) {
    const labelEm = document.createElement('label');
    labelEm.innerHTML = anchor.innerHTML;
    labelEm.normalize();
    let label = labelEm.innerHTML;
    label = label.trim();
    if (label.length > maxSize) {
      label = label.substring(0, maxSize) + '...';
    }

    return label;
  }

  /**
   * Check is string is either null or empty
   * @param {string} str
   * @return {boolean} true if the str is empty
   * @private
   */
  isEmpty_(str) {
    return str == null || str === '';
  }

  /**
   * Check if url is absolute
   * @param {string} url
   * @return {boolean}
   * @private
   */
  isAbsolute_(url) {
    return url.indexOf('http://') === 0 || url.indexOf('https://') === 0;
  }

  /**
   * Get the value as boolean type
   * @param {*} val
   * @return {boolean}
   * @private
   */
  asBoolean_(val) {
    return val === 'true' || val === true;
  }

  /**
   * Combine random character, current time and random number to create uuid
   *
   * @return {string}
   * @private
   */
  generateUUID_() {
    return String.fromCharCode(Math.floor((Math.random() * 10) + 97))
        + Date.now()
        + '-' + Math.floor((Math.random() * 1000000) + 1);
  }

}

/*
 * See https://developers.google.com/analytics/devguides/collection/analyticsjs/creating-trackers
 * See https://developers.google.com/analytics/devguides/collection/analyticsjs/tracker-object-reference
 */
export class GATracker {
  /**
   * @param {string} code
   */
  /*constructor(code, win, doc) {
    this._win = win;
    this._ampDoc = doc;
    /!**
     * Google Analytics code for current environment.
     * If we can't get GA code from environment settings we keep this adapter
     * as disabled.
     *!/
    /!*this.gaCode = code;
    window.ga = window.ga || function() {
      (window.ga.q = window.ga.q || []).push(arguments);
    };
    window.ga.l = Number(new Date);

    window.ga('create', this.gaCode, 'auto', 'mlTracker', {
      'alwaysSendReferrer': true,
      'allowAnchor': false,
    });
    window.ga('mlTracker.set', 'referrer', document.referrer);
    window.ga('mlTracker.set', 'appName', 'trackonomics-relay');*!/

  }*/

  /**
   * Track event
   *
   * @param {string} eventCategory    text    yes    Typically the object that
   *     was interacted with (e.g. 'Video')
   * @param  {string} eventAction    text    yes    The type of interaction
   *     (e.g.
   *   'play')
   * @param {string} eventLabel    text    no    Useful for categorizing events
   *     (e.g.
   *   'Fall Campaign')
   * @param {*} eventValue    integer    no    A numeric value associated with
   *     the event (e.g. 42)
   * @see https://developers.google.com/analytics/devguides/collection/analyticsjs/events
   */
  /*trackEvent(eventCategory, eventAction, eventLabel, eventValue) {
    //todo
    /!*const target = this._win.document.createElement('div');
    this._win.document.body.appendChild(target);
    const service = new InstrumentationService(this._ampDoc);
    service.triggerEventForTarget(target,
        'click', {'event_category': 'programmatic'});*!/

    /!*const em = document.createElement('a');
    em.id = 'funnel-relay-link-clicked';
    em.setAttribute('data-event-category', eventCategory);
    em.setAttribute('data-event-action', eventAction);
    em.setAttribute('data-event-label', eventLabel);
    em.setAttribute('data-event-value', eventValue);
    em.click();*!/
    /!*if (window.ga) {
      window.ga('mlTracker.send', 'event', {
        eventCategory: eventCategory,
        eventAction: eventAction,
        eventLabel: eventLabel,
        eventValue: eventValue,
        fieldsObject: fieldsObject,
        transport: 'beacon',
      });
    }*!/

  }*/

  /**
   * Track screenview.
   *
   * @param {string} screenName
   */
  /*trackScreenView() {
    //args line screenName
    //todo
    /!*if (window.ga) {
      window.ga(function() {
        window.ga('mlTracker.send', 'screenview', {
          'screenName': screenName,
          'appId': this.appId,
          'appVersion': this.appVersion,
          'appName': this.appName,
        });
      });
    }*!/
  }*/

  /**
   * Track page view
   *
   */
  /*trackPageView() {
    //todo
    /!*if (window.ga) {
      window.ga(function() {
        window.ga('mlTracker.set', 'page', location.href);
        window.ga('mlTracker.send', 'pageview', {
          page: location.href,
          title: document.title,
        });
      });
    }*!/
  }*/

}

