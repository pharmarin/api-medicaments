const system = require('./../system')
const medicaments = require('./../medicaments')

exports.configure = function (app, options) {
  app.use('/', system(options));
  app.use('/medicaments', medicaments(options));

};
