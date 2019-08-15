// https://gist.github.com/ibreathebsb/a104a9297d5df4c8ae944a4ed149bcf1
var loader = require("../loader/index");
var pluginManager = require("../extension/index");
var fs = require("fs");
var loop = require("../lib/loop");
var multer = require("multer");
var express = require("express");
var app = express();
var AjvQuery = require("ajv");
var AjvBody = require("ajv");
var AjvParam = require("ajv");
var upload = multer(loader.multer);
var handleAction = require("./handleAction").handleAction;
const ajvBody = new AjvBody(loader.inputs.body_options);

const ajvQuery = new AjvQuery(loader.inputs.query_options);

/**
 * param akan khusus menggunakan coerceTypes yaitu mekanisme
 * untuk bisa mengubah struktur tipe  dalam pengecekan ajv
 * hal ini dilakukana karena param akan bernilai string semua
 */
const ajvParams = new AjvParam(loader.inputs.params_options);

loader.inputs.loadValidator(ajvBody, ajvQuery, ajvParams);

// async function loadPlugin(app) {
//   var dirs = fs.readdirSync("./plugins");
//   await loop(dirs, async dir => {
//     await global.Mukmin.registerBlade(
//       dir,
//       require("../../plugins/" + dir + "/index")
//     );

//     if (
//       Mukmin["_" + dir].onAppBeforeStart !== null &&
//       Mukmin["_" + dir].onAppBeforeStart !== undefined &&
//       typeof Mukmin["_" + dir].onAppBeforeStart === "function"
//     )
//       await Mukmin["_" + dir].onAppBeforeStart(app);
//   });
// }

module.exports.main = async function(arg) {
  await pluginManager.doOnWebBeforeLoad(Mukmin, arg, app);
  // await loadPlugin(app);
  var routers_key_array = Object.keys(loader.routers);
  await loop(routers_key_array, async routers_key => {
    var router_key_splited = routers_key.split(" ");
    var tmp = [];
    await loop(router_key_splited, async data => {
      if (data !== "") {
        tmp.push(data);
      }
    });
    router_key_splited = tmp;
    // console.log(" router key split " + JSON.stringify(router_key_splited));
    if (router_key_splited[0] === "GET") {
      app.get(router_key_splited[1], (req, res) => {
        handleAction(routers_key, req, res);
      });
    } else if (router_key_splited[0] === "POST") {
      var schema = require("../../app/controllers/" +
        loader.routers[routers_key].action +
        ".controller");
      if (
        schema.inputs.files !== undefined &&
        schema.inputs.files !== {} &&
        schema.inputs.files.properties !== undefined &&
        schema.inputs.files.properties !== {}
      ) {
        var uploadOptions = [];
        await loop(
          Object.keys(schema.inputs.files.properties),
          async fileNameKey => {
            let maxCount = 1;
            if (schema.inputs.files.properties[fileNameKey].type === "single") {
              maxCount = 1;
            } else if (
              schema.inputs.files.properties[fileNameKey].type === "array"
            ) {
              if (
                schema.inputs.files.properties[fileNameKey].maxCount ===
                  undefined ||
                schema.inputs.files.properties[fileNameKey].maxCount === null ||
                isNaN(schema.inputs.files.properties[fileNameKey].maxCount)
              ) {
                if (schema.onError !== undefined) {
                  return schema.onError(
                    inputs,
                    outputs,
                    "max count for array upload must set a number"
                  );
                } else {
                  return require("../../app/outputs/error/default")(
                    res,
                    {
                      code: 503,
                      message: "file upload problem"
                    },
                    "max count for array upload must set a number",
                    inputs,
                    outputs
                  );
                }
              }
              maxCount = schema.inputs.files.properties[fileNameKey].maxCount;
            } else {
              if (schema.onError !== undefined) {
                return schema.onError(
                  inputs,
                  outputs,
                  '"type of file just single and array no more"'
                );
              } else {
                return require("../../app/outputs/error/default")(
                  res,
                  {
                    code: 503,
                    message: "file upload problem"
                  },
                  "type of file just single and array no more",
                  inputs,
                  outputs
                );
              }
            }
            uploadOptions.push({
              name: fileNameKey,
              maxCount: maxCount
            });
          }
        );
        var cpUpload = upload.fields(uploadOptions);
        app.post(router_key_splited[1], cpUpload, (req, res) => {
          handleAction(routers_key, req, res);
        });
      } else {
        app.post(router_key_splited[1], (req, res) => {
          handleAction(routers_key, req, res);
        });
      }
    } else if (router_key_splited[0] === "PUT") {
      app.put(router_key_splited[1], (req, res) => {
        handleAction(routers_key, req, res);
      });
    }
  });
  console.log("\r\nRunning in port " + loader.http.port);
  app.use(function(err, req, res, next) {
    var inputs = {};
    inputs["req"] = req;
    inputs["body"] = req.body;
    inputs["query"] = req.query;
    inputs["params"] = req.params;
    var outputs = {};
    outputs["res"] = res;
    require("../../app/event/onError.event")(inputs, outputs, err);
  });
  app.listen(loader.http.port);
};
