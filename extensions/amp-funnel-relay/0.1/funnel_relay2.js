/* funnel-relay version 2  - do the magic here */

export class FunnelRelay {

  /**
   * Check the settings and add missing attributes if some corruption
   * occur to settings or when new settings are added.
   *
   * @public
   * @static
   */
  static prepareDefaultSettings(baseSettings) {
    if (typeof baseSettings.detection_rules !== 'object') {
      baseSettings.detection_rules = {
        auto: true,
        custom: [],
        exclude_urls: [],
        page_url_filter: '',
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
        'td': false,
        'wg': false,
        'pt': false,
        'dynamic': false,
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
    if (baseSettings.dynamic_domains == null) {
      baseSettings['dynamic_domains'] = [];
    }

    return baseSettings;
  }

  constructor(autoRun) {
    try {
      if (autoRun == null) {
        autoRun = true;
      }
      if (env == null) {
        env = 'prod';
      }

      this._paramsBuffer = {};
      this._autoRun = autoRun;
      this.init(autoRun);
    } catch (e) {
      this.error_(e, e.stack);
    }
  }

  /**
   * Initialize script settings
   */
  init() {
    try {
      this._onPageSettings = trx.magic_links_settings || {};

      //@formatter:off
                    this._envSettings = {ENV_SETTINGS_PLACEHOLDER: null}; //do not change this token.
                    //@formatter:on

      //@formatter:off
                    this._serverSettings = {SETTINGS_PLACEHOLDER: null}; //do not change this token.
                    //@formatter:on

      if (this._envSettings['events_recording_env'] == null) {
        this._envSettings['events_recording_env'] = 'prod';
      }
      this._delimiter1 = '|';
      this._delimiter2 = '~';
      this._uuid = this.generateUUID_();
      this._trxEqUuid = 'trx=' + this._uuid; //special token we use to
                                             // mark dynamic links prior
                                             // to click
      this._trxEqUuidOld = this._trxEqUuid;
      this._logPrefix = 'FunnelRelay:: ';
      this._loadTime = Date.now();
      this._links = [];
      this._report = {};
      this._exclude_urls_regex = [];
      this._scriptEm = document.getElementById('funnel-relay-installer');
      if (this._scriptEm == null) {
        return;
      }

      this.prepareSettings_();
      this.prepareExcludeRegExp_();
      if (this._autoRun) {
        this.run();
      }

    } catch (exp) {
      console.error(
          'Magic Links \'init\' procedure fail! Details: ' + exp);
      if (exp.stack) {
        console.error(exp.stack);
      }
    }
  }

  /**
   * Get on-page settings
   * @return {*|{}}
   * @public
   */
  get onPageSettings() {
    return this._onPageSettings;
  }

  /**
   * Get server settings. If not set return empty object.
   * @return {*|{}}
   * @public
   */
  get serverSettings() {
    if (this._serverSettings.hasOwnProperty('SETTINGS_PLACEHOLDER')) {
      return {};
    } else {
      return this._serverSettings;
    }
  }

  /**
   * Get the buffer used to collect parameters to send with affiliate
   * link.
   * @return {{}}
   */
  get paramsBuffer() {
    return this._paramsBuffer;
  }

  /**
   *
   * @param {String} mlId
   * @param event
   */
  static renderLinkPreview(mlId, event) {
    let imgEm = document.querySelector(
        'iframe[data-ml-preview="' + mlId + '"]');
    if (imgEm != null) {
      imgEm.parentNode.removeChild(imgEm);
      return;
    }

    let anchor = document.querySelector('a[data-ml-id="' + mlId + '"]');
    if (anchor != null) {
      let iframeEm = document.createElement('iframe');
      iframeEm.setAttribute('data-ml-preview', mlId);
      iframeEm.setAttribute('scrolling', 'no');
      iframeEm.setAttribute('frameborder', '0');
      iframeEm.style.borderStyle = 'solid';
      iframeEm.style.borderWidth = '2px';
      iframeEm.style.borderColor = 'grey';
      iframeEm.style.borderRadius = '3px';
      iframeEm.style.position = 'absolute';
      iframeEm.style.width = '120px';
      iframeEm.style.height = '90px';
      iframeEm.style.background = '#fff';

      let docElem = document.documentElement;
      let box = anchor.getBoundingClientRect();
      iframeEm.style.top = box.top +
          (window.pageYOffset - docElem.clientTop) - 100 + 'px';
      iframeEm.style.left = box.left +
          (window.pageXOffset - docElem.clientLeft) + (box.width - 60) +
          'px';

      document.body.appendChild(iframeEm);

      let iframeDoc = (iframeEm.contentWindow ||
          iframeEm.contentDocument);
      if (iframeDoc.document) {
        iframeDoc = iframeDoc.document;
      }

      let imgEm = iframeDoc.createElement('img');
      let url = 'http://images.shrinktheweb.com/xino.php?stwembed=1&stwaccesskeyid=4abc115f8a632c5&stwsize=120x90&stwurl=' +
          anchor.href;
      imgEm.setAttribute('src', url);
      imgEm.style.width = '100%';
      imgEm.style.height = 'auto';
      iframeDoc.body.appendChild(imgEm);
      iframeDoc.body.style.padding = '1px';
    }

    event.stopImmediatePropagation();
  }

  /**
   * Run eh features
   *
   * @param {boolean}[reset] reset When working with simulator we want to
   *     reset the links before apply the ML logic again.
   */
  run(reset) {
    try {
      if (!this._scriptEm.hasAttribute('data-property-id')
          || !this._scriptEm.hasAttribute('data-customer-id')
          ||
          this.isEmpty_(this._scriptEm.hasAttribute('data-property-id'))
          ||
          this.isEmpty_(this._scriptEm.hasAttribute('data-customer-id'))
      ) {
        this.log_(
            'Missing one of the mandatory script attributes \'data-customer-id\' and/or \'data-property-id\'');
        return;
      }

      if (this.isEmpty_(this._envSettings.events_recording_api)) {
        this.log_(
            'Missing environment settings. Check that you setup $ENV_SETTINGS in my.cfg.php and that \'events_recording_api\' is set there!');
        return;
      }

      //if page_url_filter is set check that page url match the condition
      if (!this.checkPageUrlMatch_()) {
        return;
      }

      //find links to manipulate
      this.detectLinks_();

      //reset the link url to original state.Used when working with
      // simulator to prevent multiple append of link parameters.
      if (reset === true && this._links.length > 0) {
        for (let i = 0; i < this._links.length; i++) {
          let item = this._links[i];
          let origUrl = item.anchor.getAttribute('data-orig-url');
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
      if (scriptEm != null) {
        if (scriptEm.getAttribute('data-report') === 'true') {
          this.postReport_();
        }
      }
    } catch (exp) {
      console.error(
          'Magic Links \'run\' procedure fail! Details: ' + exp);
      if (exp.stack) {
        console.error(exp.stack);
      }
    }
  }

  /**
   * Check the enabled features and run corresponding feature logic.
   * We prepare feature's related data on {@link _paramsBuffer} and we
   * write it to events-recording service when user click a link. Unlike
   * funnel_relay version 1 we do not change link URLS
   *
   * @private
   */
  runFeatures_() {
    //first write static data to params buffer
    this._paramsBuffer['origin'] = this.href;
    this._paramsBuffer['uuid'] = this._uuid;
    this._paramsBuffer['property_id'] = this._scriptEm.getAttribute(
        'data-property-id');
    this._paramsBuffer['customer_id'] = this._scriptEm.getAttribute(
        'data-customer-id');
    if (this._paramsBuffer['customer_id'].indexOf('_') !== -1) {
      const arr = this._paramsBuffer['customer_id'].split('_');
      this._paramsBuffer['cidp1'] = arr[0];
      this._paramsBuffer['cidp2'] = arr[1];
    } else {
      this._paramsBuffer['cidp1'] = '-';
      this._paramsBuffer['cidp2'] = '-';
    }
    this._paramsBuffer['source'] = encodeURIComponent(location.href);
    this._paramsBuffer['event_type'] = 'click';

    //now apply features and add features data to params buffer
    let obj = this._settings.features;
    for (let featureId in obj) {
      if (obj.hasOwnProperty(featureId)) {
        let options = obj[featureId];
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
          case 'metadata':
            this.prepareMetadata_(options);
            break;
        }
      }
    }

    //for each of the detected link register event that prepare the URL
    // with added parameters, when user click the link
    for (let i = 0; i < this._links.length; i++) {
      let link = this._links[i];
      link.anchor.removeEventListener('click', this.linkClicked_);
      link.anchor.addEventListener('click',
          this.linkClicked_.bind(this, link));
    }
  }

  linkClicked_(link, event) {
    this.prepareAffiliateLink_(event.currentTarget, link.network);
    if (event) {
      event.stopImmediatePropagation();
    }
  }

  /**
   * Appen referrer to the link
   *
   * @param options
   * @private
   */
  appendReferrer_(options) {
    if (this.asBoolean_(options.enabled)) {
      let attrName = options.attr_name;
      let newQueryParam = this.asBoolean_(options.new_query_param);
      let referrer = document.referrer;
      if (referrer.charAt(referrer.length - 1) === '/') {
        referrer = referrer.substring(0, referrer.length - 1);
      }
      this._paramsBuffer[attrName] = referrer;
    }
  }

  /**
   * Appen timind properties to the link.
   *
   * @param options
   * @private
   */
  appendTiming_(options) {
    if (this.asBoolean_(options.enabled)) {
      let newQueryParam = this.asBoolean_(options.new_query_param);
      let recordLoad = options.t_load;
      let recordClicked = options.t_clicked;
      let recordToClick = options.t_toclick;
      if (recordLoad) {
        this._paramsBuffer['t_loaded'] = this._loadTime;
      }
    }
  }

  /**
   * Append custom static attributes to affiliate link.
   *
   * @param options
   * @private
   */
  appendAttributes_(options) {
    if (this.asBoolean_(options.enabled)
        && !this.isEmpty_(options.attributes) > 0) {

      let params = this.parseQuery_(options.attributes);
      params.forEach((value, key, map) => {
        for (let i = 0; i < this._links.length; i++) {
          let item = this._links[i];
          this._paramsBuffer[key] = value;
        }
      });
    }
  }

  /**
   * Attributes forwarding takes attributes from page query and forward
   * to affiliate link
   *
   * @param options
   * @private
   */
  attributesForwarding_(options) {
    if (this.asBoolean_(options.enabled)
        && options.attributes instanceof Array
        && options.attributes.length > 0) {

      let str = location.search;
      if (!this.isEmpty_(str) && str.length > 1) {
        let params = this.parseQuery_(str.substring(1));
        params.forEach((value, key, map) => {
          if (options.attributes.includes(key)) {
            this._paramsBuffer[key] = value;
          }
        });
      }
    }
  }

  /**
   *
   * @param options
   * @private
   */
  prepareEventTracking_(options) {
    if (this.asBoolean_(options.enabled)) {

      if (!this.isEmpty_(options.analytics_code) && typeof ga !==
          'undefined') {
        this.trackerObj = new trx.GATracker(options.analytics_code);
      } else if (s != null && typeof s.tl == 'function') {
        this.trackerObj = new trx.AdobeTracker(options.analytics_code);
      } else {
        return;
      }

      if (this.asBoolean_(options.pageview)) {
        this.trackerObj.trackPageView();
      }
      if (this.asBoolean_(options.clicks)) {
        for (let i = 0; i < this._links.length; i++) {
          let item = this._links[i];
          let anchor = item.anchor;
          anchor.addEventListener('click', () => {
            let label = this.getAnchorLabel_(anchor, 50) + ' [' +
                anchor.href + ']';
            this.trackerObj.trackEvent('magic-links', 'click', label, '1',
                {
                  xid: this._uuid,
                  anchor: anchor,
                });
          });
          this.markLink_('feature', 'track_events', anchor);
        }
      }
    }
  }

  /**
   *
   * @param options
   * @private
   */
  autoOptimizeLinks_(options) {
    if (this.asBoolean_(options.enabled)) {
      //todo
    }
  }

  /**
   * Prepare links to show icon of target page using shrink the web
   * service.
   *
   * @param options
   * @private
   */
  preparePreview_(options) {
    if (this.asBoolean_(options.enabled)) {
      if (options.show_icon) {
        for (let i = 0; i < this._links.length; i++) {
          let item = this._links[i];
          let anchor = item.anchor;
          let handleEm = document.createElement('span');
          handleEm.style.cursor = 'pointer';
          handleEm.innerHTML = '&nearr;';
          handleEm.addEventListener('click',
              trx.MagicLinks.renderLinkPreview.bind(this,
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
   * Check is metadata selectors are defined and collect for defined
   * selectors.
   * @param options
   * @private
   */
  prepareMetadata_(options) {
    if (!this.isEmpty_(options.selectors)) {
      let attrName, path, pathResult;
      let lines = options.selectors.split('\n');
      for (let i = 0; i < lines.length; i++) {
        try {
          let line = lines[i];
          let arr = line.split('|');
          if (arr.length > 1) {
            attrName = arr[0].trim();
            path = arr[1].trim();
            if (path.length === 0) {
              continue;
            }

            if (path.indexOf('js::') === 0) {
              pathResult = this.getObjectByPath_(
                  path.replace('js::', ''));
            } else if (typeof document.evaluate === 'function') {
              let result = document.evaluate(path, document, null,
                  XPathResult.STRING_TYPE, null);
              pathResult = result.stringValue;
            }
            if (!this.isEmpty_(pathResult)) {
              this._paramsBuffer[attrName] = pathResult;
            }
          } else {
            this.log_(
                'Invalid metadata line. Line must have name and Xpath value in this format: name | xpath ');
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
      this.markDynamicDomainLinks_();
      this.autoDetectByUrl_();
    }

    for (let options  of this._settings.detection_rules.custom) {
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
      let item = this._links[i];
      item.anchor.setAttribute('data-ml-id', i);
      item.anchor.setAttribute('data-ml', 'true');
    }
  }

  /**
   * Use auto detection of URLS to recognize known links.
   * @private
   */
  autoDetectByUrl_() {
    let url, network;
    let settings = this._settings.detection_rules.auto_networks;

    for (let i = 0; i < document.links.length; i++) {
      let link = document.links[i];
      url = link.href;
      if (this.isAbsolute_(url) && !this.isEmpty_(url) &&
          !this.isExcludedUrl_(url)) {
        network = this.detectKnownAffiliateLink_(url);
        if (network !== false && this.asBoolean_(settings[network])) {
          this._links.push({network: network, anchor: link});
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
   * @param options
   * @private
   */
  detectByUrlToken_(options) {
    let url, network;

    for (let i = 0; i < document.links.length; i++) {
      let link = document.links[i];
      url = link.href;
      if (this.isAbsolute_(url) && !this.isEmpty_(url) &&
          !this.isExcludedUrl_(url)) {
        let regexp = new RegExp(options.pattern);
        if (regexp.test(url)) {
          network = this.detectKnownAffiliateLink_(url);
          if (network === false) {
            network = 'other';
          }
          this._links.push({network: network, anchor: link});
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
   * @param options
   * @private
   */
  detectByElementSelector_(options) {
    let url, network;
    let links = document.querySelectorAll(options.selector);
    links.forEach((link) => {
      if (link.nodeName === 'A') {
        url = link.href;
        if (this.isAbsolute_(url) && !this.isEmpty_(url) &&
            !this.isExcludedUrl_(url)) {
          let regexp = new RegExp(options.pattern);
          if (regexp.test(url)) {
            network = this.detectKnownAffiliateLink_(url);
            if (network === false) {
              network = 'other';
            }
            this._links.push({network: network, anchor: link});
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
   *
   * @param url
   * @param textNumber
   * @param linksBuffer
   * @param metadata
   */
  detectKnownAffiliateLink_(url, textNumber, linksBuffer, metadata) {

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
        || url.indexOf('kqzfj.com') !== -1
        || url.indexOf('kqzyfj.com') !== -1
        || url.indexOf('ftjcfx.com') !== -1
        || url.indexOf('lduhtrp.net') !== -1) {
      return 'cj';
    } else if (url.indexOf('shareasale.com') !== -1) {
      return 'sas';
    } else if (url.indexOf('awin1.com') !== -1) {
      return 'awin';
    } else if (url.indexOf('pepperjamnetwork.com') !== -1
        || url.includes('pjtra.com/t/') || url.includes('gopjn.com/t/') ||
        url.includes('pjatr.com/t/')
        || url.includes('pntra.com/t/') || url.includes('pntrs.com/t/') ||
        url.includes('pntrac.com/t/')) {
      return 'pj';
    } else if (url.indexOf('go.redirectingat.com') !== -1) { // || url.indexOf("go.skimresources.com") !== -1
      return 'sl';
    } else if (url.search(/\/c\/(\d+)\/(\d+)\//) !== -1) {
      return 'ir';
    } else if (url.indexOf('track.webgains.com') !== -1) {
      return 'wg';
    } else if (url.indexOf('prf.hn/click') !== -1) {
      return 'pt';
    } else if (url.includes('tradedoubler.com/click?') ||
        url.includes('pf.tradedoubler.com/pf/')) {
      return 'td';
    } else if (url.indexOf('trx=') !== -1) {
      return 'dynamic';
    }
    return false;
  }

  /**
   * If we found links defined in dynamic_domains we add {@link
      * _trxEqUuid} to the hash section of the link
   * @private
   */
  markDynamicDomainLinks_() {
    let inx1, url;
    let domains = this._settings.dynamic_domains;
    if (domains != null) {
      for (let i = 0; i < document.links.length; i++) {
        try {
          let link = document.links[i];
          let domain = link.hostname;
          domain = domain.replace('www.', '');
          if (domains.includes(domain)) {
            let url = link.href;

            //if we are replacing the uuid we first delete the old token
            url = url.replace(this._trxEqUuidOld, this._trxEqUuid);

            inx1 = url.indexOf(this._trxEqUuid);
            if (inx1 === -1) {
              if (url.indexOf('#') === -1) {
                url += '#';
              }
              url += this._trxEqUuid;
            }
            link.href = url;
          }
        } catch (e) {
          this.log_(e);
        }
      }
    }
  }

  /**
   * Check if url need to be excluded and not being analyzed.
   *
   * @param url
   * @private
   */
  isExcludedUrl_(url) {
    let excludeRegs = this._exclude_urls_regex;
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
   * @private
   */
  prepareSettings_() {
    this._settings = FunnelRelay.prepareDefaultSettings({});

    //merge with settings set on
    if (Object.keys(this.serverSettings).length > 0) {
      this._settings = this.extendForte_(this._settings,
          this.serverSettings);
    }

    //Get on-page settings and add missing settings if require
    if (Object.keys(this.onPageSettings).length > 0) {
      this._settings = this.extendForte_(this._settings,
          this.onPageSettings);
    }
  }

  /**
   * This method is invoked when user click the link.
   *
   * 1. Collect the parameters that can be gathered only when user click
   * the link
   * 2. Build the parameters string
   * 3. Append parameters to URL of clicked anchor.
   *
   * @param anchor
   * @param network
   * @private
   */
  prepareAffiliateLink_(anchor, network) {
    try {
      this.collectClickTimeParams_();
      this.writeDataToEventsService_();
      if (!anchor.href.includes(this._trxEqUuid)) {

        //we may need to cleanup older xid set on link
        if (this._olderUuid != null) {
          let oldCidToken = 'xid:' + this._olderUuid;
          //in the case it append to link path
          anchor.href = anchor.href.replace('%7C' + oldCidToken, '');

          //in the case it append to other value path
          anchor.href = anchor.href.replace('|' + oldCidToken, '');

          //in the case it was the only value
          anchor.href = anchor.href.replace(oldCidToken, '');
        }
        anchor.href = this.appendExtraParam_(network, anchor.href, 'xid',
            this._paramsBuffer.uuid, false);
      }

      //after we we write to events-recording service we replace the
      // uuid, so if user click again on other link of the same page, the
      // uuid will be different
      this._olderUuid = this._uuid;
      this._uuid = this.generateUUID_();
      this._paramsBuffer['uuid'] = this._uuid;
      this._trxEqUuidOld = this._trxEqUuid;
      this._trxEqUuid = 'trx=' + this._uuid;
      this.markDynamicDomainLinks_();
    } catch (e) {
      console.log('Magic Links error on click: ' + e);
    }
  }

  /**
   * Collect that data that we can only collect when user actually click
   * the link
   * @private
   */
  collectClickTimeParams_() {
    let options = this._settings.features['append_timing'];
    if (this.asBoolean_(options.enabled)) {
      let recordClicked = options.t_clicked;
      let recordToClick = options.t_toclick;
      let now = Date.now();
      if (recordClicked) {
        this._paramsBuffer['t_clicked'] = this._loadTime;
      }
      if (recordToClick) {
        this._paramsBuffer['t_toclick'] = (now - this._loadTime);
      }
    }
  }

  /**
   * Write funnel-relay data associate with clicked link, on
   * events-recording-service.
   *
   * @private
   */
  writeDataToEventsService_() {
    //set per/click values. Values per/click are not define in
    // runFeatures_()
    this._paramsBuffer['client_time'] = new Date().toISOString();
    let payload = encodeURIComponent(JSON.stringify(this._paramsBuffer));

    if (this._scriptEm.hasAttribute('data-simulator')) {
      this.log_(
          'Funnel relay write to events-recording service. Payload:\n' +
          decodeURIComponent(payload));
    }

    let apiUrl = this._envSettings.events_recording_api + '/write';
    let body = {
      'env': this._envSettings['events_recording_env'],
      'id': this._paramsBuffer['uuid'],
      'app_key': this._envSettings.app_key,
      'property_id': this._paramsBuffer['property_id'],
      'customer_id': this._paramsBuffer['customer_id'],
      'cidp1': this._paramsBuffer['cidp1'],
      'cidp2': this._paramsBuffer['cidp2'],
      'event_type': this._paramsBuffer['event_type'],
      'data': payload,
    };

    return fetch(apiUrl, {
      method: 'POST',
      mode: 'cors',
      cache: 'no-cache',
      credentials: 'same-origin',
      headers: {
        ///"Content-Type": "application/x-www-form-urlencoded"
        'Content-Type': 'application/json',
      },
      redirect: 'follow',
      referrer: '*client',
      keepalive: true, //Fetch with the keepalive flag is a replacement
                       // for the Navigator.sendBeacon() API.
      body: JSON.stringify(body), // body data type must match
                                  // "Content-Type" header
    }).then((response) => {
      if (!response.ok) {
        this.log_('Fail to write event data. HTTP error, status = ' +
            response.status);
        return response.json();
      } else {
        return Promise.resolve({});
      }
    }).then((response) => {
      //if we have error message print it
      if (response.message) {
        this.log_(response.message);
      }
    });
  }

  /**
   * Write log message to console.
   *
   * @param message
   * @private
   */
  log_(message) {
    console.log(this._logPrefix + message);
  }

  /**
   * Write error message to console.
   *
   * @param message
   * @param stack
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
    this._exclude_urls_regex = [];
    let excludes = this._settings.detection_rules.exclude_urls;
    if (excludes.length > 0) {
      for (let i = 0; i < excludes.length; i++) {
        this._exclude_urls_regex = new RegExp(excludes[i], 'i');
      }
    }
  }

  /**
   * Extend obj1 with he content of obj2, using deep copy.
   *
   * @param obj1
   * @param obj2
   * @return {{}}
   */
  extendForte_(obj1, obj2) {
    if (obj1 == null || obj2 == null) {
      throw  'Null object provided to extendForte!';
    }
    const result = {};
    let key;
    for (key in obj1) {
      if (obj1.hasOwnProperty(key)) {
        let val1 = obj1[key];
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
    }
    for (key in obj2) {
      if (obj2.hasOwnProperty(key)) {
        if (!(key in obj1) || obj1[key] == null) {
          result[key] = obj2[key];
        }
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
      let anchor = this._links[i].anchor;
      let label = this.getAnchorLabel_(anchor, 100);
      this._report.links.push({
        network: this._links[i].network,
        url: anchor.href,
        label: label,
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
   * @param type
   * @param value
   * @param anchor
   * @private
   */
  markLink_(type, value, anchor) {
    let val = anchor.getAttribute('data-' + type);
    val += ',' + value;
    anchor.setAttribute('data-ml', 'true');
    anchor.setAttribute('data-' + type, val);
  }

  /**
   * When appending extra parameter we must refer to affiliate link type,
   * and detect the special parameter in the URL used to carry extra
   * information. Then we append the value to this parameter by
   * concatenating using pipe delimiter. If we do not found the special
   * parameter for extra info, create one according to link type, and set
   * it correctly in the url.
   *
   * @param {String} network
   * @param {String} url
   * @param {String} name
   * @param {*} value
   * @param {boolean} forceNewQueryParams set true to ignore searching
   *     for known extra info param, and force the 'name' as new query
   *     param
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
        case 'td':
          //search for 'epi('
          queryParamToUse = 'epi(';
          pathStyle = true;
          break;
        case 'pt':
          //search for 'pubref:'
          queryParamToUse = 'pubref:';
          pathStyle = true;
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
   * Append property to url. If the attribute name already set, append
   * the new value with pipe delimiter. Else set new attribute in the url
   * string.
   *
   * @param {String} url
   * @param {String} name
   * @param {String} value Note! we run encodeURIComponent inside no need
   *     to encode the value
   * @param {String} queryParamToUse  the query parameter for setting the
   *     value. If not specified use the 'name' as new query parameter
   * @param {boolean} pathStyle if true the name value will be added to
   *     path. Else they will be added as query parameter
   * @param {String} network
   * @private
   */
  appendNameValueToUrl_(
      url, name, value, queryParamToUse, pathStyle, network) {
    let inx1, inx2, inx3, attr, appendValue, currentVal;
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
            appendValue = this.getDelimiter_(url) + appendValue;
          }
          return this.insertToString_(url, appendValue, inx2);

        } else {
          if (network === 'pt') {
            return this.appendNameValueToUrl_PT_(url, name, value,
                queryParamToUse, appendValue);
          }

          if (network === 'cj') {
            return this.appendNameValueToUrl_CJ_(url, name, value,
                queryParamToUse, appendValue);
          }

          if (network === 'td') {
            return this.appendNameValueToUrl_TD_(url, name, value,
                queryParamToUse, appendValue);
          }

          appendValue = '/' + queryParamToUse + '/' + appendValue;
          return this.insertToString_(url, appendValue, url.length);
        }

      } else {
        //attributes are saturated by "&"
        inx1 = url.indexOf(queryParamToUse + '=');
        if (inx1 !== -1) {
          inx2 = url.indexOf('&', inx1);
          if (inx2 === -1) {
            inx2 = url.length;
          }

          currentVal = url.substring(inx1 + queryParamToUse.length + 1,
              inx2);
          if (currentVal.length > 0) {
            appendValue = this.getDelimiter_(url) + appendValue;
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

  appendNameValueToUrl_TD_(
      url, name, value, queryParamToUse, appendValue) {
    let inx1, inx2, inx3, inx4, currentVal;
    inx1 = url.indexOf('epi(');
    if (inx1 !== -1) {
      inx1 += (queryParamToUse).length;
      inx2 = url.indexOf(')', inx1);
      if (inx2 !== -1) {
        currentVal = url.substring(inx1, inx2);
        if (currentVal.length > 0) {
          appendValue = this.getDelimiter_(url) + appendValue;
        }
        return this.insertToString_(url, appendValue, inx2);
      }
    } else {
      //decide if this is link with brackets
      inx1 = url.indexOf('url(');
      if (inx1 !== -1) {
        //yes append epi(data)
        return url + 'epi(' + appendValue + ')';
      } else {
        //no append &epi=data
        inx3 = url.indexOf('&epi=');
        if (inx3 === -1) {
          return url + '&epi=' + appendValue;
        } else {
          //append to existing data
          inx4 = url.indexOf('&', inx3 + 5);
          if (inx4 === -1) {
            //epi=xyz at the end of url
            return url + this.getDelimiter_(url) + appendValue;
          } else {
            appendValue = this.getDelimiter_(url) + appendValue;
            return this.insertToString_(url, appendValue, inx4);
          }
        }
      }
    }
    return url; //do not process link
  }

  appendNameValueToUrl_PT_(
      url, name, value, queryParamToUse, appendValue) {
    let inx1, inx2, currentVal;
    inx1 = url.indexOf(queryParamToUse);
    if (inx1 !== -1) {
      inx1 += (queryParamToUse).length;
      inx2 = url.indexOf('/', inx1);
      if (inx2 !== -1) {
        currentVal = url.substring(inx1, inx2);
        if (currentVal.length > 0) {
          appendValue = this.getDelimiter_(url) + appendValue;
        }
        return this.insertToString_(url, appendValue, inx2);
      }
    } else {
      inx1 = url.indexOf('/destination');
      if (inx1 !== -1) {
        appendValue = '/pubref:' + appendValue;
        return this.insertToString_(url, appendValue, inx1);
      }
    }
    return url; //do not process link
  }

  /**
   * Append parameter to CJ link
   * @param url
   * @param name
   * @param value
   * @param queryParamToUse
   * @param appendValue
   * @return {string}
   * @private
   */
  appendNameValueToUrl_CJ_(
      url, name, value, queryParamToUse, appendValue) {
    let inx3 = url.indexOf('dlg/');
    if (inx3 !== -1) {
      appendValue = queryParamToUse + '/' + appendValue + '/';
      return this.insertToString_(url, appendValue, inx3 + 4);
    } else if (url.indexOf('?') === -1) {
      //url does not have parameters. Add  ?sid=value
      return url + '?sid=' + appendValue;
    } else {
      //url already have parameters prefix by ?

      let inx11 = url.indexOf('?');
      let inx12 = url.indexOf('sid=', inx11 + 1);
      if (inx12 !== -1) {
        //url already have "sid=" parameter
        let inx13 = url.indexOf('&', inx12 + 4);
        if (inx13 === -1) {
          //sid=xyz at the end of url
          return url + this.getDelimiter_(url) + appendValue;
        } else {
          appendValue = this.getDelimiter_(url) + appendValue;
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
   * Append string is specified position.
   *
   * @param str
   * @param value
   * @param position
   * @return {string}
   * @private
   */
  insertToString_(str, value, position) {
    let str1, str2;

    str1 = str.substring(0, position);
    if (position < str.length) {
      str2 = str.substring(position);
    } else {
      str2 = '';
    }

    return str1 + value + str2;
  }

  /**
   * Parse query string
   * @param query
   * @return {Map}
   */
  parseQuery_(query) {
    let params = new Map();
    if (!query) {
      return params;
    }

    const pairs = query.split(/[;&]/);
    for (let i = 0; i < pairs.length; i++) {
      let KeyVal = pairs[i].split('=');
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
   * @param anchor
   * @param maxSize
   * @private
   */
  getAnchorLabel_(anchor, maxSize) {
    let labelEm = document.createElement('label');
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
   * @param str
   * @return {boolean} true if the str is empty
   * @private
   */
  isEmpty_(str) {
    return str == null || str === '';
  }

  /**
   * Check if url is absolute
   * @param url
   * @return {boolean}
   * @private
   */
  isAbsolute_(url) {
    return url.indexOf('http://') === 0 || url.indexOf('https://') === 0;
  }

  /**
   * Get the value as boolean type
   * @param val
   * @return {boolean}
   * @private
   */
  asBoolean_(val) {
    return val === 'true' || val === true;
  }

  /**
   * Combine random character, current time and random number to create
   * uuid
   *
   * @return {string}
   * @private
   */
  generateUUID_() {
    const d = Date.now();
    const r = Math.floor((Math.random() * 1000000) + 1);
    return `fr-${d}-${r}-fr`;
  }

  /**
   * Get object from the DOM given a path. For example if the path is
   * cg.ABC the finction return the instance at window.cg.ABC
   *
   * @param {String} path
   * @return {Object} object in path or null if not found
   */
  getObjectByPath_(path) {
    let parent = window;
    const arr = path.split('.');
    if (arr.length === 1) {
      return parent[arr[0]];
    } else {
      let obj = parent;
      for (let i = 0; i < arr.length; i++) {
        const token = arr[i];
        if (token === 'window') {
          continue;
        }

        obj = obj[token];
        if (obj == null && i < arr.length - 1) {
          return null;
        }
      }
      return obj;
    }
  }

  /**
   * Get delimiter to use for extended value params.
   *
   * @param url
   * @return {string}
   * @private
   */
  getDelimiter_(url) {
    if (url.includes('assoc-redirect.amazon')) {
      return this._delimiter2;
    } else {
      return this._delimiter1;
    }
  }

}

/*
* See https://developers.google.com/analytics/devguides/collection/analyticsjs/creating-trackers
* See https://developers.google.com/analytics/devguides/collection/analyticsjs/tracker-object-reference
*/
export class GATracker {

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
  trackEvent(eventCategory, eventAction, eventLabel, eventValue) {
    const em = document.getElementById('funnel-relay-link-clicked');
    if (em != null) {
      em.setAttribute('data-vars-category', eventCategory);
      em.setAttribute('data-vars-action', eventAction);
      em.setAttribute('data-vars-label', eventLabel);
      em.setAttribute('data-vars-value', eventValue);
      em.click();
    }
  }

  /**
   * Track page view
   *
   */
  trackPageView() {
    //not supported
  }

}

/**
 * Tracked to used with adobe Analytics
 * @type {AdobeTracker}
 * @see https://marketing.adobe.com/resources/help/en_US/sc/implement/function_tl.html
 */
export class AdobeTracker {

  constructor(code) {
    if (code != null && code.length > 0) {
      this._rsId = code;
    } else {
      this._rsId = null;
    }
  }

  /**
   * Track event
   *
   * @param eventCategory    text    yes    Typically the object that was
   *     interacted with (e.g. 'Video')
   * @param  eventAction    text    yes    The type of interaction (e.g.
   *     'play')
   * @param eventLabel    text    no    Useful for categorizing events
   *     (e.g. 'Fall Campaign')
   * @param eventValue    integer    no    A numeric value associated
   *     with the event (e.g. 42)
   * @param fieldsObject
   * @see https://developers.google.com/analytics/devguides/collection/analyticsjs/events
   */
  trackEvent(
      eventCategory, eventAction, eventLabel, eventValue, fieldsObject) {
    if (typeof s.tl == 'function') {
      let tracker = s;
      let rsId = this._rsId != null ? this._rsId : s_account;
      if (rsId != null) {
        tracker = s_gi(rsId);
      }

      tracker.linkTrackVars = 'prop1,prop2,prop3,prop4,prop5';
      tracker.prop1 = fieldsObject.xid;
      tracker.prop2 = fieldsObject.anchor.href;
      tracker.prop3 = fieldsObject.anchor.innerHTML;
      tracker.prop4 = document.referrer;
      tracker.prop5 = '';
      tracker.linkTrackEvents = 'funnel-relay';
      tracker.events = 'funnel-relay';
      let str = 'funnel-relay-' + fieldsObject.xid;
      tracker.tl(true, 'o', str, null);
    }
  }

  /**
   * Track screenview.
   *
   * @param screenName
   */
  trackScreenView(screenName) {
    //not supported
  }

  /**
   * Track page view
   *
   */
  trackPageView() {
    //not supported
  }
}

