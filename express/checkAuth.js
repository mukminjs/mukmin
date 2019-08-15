var loop = require("../lib/loop");
var loader = require("../loader/index");
module.exports.checkAuth = async function(routers_key, req, res) {
  if (
    loader.routers[routers_key].policies !== undefined &&
    loader.routers[routers_key].policies.length > 0
  ) {
    var me = await require("../../app/event/onAuth.event")(req.session);
    req["me"] = me;
    // do authenticate
    var isAuthenticate = false;
    await loop(loader.routers[routers_key].policies, async police => {
      isAuthenticate = await require("../../app/polices/" + police)(me);
    });
    if (isAuthenticate === false) {
      return {
        success: false,
        message:
          "Not got authenticate for your police " +
          loader.routers[routers_key].policies
      };
    } else {
      return {
        success: true,
        message: null
      };
    }
  } else {
    return {
      success: true,
      message: null
    };
  }
};
