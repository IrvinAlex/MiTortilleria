
  cordova.define('cordova/plugin_list', function(require, exports, module) {
    module.exports = [
      {
          "id": "cordova-plugin-geolocation.Coordinates",
          "file": "plugins/cordova-plugin-geolocation/www/Coordinates.js",
          "pluginId": "cordova-plugin-geolocation",
        "clobbers": [
          "Coordinates"
        ]
        },
      {
          "id": "cordova-plugin-geolocation.geolocation",
          "file": "plugins/cordova-plugin-geolocation/www/geolocation.js",
          "pluginId": "cordova-plugin-geolocation",
        "clobbers": [
          "navigator.geolocation"
        ]
        },
      {
          "id": "cordova-plugin-geolocation.Position",
          "file": "plugins/cordova-plugin-geolocation/www/Position.js",
          "pluginId": "cordova-plugin-geolocation",
        "clobbers": [
          "Position"
        ]
        },
      {
          "id": "cordova-plugin-geolocation.PositionError",
          "file": "plugins/cordova-plugin-geolocation/www/PositionError.js",
          "pluginId": "cordova-plugin-geolocation",
        "clobbers": [
          "PositionError"
        ]
        },
      {
          "id": "cordova-plugin-googleplus.GooglePlus",
          "file": "plugins/cordova-plugin-googleplus/www/GooglePlus.js",
          "pluginId": "cordova-plugin-googleplus",
        "clobbers": [
          "window.plugins.googleplus"
        ]
        }
    ];
    module.exports.metadata =
    // TOP OF METADATA
    {
      "cordova-plugin-geolocation": "5.0.0",
      "cordova-plugin-googleplus": "8.5.2"
    };
    // BOTTOM OF METADATA
    });
    