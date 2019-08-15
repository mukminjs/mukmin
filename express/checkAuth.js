var loop = require("../lib/loop");
// var loader = require("../loader/index");
var router = Mukmin.getConfig("routers");
module.exports.checkAuth = async function(routers_key, req, res) {
  if (
    router[routers_key].policies !== undefined &&
    router[routers_key].policies.length > 0
  ) {
    var me = await require(Mukmin.getPath("app/event/onAuth.event"))(
      req.session
    );
    req["me"] = me;
    // do authenticate
    var isAuthenticate = false;
    await loop(router[routers_key].policies, async police => {
      isAuthenticate = await require(Mukmin.getPath("app/polices/" + police))(
        me
      );
    });
    if (isAuthenticate === false) {
      return {
        success: false,
        message:
          "Not got authenticate for your police " + router[routers_key].policies
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
