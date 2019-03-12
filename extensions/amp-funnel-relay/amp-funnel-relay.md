---
$category: ads-analytics
formats:
  - websites
teaser:
  text: Trackonomics' funnel-relay script for AMP.
---
<!--
Copyright 2019 The AMP HTML Authors. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS-IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
-->

# `amp-funnel-relay`

<table>
  <tr>
    <td width="40%"><strong>Description</strong></td>
    <td>Funnel relay is a tool for publishers in the affiliate market. The tool involve a script running on articles's pages, extends affiliate links wit extra information and track events used later for calculating various e-commerce measurments.   </td>
  </tr>
  <tr>
    <td width="40%"><strong>Availability</strong></td>
    <td>This tag should be used only by customers of Trackonomics LTD with access to funnel-relay feature.</td>
  </tr>
  <tr>
    <td width="40%"><strong>Required Script</strong></td>
    <td><code>&lt;script async custom-element="amp-funnel-relay" src="https://cdn.ampproject.org/v0/amp-funnel-relay-0.1.js">&lt;/script></code></td>
  </tr>
  <tr>
    <td class="col-fourty"><strong><a href="https://www.ampproject.org/docs/guides/responsive/control_layout.html">Supported Layouts</a></strong></td>
    <td>nodisplay</td>
  </tr>
  <tr>
    <td width="40%"><strong>Examples</strong></td>
    <td>
     <code>&lt;amp-funnel-relay src="https://magiclinks.trackonomics.net/client/static/ENVCODE.js" layout="nodisplay"&gt;&lt;/amp-funnel-relay&gt;</code>
     <p></p>
     <p>Replace 'ENVCODE' with your assigned environment code</p>
     <p></p>
     <code>&lt;amp-funnel-relay src="https://magiclinks.trackonomics.net/client/static/ENVCODE_PROFILE.js" layout="nodisplay"&gt;&lt;/amp-funnel-relay&gt;</code>
     <p></p>
     <p>Replace 'ENVCODE' with your assigned environment code and PROFILE with settings profile name</p>
    </td>
  </tr>
</table>

## Behavior

This extension creates &lt;script&gt; element on page's DOM and set the 'src' attribute of this script element with the value set for 'src' attribute of extension tag.
</p>
This will load and run the original funnel-relay script into article's page.     

## Attributes

<table>
  <tr>
    <td width="40%"><strong>src</strong></td>
    <td>
    The URL for running funnel-relay script on website. This is the same URL as you will use in tag-manager for non AMP pages.
     Example: https://magiclinks.trackonomics.net/client/static/abcd1234.js where 'abcd1234' represent customer's code
     </td>
  </tr>
</table>

## Validation
See [amp-funnel-relay rules](https://github.com/ampproject/amphtml/blob/master/extensions/amp-funnel-relay/validator-amp-funnel-relay.protoascii) in the AMP validator specification.
