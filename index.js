'use strict';

var stream = require('stream'),
    path = require('path'),
    compiler = require('ember-template-compiler');


// Default name function returns the template filename without extension.
var defaultProcessName = function (name) {
  var n = path.extname(name).length;
  return n === 0 ? name : name.slice(0, -n);
};


/**
 * @param {String} templateRoot Is the templates directory name (i.e., "templates").
 * @param {String} name Is the template name without any extensions.
 * @param {String} compiled Is the pre-compiled Ember.Handlebars template text.
 *
 * @returns {String} Returns a compiled Ember.Handlebars template text using an AMD-style module wrapper.
 */
function toAMD(templateRoot, name, compiled) {
  // 'define("<%= moduleName %>", function () { return Ember.TEMPLATES["<%= name %>"] = <%= compiled %> });'
  return 'define("'.concat(templateRoot, '/', name, '", function () { return Ember.TEMPLATES["', name, '"] = ', compiled, ' });');
}


/**
 * @param {String} namespace Is the name used in browser global assignment.
 * @param {String} name Is the template name without any extensions.
 * @param {String} compiled Is the pre-compiled Ember.Handlebars template text.
 *
 * @returns {String} Returns a compiled Ember.Handlebars template text for use directly in the browser.
 */
function toBrowser(namespace, name, compiled) {
  // '<%= namespace %>["<%= name %>"] = <%= compiled %>'
  return namespace.concat('["', name, '"] = ', compiled);
}


/**
 * @param {String} name Is the template name without any extensions.
 * @param {String} compiled Is the pre-compiled Ember.Handlebars template text.
 *
 * @returns {String} Returns a compiled Ember.Handlebars template text using an CommonJS-style module wrapper.
 */
function toCommonJS(name, compiled) {
  // 'module.exports = Ember.TEMPLATES["<%= name %>"] = <%= compiled %>'
  return 'module.exports = Ember.TEMPLATES["'.concat(name, '"] = ', compiled);
}


module.exports = function (options) {
  var outputType = options.outputType || 'browser', // amd, browser, cjs
      namespace = options.namespace || 'Ember.TEMPLATES',
      templateRoot = options.templateRoot || 'templates',
      processName = options.processName || defaultProcessName,
      compilerOptions = options.compilerOptions || {},
      ts = new stream.Transform({objectMode: true});

  ts._transform = function (file, encoding, callback) {
    // Get the name of the template
    var name = processName(file.relative);

    // Perform pre-compilation
    var compiled = compiler.precompile(file.contents.toString(), compilerOptions);

    // Surround the raw output as an Ember.Handlebars.template.
    compiled = 'Ember.Handlebars.template('.concat(compiled, ');');

    switch (outputType) {
    case 'amd':
      compiled = toAMD(templateRoot, name, compiled);
      break;
    case 'browser':
      compiled = toBrowser(namespace, name, compiled);
      break;
    case 'cjs':
      compiled = toCommonJS(name, compiled);
      break;
    default:
      callback(new Error('Invalid output type: ' + outputType));
    }

    file.path = path.join(path.dirname(file.path), path.basename(name) + '.js');
    file.contents = new Buffer(compiled);

    this.push(file);

    callback();
  };

  return ts;
};
